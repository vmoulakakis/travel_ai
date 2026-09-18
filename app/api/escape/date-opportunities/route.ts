import { NextResponse } from "next/server";
import { z } from "zod";
import { createLLMRequestBudgetV16, generateJsonWithRoutingV16 } from "@/lib/ai/model-router-v9";

const InputSchema=z.object({
 locale:z.enum(["el","en"]).default("el"),
 initialText:z.string().trim().max(700).default(""),
 duration:z.number().int().min(2).max(10).default(3),
 horizonDays:z.number().int().min(21).max(180).default(90),
 profile:z.object({
  travelerType:z.enum(["solo","couple","family","friends","unknown"]),
  desiredEnergy:z.enum(["restore","balanced","stimulating"]),
  socialPreference:z.enum(["quiet","balanced","lively"]),
  noveltyPreference:z.enum(["familiar","balanced","surprise"]),
  avoid:z.enum(["long-travel","high-cost","crowds","none"]),
  moods:z.array(z.string()).max(4).default([])
 })
});

type Input=z.infer<typeof InputSchema>;
type Window={id:string;label:string;note:string;start:string;end:string;reason:string;confidence:"HIGH"|"MEDIUM"};

const DAY=86_400_000;
const iso=(d:Date)=>d.toISOString().slice(0,10);
const add=(d:Date,days:number)=>new Date(d.getTime()+days*DAY);
const startOfUtcDay=(d:Date)=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
function nextWeekday(base:Date,weekday:number,weekOffset=0){const d=startOfUtcDay(base);const delta=(weekday-d.getUTCDay()+7)%7||7;return add(d,delta+weekOffset*7)}

function fallback(input:Input):Window[]{
 const now=startOfUtcDay(new Date());
 const {locale,duration,profile}=input;
 const say=(el:string,en:string)=>locale==="el"?el:en;
 const friday=nextWeekday(now,5,0);
 const fridayLater=nextWeekday(now,5,2);
 const quietStart=nextWeekday(now,0,profile.avoid==="crowds"||profile.socialPreference==="quiet"?1:2);
 const energetic=profile.desiredEnergy==="stimulating"||profile.socialPreference==="lively";
 return [
  {id:"easy",label:say("Η εύκολη απόδραση","The easy escape"),note:say("Παρασκευή αναχώρηση · μικρή απαίτηση σε άδεια","Friday departure · minimal leave"),start:iso(friday),end:iso(add(friday,duration)),reason:say("Κρατά χαμηλή την οργανωτική τριβή και σε βάζει γρήγορα σε ρυθμό απόδρασης.","Keeps planning friction low and gets the escape started quickly."),confidence:"MEDIUM"},
  {id:"better-space",label:say(energetic?"Το weekend με περισσότερες επιλογές":"Το weekend με περισσότερο χώρο",energetic?"The weekend with more options":"The weekend with more room"),note:say("Λίγο αργότερα · περισσότερο περιθώριο για σωστό matching","A little later · more room for a stronger match"),start:iso(fridayLater),end:iso(add(fridayLater,duration)),reason:say("Δίνει στο σύστημα μεγαλύτερο χώρο επιλογών χωρίς να απομακρύνεται πολύ χρονικά.","Gives the system a wider option space without pushing the trip too far out."),confidence:"MEDIUM"},
  {id:"quiet",label:say("Η ήσυχη εκδοχή","The quieter version"),note:say("Κυριακή έως μέσα εβδομάδας · λιγότερη weekend πίεση","Sunday into midweek · less weekend pressure"),start:iso(quietStart),end:iso(add(quietStart,duration)),reason:say(profile.socialPreference==="quiet"||profile.avoid==="crowds"?"Ταιριάζει καλύτερα στην ανάγκη σου για χώρο, χαμηλότερο θόρυβο και λιγότερο συνωστισμό.":"Προσφέρει διαφορετικό ρυθμό και συχνά πιο ήρεμη εμπειρία από ένα κλασικό weekend.",profile.socialPreference==="quiet"||profile.avoid==="crowds"?"Better aligned with your need for space, lower noise and fewer crowds.":"Offers a different rhythm and often a calmer experience than a classic weekend."),confidence:"MEDIUM"}
 ];
}

function validWindow(value:unknown,input:Input):Window|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const row=value as Record<string,unknown>;
 const start=typeof row.start==="string"?row.start:"",end=typeof row.end==="string"?row.end:"";
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return null;
 const startMs=Date.parse(`${start}T00:00:00Z`),endMs=Date.parse(`${end}T00:00:00Z`),today=startOfUtcDay(new Date()).getTime();
 if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||startMs<=today||endMs<=startMs)return null;
 const nights=Math.round((endMs-startMs)/DAY);if(nights!==input.duration)return null;
 if(startMs>today+input.horizonDays*DAY)return null;
 const confidence=row.confidence==="HIGH"?"HIGH":"MEDIUM";
 const clean=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
 const label=clean(row.label,80),note=clean(row.note,140),reason=clean(row.reason,260);if(!label||!reason)return null;
 return{id:clean(row.id,40)||`window-${start}`,label,note,start,end,reason,confidence};
}

export async function POST(request:Request){
 const parsed=InputSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_date_opportunity_request"},{status:400});
 const input=parsed.data,backup=fallback(input),today=iso(startOfUtcDay(new Date()));
 const budget=createLLMRequestBudgetV16();
 const system=`You are the Date Opportunity Agent for an AI travel decision system. The traveller has not chosen a destination yet. Suggest exactly 3 useful candidate travel windows based only on their travel-decision profile, duration, current date and flexibility. Do NOT claim that a window has cheaper prices, better weather, lower crowds, events, flight availability or hotel availability because those are verified only after destination matching. You may explain calendar convenience, rhythm, planning space and the traveller's stated preference for quiet/energy/familiarity. Windows must start after today, end exactly duration nights later and fall within the horizon. Return JSON only: {"windows":[{"id":"short-id","label":"...","note":"...","start":"YYYY-MM-DD","end":"YYYY-MM-DD","reason":"...","confidence":"MEDIUM"}]}. Write user-facing text in ${input.locale==="el"?"Greek":"English"}.`;
 const routed=await generateJsonWithRoutingV16<{windows:Window[]}>({
  context:{task:"intent",text:input.initialText||input.profile.moods.join(" "),deterministicConfidence:.72,forceSemantic:true},
  budget,
  system,
  prompt:JSON.stringify({today,duration:input.duration,horizonDays:input.horizonDays,profile:input.profile,need:input.initialText}),
  preference:"critical",
  validate:raw=>{const rows=Array.isArray((raw as {windows?:unknown[]})?.windows)?(raw as {windows:unknown[]}).windows:[];const windows=rows.map(row=>validWindow(row,input)).filter((x):x is Window=>Boolean(x));return windows.length===3?{windows}:null}
 });
 const windows=routed?.value?.windows?.length===3?routed.value.windows:backup;
 return NextResponse.json({ok:true,today,duration:input.duration,windows,verificationNote:input.locale==="el"?"Οι ημερομηνίες είναι υποψήφια παράθυρα. Καιρός, τιμές, πρόσβαση και διαθεσιμότητα επανελέγχονται αφού επιλέξουμε προορισμό.":"These are candidate windows. Weather, pricing, access and availability are rechecked after destination matching."});
}
