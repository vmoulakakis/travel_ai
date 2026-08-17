"use client";

import { FormEvent,useMemo,useState } from "react";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";

type Lang="el"|"en";
type StreamRow={type:string;progress:number;message?:string;payload?:Record<string,unknown>};
const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;

function groupSize(type:string){return type==="solo"?1:type==="couple"?2:4}

export function V31AiPlannerClient({lang="el"}:{lang?:Lang}){
 const[rows,setRows]=useState<StreamRow[]>([]),[result,setResult]=useState<V8RecommendationResponse|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const progress=useMemo(()=>rows.at(-1)?.progress??0,[rows]);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setRows([]);setResult(null);setError(null);
  const form=new FormData(event.currentTarget),travelerType=String(form.get("travelerType")||"couple");
  const payload={
   origin:String(form.get("origin")||"Athens"),consideredDestination:String(form.get("consideredDestination")||"").trim(),month:String(form.get("month")||"september"),nights:Number(form.get("nights")||4),budget:Number(form.get("budget")||1200),travelerType,groupSize:groupSize(travelerType),moods:[String(form.get("moods")||"relax")],tripText:String(form.get("tripText")||"").trim(),language:lang,distancePreference:"any",pace:"balanced",hotelStyle:"any",avoid:"none",entryMode:"idea",desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"few-days",transportMode:"any",stayLocationPreference:"balanced"
  };
  try{
   const response=await fetch("/api/recommend/stream",{method:"POST",headers:{"content-type":"application/json",accept:"application/x-ndjson"},body:JSON.stringify(payload)});
   if(!response.ok){const body=await response.json().catch(()=>null) as {message?:string}|null;throw new Error(body?.message||`HTTP ${response.status}`)}
   const reader=response.body?.getReader();if(!reader)throw new Error("stream unavailable");
   const decoder=new TextDecoder();let buffer="";
   while(true){
    const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";
    for(const line of lines){if(!line.trim())continue;const item=JSON.parse(line) as StreamRow&{result?:V8RecommendationResponse};if(item.type==="final"&&item.result)setResult(item.result);else setRows(current=>[...current,item]);}
   }
  }catch(err){setError(err instanceof Error?err.message:say(lang,"Ο AI σύμβουλος δεν είναι προσωρινά διαθέσιμος.","The AI planner is temporarily unavailable."));}
  finally{setBusy(false)}
 }

 const winner=result?.recommendations[0]??null;
 return <div className="wf-planner-grid">
  <form className="wf-card wf-planner-form" onSubmit={submit}>
   <label><strong>{say(lang,"Από πού ξεκινάς;","Where are you starting from?")}</strong><input name="origin" defaultValue="Athens" required/></label>
   <label><strong>{say(lang,"Έχεις προορισμό στο μυαλό σου;","Do you have a destination in mind?")}</strong><input name="consideredDestination" placeholder={say(lang,"π.χ. Νάξος — κενό για discovery","e.g. Naxos — leave blank for discovery")}/></label>
   <label><strong>{say(lang,"Πότε;","When?")}</strong><select name="month" defaultValue="september"><option value="september">{say(lang,"Σεπτέμβριος","September")}</option><option value="october">{say(lang,"Οκτώβριος","October")}</option><option value="november">{say(lang,"Νοέμβριος","November")}</option><option value="flexible">{say(lang,"Ευέλικτα","Flexible")}</option></select></label>
   <div className="wf-form-two"><label><strong>{say(lang,"Νύχτες","Nights")}</strong><input name="nights" type="number" min="1" max="14" defaultValue="4"/></label><label><strong>Budget €</strong><input name="budget" type="number" min="150" max="5000" defaultValue="1200"/></label></div>
   <label><strong>{say(lang,"Παρέα","Travellers")}</strong><select name="travelerType" defaultValue="couple"><option value="couple">{say(lang,"Ζευγάρι","Couple")}</option><option value="family">{say(lang,"Οικογένεια","Family")}</option><option value="friends">{say(lang,"Φίλοι","Friends")}</option><option value="solo">Solo</option></select></label>
   <label><strong>{say(lang,"Τι μετρά περισσότερο;","What matters most?")}</strong><select name="moods" defaultValue="relax"><option value="relax">{say(lang,"Χαλάρωση","Relax")}</option><option value="romantic">{say(lang,"Ρομαντικό","Romantic")}</option><option value="food">{say(lang,"Φαγητό","Food")}</option><option value="nature">{say(lang,"Φύση","Nature")}</option><option value="culture">{say(lang,"Πολιτισμός","Culture")}</option><option value="city">{say(lang,"Πόλη","City")}</option><option value="adventure">{say(lang,"Περιπέτεια","Adventure")}</option><option value="warmth">{say(lang,"Ζέστη","Warmth")}</option></select></label>
   <label><strong>{say(lang,"Πες το όπως θα το έλεγες σε άνθρωπο","Describe it naturally")}</strong><textarea name="tripText" maxLength={320} placeholder={say(lang,"Θέλω παραλία αλλά όχι χαμό, να τρώμε καλά και να μην τρέχουμε όλη μέρα…","I want a beach but not crowds, good food and a relaxed pace…")}/></label>
   <button className="wf-btn wf-btn--primary" type="submit" disabled={busy}>{busy?say(lang,"Αναλύω…","Analysing…"):say(lang,"Ανάλυσε το ταξίδι μου →","Analyse my trip →")}</button>
  </form>

  <section className="wf-planner-results" aria-live="polite">
   <div className="wf-card wf-card--dark wf-planner-council"><span className="wf-kicker wf-kicker--light">LIVE AI COUNCIL</span><h2 className="wf-h3">{say(lang,"Η απόφαση χτίζεται μπροστά σου.","The decision is built in front of you.")}</h2><p className="wf-body wf-footer-copy">{say(lang,"Location truth → intent → catalog → season/route → evidence → audit → τελική πρόταση.","Location truth → intent → catalog → season/route → evidence → audit → final recommendation.")}</p><div className="wf-progress"><span style={{width:`${Math.min(100,progress)}%`}}/></div></div>
   {error&&<div className="wf-card wf-error-card"><strong>{say(lang,"Δεν ολοκληρώθηκε η ανάλυση","Analysis did not complete")}</strong><p className="wf-body">{error}</p></div>}
   {!result&&rows.map((row,index)=><div className="wf-card wf-stream-row" key={`${row.type}-${index}`}><span>{String(row.progress).padStart(2,"0")}%</span><div><strong>{row.type.replaceAll(":"," · ")}</strong><p className="wf-body">{row.message||String(row.payload?.message||row.payload?.summary||say(lang,"Ο agent ολοκλήρωσε αυτό το στάδιο.","The agent completed this stage."))}</p></div></div>)}
   {result&&<div className="wf-final-results"><div className="wf-result-summary"><span className="wf-kicker">{say(lang,"ΤΕΛΙΚΗ ΑΠΟΦΑΣΗ","FINAL DECISION")}</span><h2 className="wf-h2">{winner?(lang==="en"?winner.destinationEn:winner.destination):say(lang,"Η καλύτερη διαθέσιμη επιλογή","Best available choice")}</h2><p className="wf-lead">{result.profileSummary}</p><div className="wf-result-meta"><span>{result.feasibility}</span><span>{result.eligibleCount??result.resultCount} {say(lang,"επιλέξιμοι","eligible")}</span><span>{result.council?.agreement??"AUDITED"}</span></div></div>
    <div className="wf-recommendation-grid">{result.recommendations.slice(0,6).map((item,index)=><article className={`wf-card wf-rec-card ${index===0?"wf-rec-card--winner":""}`} key={item.slug}><div className="wf-rec-head"><span>#{index+1}</span><strong>{item.score}/100</strong></div><h3 className="wf-h3">{lang==="en"?item.destinationEn:item.destination}</h3><p className="wf-body">{item.why}</p><div className="wf-rec-facts"><span>{item.seasonNote}</span><span>{item.effortLabel}</span><span>{item.budgetLabel}</span></div><div className="wf-chip-row">{item.tags.slice(0,4).map(tag=><span className="wf-chip" key={tag}>{tag}</span>)}</div><a className="wf-btn wf-btn--secondary" href={`${lang==="en"?"/en/destinations":"/proorismoi"}/${item.slug}`}>{say(lang,"Δες τον προορισμό","View destination")}</a></article>)}</div>
   </div>}
  </section>
 </div>
}
