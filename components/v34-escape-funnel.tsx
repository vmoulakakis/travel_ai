"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { V8Recommendation, V8RecommendationResponse } from "@/lib/decision/v8-types";
import styles from "./v34-escape-funnel.module.css";

type Lang="el"|"en";
type QuestionId="companions"|"outcome"|"social"|"novelty"|"must_have"|"friction";
type Answer={questionId:QuestionId;value:string};
type Profile={
 travelerType:"solo"|"couple"|"family"|"friends";
 moods:Array<"relax"|"romantic"|"food"|"warmth"|"city"|"nature"|"adventure"|"culture">;
 pace:"slow"|"balanced"|"full";
 desiredEnergy:"restore"|"balanced"|"stimulating";
 socialPreference:"quiet"|"balanced"|"lively";
 noveltyPreference:"familiar"|"balanced"|"surprise";
 avoid:"long-travel"|"high-cost"|"crowds"|"none";
 mustHave:"sea"|"nature"|"culture"|"nightlife"|"none";
 dnaLabels:string[];
};
type Discovery={summary:string;profile:Profile;answered:QuestionId[];nextQuestionId:QuestionId|null;confidence:number;complete:boolean};
type DateWindow={id:string;label:string;note:string;start:string;end:string;reason?:string;confidence?:"HIGH"|"MEDIUM"};
type StreamRow={type:string;progress?:number;message?:string};
type Media={imageUrl:string;originalUrl?:string;sourceUrl:string;title:string;description?:string;license:string;attribution:string};
type VisualWorld={id:string;query:string;el:string;en:string;hintEl:string;hintEn:string;semanticEl:string;semanticEn:string};

const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;
const DAY=86_400_000;
const iso=(d:Date)=>d.toISOString().slice(0,10);
const add=(d:Date,days:number)=>new Date(d.getTime()+days*DAY);
function nextWeekday(base:Date,weekday:number,weekOffset=0){const d=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate()));const delta=(weekday-d.getUTCDay()+7)%7||7;return add(d,delta+weekOffset*7)}
function groupSize(type:Profile["travelerType"]){return type==="solo"?1:type==="couple"?2:4}

const VISUAL_WORLDS:VisualWorld[]=[
 {id:"sea-light",query:"Mediterranean coast sunset",el:"Θάλασσα & φως",en:"Sea & light",hintEl:"Ορίζοντας, αλμύρα, αργές ώρες.",hintEn:"Horizon, salt air, slower hours.",semanticEl:"Με τραβάει η θάλασσα, το φως και ένας αργός μεσογειακός ρυθμός.",semanticEn:"I am drawn to sea, light and a slower Mediterranean rhythm."},
 {id:"old-town",query:"European old town evening",el:"Παλιά πόλη & βράδυ",en:"Old town & evenings",hintEl:"Βόλτες, φαγητό, ατμόσφαιρα.",hintEn:"Walking, food, atmosphere.",semanticEl:"Θέλω ατμοσφαιρική παλιά πόλη, βόλτες και καλό φαγητό το βράδυ.",semanticEn:"I want an atmospheric old town, evening walks and great food."},
 {id:"green-reset",query:"Madeira green mountains landscape",el:"Πράσινο & reset",en:"Green & reset",hintEl:"Φύση, καθαρό μυαλό, ανάσα.",hintEn:"Nature, clear head, breathing room.",semanticEl:"Θέλω πράσινο, φύση και πραγματική αποφόρτιση μακριά από θόρυβο.",semanticEn:"I want greenery, nature and a proper reset away from noise."},
 {id:"mountain-warmth",query:"European mountain village winter",el:"Βουνό & θαλπωρή",en:"Mountains & warmth",hintEl:"Ξύλο, τοπίο, ησυχία.",hintEn:"Texture, landscape, quiet.",semanticEl:"Με ελκύει βουνό, θαλπωρή, ωραίο τοπίο και ήρεμες μέρες.",semanticEn:"I am drawn to mountains, warmth, beautiful scenery and quiet days."},
 {id:"city-energy",query:"European city night street",el:"Πόλη & ενέργεια",en:"City & energy",hintEl:"Κουλτούρα, bars, κίνηση.",hintEn:"Culture, bars, movement.",semanticEl:"Θέλω πόλη με κουλτούρα, γειτονιές, καλό φαγητό και βραδινή ενέργεια.",semanticEn:"I want a city with culture, neighbourhoods, great food and evening energy."},
 {id:"wild-card",query:"dramatic island landscape Europe",el:"Κάτι που δεν περίμενα",en:"Something unexpected",hintEl:"Έκπληξέ με, αλλά να βγάζει νόημα.",hintEn:"Surprise me, but make it credible.",semanticEl:"Θέλω να μου προτείνεις κάτι που δεν θα έψαχνα μόνος μου, αρκεί να ταιριάζει πραγματικά.",semanticEn:"I want something I would not search for myself, as long as it genuinely fits."}
];

