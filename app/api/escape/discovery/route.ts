import { NextResponse } from "next/server";
import { z } from "zod";
import { createLLMRequestBudgetV16, generateJsonWithRoutingV16 } from "@/lib/ai/model-router-v9";

const QuestionId=z.enum(["companions","outcome","social","novelty","must_have","friction"]);
const AnswerSchema=z.object({questionId:QuestionId,value:z.string().trim().min(1).max(80)});
const InputSchema=z.object({locale:z.enum(["el","en"]).default("el"),initialText:z.string().trim().min(3).max(700),answers:z.array(AnswerSchema).max(6).default([])});

type QuestionId=z.infer<typeof QuestionId>;
type Profile={travelerType:"solo"|"couple"|"family"|"friends";moods:Array<"relax"|"romantic"|"food"|"warmth"|"city"|"nature"|"adventure"|"culture">;pace:"slow"|"balanced"|"full";desiredEnergy:"restore"|"balanced"|"stimulating";socialPreference:"quiet"|"balanced"|"lively";noveltyPreference:"familiar"|"balanced"|"surprise";avoid:"long-travel"|"high-cost"|"crowds"|"none";mustHave:"sea"|"nature"|"culture"|"nightlife"|"none";dnaLabels:string[]};

type Parsed={summary:string;profile:Profile;answered:QuestionId[];nextQuestionId:QuestionId|null;confidence:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const has=(s:string,r:RegExp)=>r.test(s.toLowerCase());
const moodsAllowed=new Set(ProfileShape.moods);

const ProfileShape={
 moods:["relax","romantic","food","warmth","city","nature","adventure","culture"] as const,
 traveler:["solo","couple","family","friends"] as const,
 pace:["slow","balanced","full"] as const,
 energy:["restore","balanced","stimulating"] as const,
 social:["quiet","balanced","lively"] as const,
 novelty:["familiar","balanced","surprise"] as const,
 avoid:["long-travel","high-cost","crowds","none"] as const,
 must:["sea","nature","culture","nightlife","none"] as const
};

function deterministic(locale:"el"|"en",initialText:string,answers:Array<{questionId:QuestionId;value:string}>):Parsed{
 const text=[initialText,...answers.map(a=>a.value)].join(" ").toLowerCase();
 const map=new Map(answers.map(a=>[a.questionId,a.value]));
 const travelerType:Profile["travelerType"]=has(text,/(παιδ|kids|children|family|οικογεν)/)?"family":has(text,/(γυναικ|αντρα|συντροφ|wife|husband|partner|couple|ζευγ)/)?"couple":has(text,/(φιλ|friends|παρεα)/)?"friends":has(text,/(μονος|μόνος|solo|alone)/)?"solo":"couple";
 const moods:Profile["moods"]=[];
 const addMood=(m:Profile["moods"][number],r:RegExp)=>{if(has(text,r)&&!moods.includes(m))moods.push(m)};
 addMood("relax",/(ηρεμ|ξεκουρ|κουρασ|relax|rest|switch off|quiet|reset)/);addMood("romantic",/(ρομαν|μαζι|μαζί|anniversary|romantic|partner|couple)/);addMood("food",/(φαγη|εστιατορ|food|restaurant|gastr)/);addMood("warmth",/(ηλιο|ζεστ|sun|warm)/);addMood("nature",/(φυση|βουν|nature|mountain|green)/);addMood("culture",/(πολιτισ|μουσει|history|culture|museum)/);addMood("adventure",/(περιπετ|adventure|different|διαφορετ)/);addMood("city",/(πολη|city|urban)/);
 if(!moods.length)moods.push("relax");
 const outcome=map.get("outcome")||"";
 const desiredEnergy:Profile["desiredEnergy"]=/(stimulat|ζωνταν|ενεργ|adventure)/i.test(outcome+text)?"stimulating":/(rest|ηρεμ|reset|ξεκουρ|κουρασ)/i.test(outcome+text)?"restore":"balanced";
 const socialRaw=map.get("social")||"";const socialPreference:Profile["socialPreference"]=/(quiet|ήσυχ|ησυχ)/i.test(socialRaw+text)?"quiet":/(lively|ζωνταν|nightlife|κοσμο|κόσμο)/i.test(socialRaw+text)?"lively":"balanced";
 const noveltyRaw=map.get("novelty")||"";const noveltyPreference:Profile["noveltyPreference"]=/(surprise|έκπλη|εκπλη|different|διαφορετ)/i.test(noveltyRaw+text)?"surprise":/(familiar|σίγουρ|σιγουρ|γνωστ)/i.test(noveltyRaw+text)?"familiar":"balanced";
 const mustRaw=map.get("must_have")||"";const mustHave:Profile["mustHave"]=/(sea|θαλασσ|beach)/i.test(mustRaw+text)?"sea":/(nature|φυση|βουν)/i.test(mustRaw+text)?"nature":/(culture|history|μουσει|πολιτισ)/i.test(mustRaw+text)?"culture":/(night|club|nightlife)/i.test(mustRaw+text)?"nightlife":"none";
 const frictionRaw=map.get("friction")||"";const avoid:Profile["avoid"]=/(short|easy|λιγη ταλαιπωρ|λίγη ταλαιπωρ|no long|κουραστικ)/i.test(frictionRaw+text)?"long-travel":/(cheap|budget|οικονομ)/i.test(frictionRaw+text)?"high-cost":/(crowd|κοσμο|κόσμο|τουριστ)/i.test(frictionRaw+text)?"crowds":"none";
 const pace:Profile["pace"]=desiredEnergy==="restore"?"slow":desiredEnergy==="stimulating"?"full":"balanced";
 const answered=new Set<QuestionId>(answers.map(a=>a.questionId));
 if(/παιδ|kids|children|wife|husband|partner|couple|ζευγ|friends|φιλ|solo|μονος|μόνος/i.test(initialText))answered.add("companions");
 if(/κουρασ|ηρεμ|relax|rest|switch off|adventure|περιπετ|ζωνταν/i.test(initialText))answered.add("outcome");
 const order:QuestionId[]=["companions","outcome","social","novelty","must_have","friction"];
 const next=order.find(q=>!answered.has(q))??null;
 const labels=[desiredEnergy==="restore"?(locale==="el"?"Αποφόρτιση":"Reset"):(locale==="el"?"Ενέργεια":"Energy"),socialPreference==="quiet"?(locale==="el"?"Ήσυχος ρυθμός":"Quiet rhythm"):(locale==="el"?"Ζωντανή ατμόσφαιρα":"Lively atmosphere"),noveltyPreference==="surprise"?(locale==="el"?"Κάτι διαφορετικό":"Something different"):(locale==="el"?"Ισορροπημένη ανακάλυψη":"Balanced discovery"),avoid==="long-travel"?(locale==="el"?"Χαμηλή ταλαιπωρία":"Low friction"):(locale==="el"?"Ευελιξία":"Flexible"),...(moods.slice(0,2).map(m=>m==="food"?(locale==="el"?"Καλό φαγητό":"Food-led"):m==="romantic"?(locale==="el"?"Χρόνος μαζί":"Time together"):m==="nature"?(locale==="el"?"Φύση":"Nature"):m==="warmth"?(locale==="el"?"Ήλιος":"Sun"):m==="culture"?(locale==="el"?"Πολιτισμός":"Culture"):(locale==="el"?"Ανάσα":"Escape")))] ;
 const summary=locale==="el"?`Αυτό που ψάχνεις μοιάζει περισσότερο με ${desiredEnergy==="restore"?"ένα πραγματικό reset":"μια απόδραση με ουσία"}${socialPreference==="quiet"?", σε ήρεμο ρυθμό":""}${avoid==="long-travel"?", χωρίς περιττή ταλαιπωρία":""}.`:`What you need feels more like ${desiredEnergy==="restore"?"a real reset":"a meaningful escape"}${socialPreference==="quiet"?", at a calmer pace":""}${avoid==="long-travel"?", without unnecessary travel friction":""}.`;
 return{summary,profile:{travelerType,moods:moods.slice(0,3),pace,desiredEnergy,socialPreference,noveltyPreference,avoid,mustHave,dnaLabels:[...new Set(labels)].slice(0,6)},answered:[...answered],nextQuestionId:next,confidence:next?0.68:0.82};
}

function validateModel(raw:Record<string,unknown>,fallback:Parsed):Parsed|null{
 const p=raw.profile;if(!p||typeof p!=="object"||Array.isArray(p))return null;const x=p as Record<string,unknown>;
 const travelerType=ProfileShape.traveler.includes(x.travelerType as never)?x.travelerType as Profile["travelerType"]:fallback.profile.travelerType;
 const moods=Array.isArray(x.moods)?x.moods.filter((m):m is Profile["moods"][number]=>typeof m==="string"&&moodsAllowed.has(m as never)).slice(0,3):fallback.profile.moods;
 const pace=ProfileShape.pace.includes(x.pace as never)?x.pace as Profile["pace"]:fallback.profile.pace;
 const desiredEnergy=ProfileShape.energy.includes(x.desiredEnergy as never)?x.desiredEnergy as Profile["desiredEnergy"]:fallback.profile.desiredEnergy;
 const socialPreference=ProfileShape.social.includes(x.socialPreference as never)?x.socialPreference as Profile["socialPreference"]:fallback.profile.socialPreference;
 const noveltyPreference=ProfileShape.novelty.includes(x.noveltyPreference as never)?x.noveltyPreference as Profile["noveltyPreference"]:fallback.profile.noveltyPreference;
 const avoid=ProfileShape.avoid.includes(x.avoid as never)?x.avoid as Profile["avoid"]:fallback.profile.avoid;
 const mustHave=ProfileShape.must.includes(x.mustHave as never)?x.mustHave as Profile["mustHave"]:fallback.profile.mustHave;
 const dnaLabels=Array.isArray(x.dnaLabels)?x.dnaLabels.filter((v):v is string=>typeof v==="string"&&v.trim().length>0).map(v=>v.trim().slice(0,40)).slice(0,6):fallback.profile.dnaLabels;
 const answered=Array.isArray(raw.answered)?raw.answered.filter((v):v is QuestionId=>QuestionId.options.includes(v as QuestionId)).slice(0,6):fallback.answered;
 const nextRaw=raw.nextQuestionId;const nextQuestionId=nextRaw===null?null:QuestionId.options.includes(nextRaw as QuestionId)?nextRaw as QuestionId:fallback.nextQuestionId;
 const summary=typeof raw.summary==="string"&&raw.summary.trim()?raw.summary.trim().slice(0,260):fallback.summary;const confidence=Number(raw.confidence);
 return{summary,profile:{travelerType,moods:moods.length?moods:fallback.profile.moods,pace,desiredEnergy,socialPreference,noveltyPreference,avoid,mustHave,dnaLabels},answered,nextQuestionId,confidence:Number.isFinite(confidence)?clamp(confidence):fallback.confidence};
}

export async function POST(request:Request){
 const parsed=InputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_discovery"},{status:400});
 const {locale,initialText,answers}=parsed.data,fallback=deterministic(locale,initialText,answers),budget=createLLMRequestBudgetV16();
 const system=`You are the Traveler Understanding Agent for an AI travel decision system. Infer only travel-decision preferences, never clinical psychology or sensitive traits. Your job is to understand what the traveller needs emotionally and practically BEFORE destinations and dates. Choose the single next question with the highest expected information gain from this fixed list: companions,outcome,social,novelty,must_have,friction. Do not ask something already answered explicitly. After 4 useful answers, prefer completing unless a missing axis could materially change destination choice. Return JSON only: {"summary":"warm human summary max 260 chars","profile":{"travelerType":"solo|couple|family|friends","moods":["relax|romantic|food|warmth|city|nature|adventure|culture"],"pace":"slow|balanced|full","desiredEnergy":"restore|balanced|stimulating","socialPreference":"quiet|balanced|lively","noveltyPreference":"familiar|balanced|surprise","avoid":"long-travel|high-cost|crowds|none","mustHave":"sea|nature|culture|nightlife|none","dnaLabels":["short human label"]},"answered":["question ids"],"nextQuestionId":"one allowed id or null","confidence":0..1}. Write summary and dnaLabels in ${locale==="el"?"Greek":"English"}. Do not recommend a destination.`;
 const prompt=JSON.stringify({initialText,answers,fallbackProfile:fallback.profile});
 const routed=await generateJsonWithRoutingV16<Parsed>({context:{task:"intent",text:initialText,deterministicConfidence:fallback.confidence,forceSemantic:true},budget,system,prompt,preference:"critical",validate:raw=>validateModel(raw,fallback)});
 const result=routed?.value??fallback;return NextResponse.json({ok:true,...result,complete:result.nextQuestionId===null||result.answered.length>=4});
}