const QUESTIONS:Record<QuestionId,{el:string;en:string;options:Array<{value:string;el:string;en:string;hintEl:string;hintEn:string}>}>={
 companions:{el:"Ποιος θα είναι μαζί σου;",en:"Who are you escaping with?",options:[{value:"solo",el:"Μόνος/η",en:"Solo",hintEl:"Χωρίς συμβιβασμούς.",hintEn:"No compromises."},{value:"couple",el:"Με τον άνθρωπό μου",en:"With my partner",hintEl:"Χρόνος για δύο.",hintEn:"Time for two."},{value:"family",el:"Με παιδιά",en:"With kids",hintEl:"Να περάσουμε όλοι καλά.",hintEn:"Make it work for everyone."},{value:"friends",el:"Με φίλους",en:"With friends",hintEl:"Κοινές στιγμές και ενέργεια.",hintEn:"Shared moments and energy."}]},
 outcome:{el:"Όταν επιστρέψεις, πώς θέλεις να νιώθεις;",en:"How do you want to feel when you come back?",options:[{value:"restore",el:"Ξεκούραστος πραγματικά",en:"Actually rested",hintEl:"Χαμηλοί ρυθμοί, ανάσα.",hintEn:"Slower pace, proper reset."},{value:"balanced",el:"Γεμάτος όμορφες στιγμές",en:"Full of good memories",hintEl:"Ισορροπία εμπειρίας και άνεσης.",hintEn:"A balance of experience and ease."},{value:"stimulating",el:"Ζωντανός και ενθουσιασμένος",en:"Alive and energized",hintEl:"Κάτι που θα θυμάμαι.",hintEn:"Something memorable."}]},
 social:{el:"Τι ατμόσφαιρα αντέχεις αυτή τη στιγμή;",en:"What kind of atmosphere fits you right now?",options:[{value:"quiet",el:"Ήσυχα",en:"Quiet",hintEl:"Λιγότερος κόσμος, περισσότερο χώρος.",hintEn:"Less crowd, more space."},{value:"balanced",el:"Λίγη ζωή, χωρίς χάος",en:"Some life, no chaos",hintEl:"Να έχω επιλογές αλλά και ησυχία.",hintEn:"Options without overload."},{value:"lively",el:"Θέλω ενέργεια",en:"I want energy",hintEl:"Βόλτες, bars, βραδινή ζωή.",hintEn:"Streets, bars, nights out."}]},
 novelty:{el:"Πόσο μακριά από το γνώριμο θέλεις να πας;",en:"How far from familiar do you want to go?",options:[{value:"familiar",el:"Θέλω σιγουριά",en:"Keep it familiar",hintEl:"Εύκολο και προβλέψιμο.",hintEn:"Easy and predictable."},{value:"balanced",el:"Κάτι νέο, αλλά όχι ρίσκο",en:"New, but not risky",hintEl:"Ανακάλυψη με ασφάλεια.",hintEn:"Discovery with confidence."},{value:"surprise",el:"Έκπληξέ με",en:"Surprise me",hintEl:"Δείξε μου κάτι που δεν θα έψαχνα.",hintEn:"Show me what I would not search for."}]},
 must_have:{el:"Αν ένα πράγμα έπρεπε να είναι τέλειο, ποιο;",en:"If one thing had to be perfect, what would it be?",options:[{value:"sea",el:"Θάλασσα / φως",en:"Sea / light",hintEl:"Να ανοίγει το μάτι.",hintEn:"Space, light, horizon."},{value:"nature",el:"Φύση",en:"Nature",hintEl:"Πράσινο, βουνό, διαδρομές.",hintEn:"Green, mountains, trails."},{value:"culture",el:"Ιστορία / κουλτούρα",en:"Culture / history",hintEl:"Να έχει κάτι να ανακαλύψω.",hintEn:"Something worth discovering."},{value:"nightlife",el:"Βραδινή ζωή",en:"Nightlife",hintEl:"Να μην τελειώνει νωρίς η μέρα.",hintEn:"Let the day continue after dark."},{value:"none",el:"Δεν έχω must-have",en:"No must-have",hintEl:"Βρες την καλύτερη συνολική ισορροπία.",hintEn:"Find the best overall balance."}]},
 friction:{el:"Τι δεν θέλεις να πληρώσεις με χρόνο ή νεύρα;",en:"What do you not want to pay for with time or energy?",options:[{value:"long-travel",el:"Πολλές ώρες μετακίνησης",en:"Long travel",hintEl:"Θέλω να αρχίσουν γρήγορα οι διακοπές.",hintEn:"I want the holiday to start fast."},{value:"crowds",el:"Πολύ κόσμο",en:"Crowds",hintEl:"Δεν θέλω να νιώθω ότι είμαι σε ουρά.",hintEn:"I do not want queue energy."},{value:"high-cost",el:"Να πληρώσω premium χωρίς λόγο",en:"Paying premium for no reason",hintEl:"Θέλω αξία, όχι φθηνότερο πάση θυσία.",hintEn:"Value, not cheap at any cost."},{value:"none",el:"Δεν με περιορίζει κάτι ιδιαίτερα",en:"Nothing specific",hintEl:"Έχουμε μεγαλύτερο χώρο επιλογών.",hintEn:"Keep the option space wide."}]}
};

function fallbackWindows(lang:Lang,duration:number):DateWindow[]{
 const now=new Date(),fri=nextWeekday(now,5),fri2=nextWeekday(now,5,2),sun=nextWeekday(now,0,1);
 return [
  {id:"easy",label:say(lang,"Η εύκολη απόδραση","The easy escape"),note:say(lang,"Παρασκευή αναχώρηση · μικρή απαίτηση σε άδεια","Friday departure · minimal leave"),start:iso(fri),end:iso(add(fri,duration)),reason:say(lang,"Χαμηλή οργανωτική τριβή.","Low planning friction."),confidence:"MEDIUM"},
  {id:"space",label:say(lang,"Το weekend με χώρο","The weekend with room"),note:say(lang,"Λίγο αργότερα · περισσότερο περιθώριο επιλογών","A little later · more room for options"),start:iso(fri2),end:iso(add(fri2,duration)),reason:say(lang,"Περισσότερος χώρος για δυνατό matching.","More room for stronger matching."),confidence:"MEDIUM"},
  {id:"quiet",label:say(lang,"Η πιο ήσυχη εκδοχή","The quieter version"),note:say(lang,"Κυριακή–μέσα εβδομάδας","Sunday into midweek"),start:iso(sun),end:iso(add(sun,duration)),reason:say(lang,"Διαφορετικός, πιο ήρεμος ρυθμός.","A different, calmer rhythm."),confidence:"MEDIUM"}
 ];
}

export function V34EscapeFunnel({lang="el"}:{lang?:Lang}){
 const [initialText,setInitialText]=useState("");
 const [answers,setAnswers]=useState<Answer[]>([]);
 const [discovery,setDiscovery]=useState<Discovery|null>(null);
 const [stage,setStage]=useState<"listen"|"questions"|"dna"|"dates"|"constraints"|"research"|"results">("listen");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [activeWorld,setActiveWorld]=useState<string>("sea-light");
 const [moodMedia,setMoodMedia]=useState<Record<string,Media>>({});
 const [dateMode,setDateMode]=useState<"suggest"|"fixed"|"flexible">("suggest");
 const [duration,setDuration]=useState(3);
 const [horizonDays,setHorizonDays]=useState(60);
 const [dateWindows,setDateWindows]=useState<DateWindow[]>(()=>fallbackWindows(lang,3));
 const [dateLoading,setDateLoading]=useState(false);
 const [windowId,setWindowId]=useState("easy");
 const [fixedStart,setFixedStart]=useState(iso(nextWeekday(new Date(),5)));
 const [fixedEnd,setFixedEnd]=useState(iso(add(nextWeekday(new Date(),5),3)));
 const [origin,setOrigin]=useState(say(lang,"Αθήνα","Athens"));
 const [budget,setBudget]=useState(900);
 const [result,setResult]=useState<V8RecommendationResponse|null>(null);
 const [rows,setRows]=useState<StreamRow[]>([]);
 const [missionId,setMissionId]=useState<string|null>(null);
 const [media,setMedia]=useState<Record<string,Media[]>>({});
 const [reveal,setReveal]=useState<V8Recommendation|null>(null);

 const selectedWindow=useMemo(()=>dateMode==="fixed"?{id:"fixed",label:say(lang,"Οι ημερομηνίες μου","My dates"),note:"",start:fixedStart,end:fixedEnd,reason:""}:dateWindows.find(w=>w.id===windowId)??dateWindows[0],[dateMode,fixedStart,fixedEnd,dateWindows,windowId,lang]);
 const activeWorldMedia=moodMedia[activeWorld]??Object.values(moodMedia)[0]??null;
 const q=discovery?.nextQuestionId?QUESTIONS[discovery.nextQuestionId]:null;
 const shortlist=result?.recommendations.slice(0,3)??[];
 const roleLabels=[say(lang,"Η σωστή για σένα","The right one"),say(lang,"Η συναισθηματική επιλογή","The emotional one"),say(lang,"Η απρόσμενη","The unexpected one")];

 useEffect(()=>{
  let cancelled=false;
  Promise.all(VISUAL_WORLDS.map(async world=>{
   try{const response=await fetch(`/api/escape/media?destination=${encodeURIComponent(world.query)}`);const data=await response.json() as {items?:Media[]};return[world.id,data.items?.[0]??null] as const}catch{return[world.id,null] as const}
  })).then(entries=>{if(cancelled)return;const next:Record<string,Media>={};for(const [id,item] of entries)if(item)next[id]=item;setMoodMedia(next)});
  return()=>{cancelled=true};
 },[]);

 useEffect(()=>{
  if(stage!=="dates"||!discovery||dateMode==="fixed")return;
  let cancelled=false;setDateLoading(true);
  fetch("/api/escape/date-opportunities",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:lang,initialText,duration,horizonDays:dateMode==="flexible"?horizonDays:60,profile:{travelerType:discovery.profile.travelerType,desiredEnergy:discovery.profile.desiredEnergy,socialPreference:discovery.profile.socialPreference,noveltyPreference:discovery.profile.noveltyPreference,avoid:discovery.profile.avoid,moods:discovery.profile.moods}})})
   .then(async response=>response.ok?await response.json():null)
   .then((data:{windows?:DateWindow[]}|null)=>{if(cancelled)return;const windows=data?.windows?.length===3?data.windows:fallbackWindows(lang,duration);setDateWindows(windows);setWindowId(windows[0].id)})
   .catch(()=>{if(!cancelled){const windows=fallbackWindows(lang,duration);setDateWindows(windows);setWindowId(windows[0].id)}})
   .finally(()=>{if(!cancelled)setDateLoading(false)});
  return()=>{cancelled=true};
 },[stage,discovery,dateMode,duration,horizonDays,initialText,lang]);

 useEffect(()=>{
  if(!shortlist.length)return;
  let cancelled=false;
  Promise.all(shortlist.map(async rec=>{
   try{const response=await fetch(`/api/escape/media?destination=${encodeURIComponent(rec.destinationEn||rec.destination)}`);const data=await response.json() as {items?:Media[]};return[rec.slug,data.items?.slice(0,4)??[]] as [string,Media[]]}catch{return[rec.slug,[] as Media[]] as [string,Media[]]}
  })).then(entries=>{if(cancelled)return;const next:Record<string,Media[]>={};for(const [slug,items] of entries)next[slug]=items;setMedia(next)});
  return()=>{cancelled=true};
 },[result]);

 function chooseVisual(world:VisualWorld){
  setActiveWorld(world.id);
  const semantic=say(lang,world.semanticEl,world.semanticEn);
  setInitialText(current=>current.includes(semantic)?current:(current.trim()?`${current.trim()} ${semantic}`:semantic));
 }

 async function discover(nextAnswers=answers){
  setBusy(true);setError(null);
  try{const response=await fetch("/api/escape/discovery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:lang,initialText,answers:nextAnswers})});if(!response.ok)throw new Error("discovery");const data=await response.json() as Discovery;setDiscovery(data);setStage(data.complete?"dna":"questions")}
  catch{setError(say(lang,"Δεν κατάφερα να σε καταλάβω αρκετά. Πες μου με δικά σου λόγια τι χρειάζεσαι από αυτή την απόδραση.","I could not understand enough yet. Tell me in your own words what you need from this escape."))}
  finally{setBusy(false)}
 }
 async function start(event:FormEvent){event.preventDefault();if(initialText.trim().length<3)return;await discover([])}
 async function answer(questionId:QuestionId,value:string){const next=[...answers.filter(item=>item.questionId!==questionId),{questionId,value}];setAnswers(next);await discover(next)}

 async function createMission(){
  if(!discovery||!selectedWindow)return null;
  try{const response=await fetch("/api/escape/mission",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:lang,originText:origin,travelWindow:{label:selectedWindow.label,start:selectedWindow.start,end:selectedWindow.end},needText:initialText.slice(0,500),travelerType:discovery.profile.travelerType,groupSize:groupSize(discovery.profile.travelerType),budgetEur:budget,dna:discovery.profile.dnaLabels})});if(!response.ok)return null;const data=await response.json() as {missionId?:string};return data.missionId??null}catch{return null}
 }
 async function persistFinalists(id:string,finalResult:V8RecommendationResponse){const finalists=finalResult.recommendations.slice(0,3).map(item=>({slug:item.slug,score:item.score,why:item.why,seasonNote:item.seasonNote,budgetLabel:item.budgetLabel,effortLabel:item.effortLabel}));await fetch("/api/escape/matches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({missionId:id,finalists})}).catch(()=>null)}

 async function solve(){
  if(!discovery||!selectedWindow)return;
  setBusy(true);setError(null);setRows([]);setResult(null);setStage("research");
  const id=await createMission();setMissionId(id);
  const nights=Math.max(1,Math.round((Date.parse(`${selectedWindow.end}T00:00:00Z`)-Date.parse(`${selectedWindow.start}T00:00:00Z`))/DAY));
  const tripText=`${initialText}. ${discovery.summary}`.slice(0,500);
  const payload={origin,startDate:selectedWindow.start,endDate:selectedWindow.end,month:"flexible",nights,budget,moods:discovery.profile.moods.length?discovery.profile.moods:["relax"],travelerType:discovery.profile.travelerType,groupSize:groupSize(discovery.profile.travelerType),language:lang,distancePreference:"any",pace:discovery.profile.pace,hotelStyle:"any",avoid:discovery.profile.avoid,entryMode:"unknown",desiredEnergy:discovery.profile.desiredEnergy,socialPreference:discovery.profile.socialPreference,noveltyPreference:discovery.profile.noveltyPreference,mustHave:discovery.profile.mustHave,dateFlexibility:dateMode==="fixed"?"fixed":"few-days",transportMode:"any",stayLocationPreference:"balanced",tripText};
  try{
   const response=await fetch("/api/recommend/stream",{method:"POST",headers:{"content-type":"application/json",accept:"application/x-ndjson"},body:JSON.stringify(payload)});if(!response.ok)throw new Error("recommend");const reader=response.body?.getReader();if(!reader)throw new Error("stream");const decoder=new TextDecoder();let buffer="";
   while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";for(const line of lines){if(!line.trim())continue;const item=JSON.parse(line) as StreamRow&{result?:V8RecommendationResponse};if(item.type==="final"&&item.result){setResult(item.result);setStage("results");if(id)void persistFinalists(id,item.result)}else setRows(current=>[...current,item])}}
  }catch{setError(say(lang,"Η ανάλυση δεν ολοκληρώθηκε. Κράτησα το προφίλ σου — μπορείς να ξαναδοκιμάσεις.","The analysis did not complete. I kept your profile — you can try again."));setStage("constraints")}
  finally{setBusy(false)}
 }

 function hrefFor(rec:V8Recommendation){return `/escape/${encodeURIComponent(rec.slug)}?start=${selectedWindow?.start}&end=${selectedWindow?.end}&budget=${budget}&travelerType=${discovery?.profile.travelerType??"couple"}&mood=${discovery?.profile.moods[0]??"relax"}&origin=${encodeURIComponent(origin)}&lang=${lang}${missionId?`&mission=${missionId}`:""}`}

 return <main className={styles.shell}>
  <header className={styles.nav}><a className={styles.brand} href={lang==="en"?"/en":"/"}>AI TRAVEL <span>ESCAPE</span></a><a className={styles.lang} href={lang==="en"?"/":"/en"}>{lang==="en"?"Ελληνικά":"English"}</a></header>

  {stage==="listen"&&<section className={styles.hero}>
   {activeWorldMedia?<><img className={styles.heroPhoto} src={activeWorldMedia.imageUrl} alt="" aria-hidden="true"/><div className={styles.heroPhotoShade}/></>:<div className={styles.aurora}/>}<div className={styles.heroGrain}/>
   <div className={styles.heroInner}><p className={styles.kicker}>AI TRAVEL DECISION SYSTEM</p><h1>{say(lang,"Δεν χρειάζεται να ξέρεις πού θέλεις να πας.","You do not need to know where you want to go.")}</h1><p className={styles.lead}>{say(lang,"Πες μου τι χρειάζεσαι να νιώσεις. Θα μάθω πρώτα εσένα — μετά θα βρω πότε και πού αξίζει να φύγεις.","Tell me how you need to feel. I will understand you first — then work out when and where it makes sense to go.")}</p>
   <form onSubmit={start} className={styles.listen}><textarea value={initialText} onChange={event=>setInitialText(event.target.value)} placeholder={say(lang,"π.χ. Είμαι κουρασμένος, θέλω λίγες μέρες με τη σύντροφό μου, χωρίς τρέξιμο, με καλό φαγητό...","e.g. I am exhausted. I want a few days with my partner, little hassle, great food...")} maxLength={700}/><button disabled={busy||initialText.trim().length<3}>{busy?say(lang,"Σε ακούω...","Listening..."):say(lang,"Κατάλαβέ με πρώτα","Understand me first")}</button></form>
   <div className={styles.visualPrompt}><span>{say(lang,"Ή διάλεξε αυτό που σε τραβάει τώρα","Or choose what pulls you right now")}</span><div className={styles.visualWorlds}>{VISUAL_WORLDS.slice(0,4).map(world=>{const image=moodMedia[world.id];return <button type="button" key={world.id} className={activeWorld===world.id?styles.visualWorldActive:""} onClick={()=>chooseVisual(world)}>{image&&<img src={image.imageUrl} alt=""/>}<i/><strong>{say(lang,world.el,world.en)}</strong><small>{say(lang,world.hintEl,world.hintEn)}</small></button>})}</div></div>
   <div className={styles.promise}><span>{say(lang,"1 · Σε καταλαβαίνω","1 · Understand you")}</span><span>{say(lang,"2 · Βρίσκω πότε","2 · Find when")}</span><span>{say(lang,"3 · Βρίσκω πού","3 · Find where")}</span><span>{say(lang,"4 · Χτίζω το ταξίδι","4 · Build the trip")}</span></div></div>
  </section>}

  {stage!=="listen"&&<div className={styles.journeyBar}><button type="button" onClick={()=>{setStage("listen");setResult(null);setReveal(null)}}>← {say(lang,"Από την αρχή","Start over")}</button><span>{discovery?.summary??say(lang,"Χτίζουμε την απόδρασή σου","Building your escape")}</span></div>}

  {stage==="questions"&&q&&discovery&&<section className={styles.dialogue}><div className={styles.aiBubble}><span>AI</span><p>{discovery.summary}</p><small>{say(lang,"Δεν ψάχνω προορισμούς ακόμη. Προσπαθώ να καταλάβω τι θα κάνει αυτό το ταξίδι σωστό για εσένα.","I am not searching destinations yet. I am learning what would make this trip right for you.")}</small></div><div className={styles.question}><p className={styles.step}>AI DISCOVERY</p><h2>{say(lang,q.el,q.en)}</h2><div className={styles.optionGrid}>{q.options.map(option=><button key={option.value} disabled={busy} onClick={()=>answer(discovery.nextQuestionId!,option.value)}><strong>{say(lang,option.el,option.en)}</strong><small>{say(lang,option.hintEl,option.hintEn)}</small></button>)}</div></div></section>}

  {stage==="dna"&&discovery&&<section className={styles.dna}><p className={styles.step}>ESCAPE DNA</p><h2>{say(lang,"Νομίζω ότι αυτό είναι που χρειάζεσαι τώρα.","I think this is what you need right now.")}</h2><blockquote>{discovery.summary}</blockquote><div className={styles.dnaChips}>{discovery.profile.dnaLabels.map(label=><span key={label}>{label}</span>)}</div><div className={styles.dnaActions}><button className={styles.primary} onClick={()=>setStage("dates")}>{say(lang,"Ναι — βρες πότε αξίζει","Yes — find when it makes sense")}</button><button className={styles.secondary} onClick={()=>setStage("listen")}>{say(lang,"Όχι ακριβώς — ξαναπές το","Not quite — let me restate it")}</button></div></section>}

  {stage==="dates"&&discovery&&<section className={styles.panel}><p className={styles.step}>TIME STRATEGY</p><h2>{say(lang,"Θες να μου πεις πότε ή να βρω εγώ το σωστό παράθυρο;","Tell me when — or let me find the right window.")}</h2><div className={styles.modeGrid}>{(["suggest","fixed","flexible"] as const).map(mode=><button key={mode} className={dateMode===mode?styles.activeMode:""} onClick={()=>setDateMode(mode)}><strong>{mode==="suggest"?say(lang,"Πρότεινέ μου","Suggest dates"):mode==="fixed"?say(lang,"Ξέρω πότε","I know when"):say(lang,"Έχω ευελιξία","I am flexible")}</strong><small>{mode==="suggest"?say(lang,"AI παράθυρα που ταιριάζουν στον ρυθμό σου","AI windows shaped around your travel rhythm"):mode==="fixed"?say(lang,"Έχω συγκεκριμένες ημερομηνίες","I have exact dates"):say(lang,"Ψάξε σε μεγαλύτερο χρονικό ορίζοντα","Search across a wider horizon")}</small></button>)}</div>
   {dateMode==="fixed"?<div className={styles.fixedDates}><label>{say(lang,"Αναχώρηση","Departure")}<input type="date" value={fixedStart} min={iso(new Date())} onChange={event=>setFixedStart(event.target.value)}/></label><label>{say(lang,"Επιστροφή","Return")}<input type="date" value={fixedEnd} min={fixedStart} onChange={event=>setFixedEnd(event.target.value)}/></label></div>:<><div className={styles.duration}><span>{say(lang,"Πόσες νύχτες;","How many nights?")}</span>{[2,3,4,5,7].map(n=><button type="button" key={n} className={duration===n?styles.selectedPill:""} onClick={()=>setDuration(n)}>{n}</button>)}</div>{dateMode==="flexible"&&<div className={styles.duration}><span>{say(lang,"Πόσο μακριά να ψάξω;","How far should I search?")}</span>{[30,60,90,120].map(n=><button type="button" key={n} className={horizonDays===n?styles.selectedPill:""} onClick={()=>setHorizonDays(n)}>{n} {say(lang,"ημ.","days")}</button>)}</div>}<div className={styles.windowGrid}>{dateLoading?<div className={styles.dateThinking}>{say(lang,"Χτίζω 3 παράθυρα που ταιριάζουν στον τρόπο που θέλεις να ταξιδέψεις...","Building three windows that fit the way you want to travel...")}</div>:dateWindows.map(window=><button type="button" key={window.id} className={windowId===window.id?styles.selectedWindow:""} onClick={()=>setWindowId(window.id)}><strong>{window.label}</strong><span>{window.start} → {window.end}</span><small>{window.note}</small>{window.reason&&<em>{window.reason}</em>}</button>)}</div><p className={styles.verifyNote}>{say(lang,"Δεν παρουσιάζω ακόμη τιμές ή καιρό ως δεδομένα. Αυτά επαληθεύονται αφού βρούμε τους κατάλληλους προορισμούς.","I am not treating prices or weather as facts yet. Those are verified after we find the right destinations.")}</p></>}
   <button className={styles.primary} disabled={dateLoading||!selectedWindow} onClick={()=>setStage("constraints")}>{say(lang,"Κράτα αυτό το παράθυρο","Use this window")}</button></section>}

  {stage==="constraints"&&discovery&&selectedWindow&&<section className={styles.panel}><p className={styles.step}>REALITY CHECK</p><h2>{say(lang,"Τώρα μόνο ό,τι μπορεί πραγματικά να αλλάξει την απόφαση.","Now only what can genuinely change the decision.")}</h2><div className={styles.constraintGrid}><label>{say(lang,"Από πού ξεκινάς;","Starting from?")}<input value={origin} onChange={event=>setOrigin(event.target.value)}/></label><label>{say(lang,"Άνετο συνολικό budget","Comfortable total budget")}<div className={styles.budgetPills}>{[600,900,1400,2000,3000].map(value=><button type="button" key={value} className={budget===value?styles.selectedPill:""} onClick={()=>setBudget(value)}>€{value}</button>)}</div></label></div><div className={styles.brief}><span>{say(lang,"Αυτό θα λύσω:","This is what I will solve:")}</span><p>{discovery.summary}</p><small>{selectedWindow.start} → {selectedWindow.end} · {origin} · €{budget}</small></div><button className={styles.primary} disabled={busy||origin.trim().length<2} onClick={solve}>{say(lang,"Βρες τις 3 αποδράσεις μου","Find my three escapes")}</button></section>}

  {stage==="research"&&<section className={styles.research}><div className={styles.pulse}/><p className={styles.step}>SEMANTIC MATCHING</p><h2>{say(lang,"Δεν ψάχνω ξενοδοχεία ακόμα. Αποκλείω ό,τι δεν ταιριάζει σε εσένα.","I am not searching hotels yet. I am eliminating what does not fit you.")}</h2><div className={styles.researchLines}>{rows.slice(-6).map((row,index)=><span key={`${row.type}-${index}`}>{row.message||say(lang,"Ελέγχω εποχή, πρόσβαση, ρυθμό και πραγματικό fit...","Checking season, access, pace and real fit...")}</span>)}</div></section>}

  {stage==="results"&&result&&selectedWindow&&<section className={styles.results}><div className={styles.resultsHead}><p className={styles.step}>YOUR ESCAPES</p><h2>{say(lang,"Τρεις επιλογές επέζησαν.","Three escapes survived.")}</h2><p>{result.profileSummary}</p></div><div className={styles.cards}>{shortlist.map((rec,index)=>{const gallery=media[rec.slug]??[],image=gallery[0];return <article key={rec.slug} className={styles.destinationCard}>{image?<><img src={image.imageUrl} alt={rec.destination} loading={index===0?"eager":"lazy"}/><div className={styles.kenBurns}/></>:<div className={styles.imageFallback}/>}<div className={styles.cardShade}/><div className={styles.cardContent}><span className={styles.role}>{roleLabels[index]}</span><h3>{lang==="en"?rec.destinationEn:rec.destination}</h3><p>{rec.why}</p><div className={styles.facts}><span>{rec.seasonNote}</span><span>{rec.effortLabel}</span><span>{rec.budgetLabel}</span></div><details><summary>{say(lang,"Το trade-off που πρέπει να ξέρεις","The trade-off to know")}</summary><p>{rec.explorationReason}</p></details><button type="button" className={styles.choose} onClick={()=>setReveal(rec)}>{say(lang,"Δείξε μου πώς θα νιώθει","Show me how it will feel")}</button>{image&&<a className={styles.credit} href={image.sourceUrl} target="_blank" rel="noreferrer">Photo: {image.attribution} · {image.license}</a>}</div></article>})}</div><button className={styles.secondary} onClick={()=>setStage("dates")}>{say(lang,"Άλλαξε ημερομηνίες","Change dates")}</button></section>}

  {reveal&&selectedWindow&&<div className={styles.reveal} role="dialog" aria-modal="true" aria-label={lang==="en"?reveal.destinationEn:reveal.destination}><div className={styles.revealMedia}>{(media[reveal.slug]??[]).slice(0,3).map((item,index)=><img key={item.imageUrl} className={styles[`revealPhoto${index+1}` as keyof typeof styles]} src={item.imageUrl} alt="" aria-hidden="true"/>)}<div className={styles.revealShade}/></div><button className={styles.revealClose} type="button" onClick={()=>setReveal(null)} aria-label={say(lang,"Κλείσιμο","Close")}>×</button><div className={styles.revealContent}><p className={styles.step}>THIS COULD BE YOUR ESCAPE</p><h2>{lang==="en"?reveal.destinationEn:reveal.destination}</h2><p className={styles.revealWhy}>{reveal.why}</p><div className={styles.revealMeta}><span>{selectedWindow.start} → {selectedWindow.end}</span><span>{reveal.seasonNote}</span><span>{reveal.effortLabel}</span></div><p className={styles.revealPromise}>{say(lang,"Αν το επιλέξεις, τώρα ξεκινά το 360° research: καιρός, γειτονιές, φαγητό, τι δεν πρέπει να χάσεις, logistics, plan B και μόνο μετά η σωστή διαμονή.","Choose it and the 360° research starts now: weather, neighbourhoods, food, what not to miss, logistics, plan B — and only then the right stay.")}</p><a className={styles.revealCta} href={hrefFor(reveal)}>{say(lang,"Ναι — χτίσε αυτό το ταξίδι","Yes — build this trip")}</a><button className={styles.revealBack} type="button" onClick={()=>setReveal(null)}>{say(lang,"Δείξε μου ξανά τις 3 επιλογές","Show me the three options again")}</button></div></div>}

  {error&&<div className={styles.error}>{error}</div>}
 </main>
}
