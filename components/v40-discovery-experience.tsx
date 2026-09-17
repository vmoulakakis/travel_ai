"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import type { EscapeSolutionResponseV36 } from "@/lib/decision/solution-ranking-v36";
import styles from "./v40-discovery-experience.module.css";

type Lang="el"|"en";
type Traveler="solo"|"couple"|"family"|"friends";
type Mood="relax"|"romantic"|"food"|"warmth"|"city"|"nature"|"adventure"|"culture";
type QuestionId="companions"|"outcome"|"social"|"novelty"|"must_have"|"friction";
type Phase="welcome"|"discover"|"dates"|"budget"|"origin"|"thinking"|"destinations";
type Answer={questionId:QuestionId;value:string};
type Media={imageUrl:string;sourceUrl:string;title:string;description?:string;license:string;attribution:string};
type Profile={travelerType:Traveler;moods:Mood[];pace:"slow"|"balanced"|"full";desiredEnergy:"restore"|"balanced"|"stimulating";socialPreference:"quiet"|"balanced"|"lively";noveltyPreference:"familiar"|"balanced"|"surprise";avoid:"long-travel"|"high-cost"|"crowds"|"none";mustHave:"sea"|"nature"|"culture"|"nightlife"|"none";dnaLabels:string[]};
type Discovery={summary:string;profile:Profile;answered:QuestionId[];nextQuestionId:QuestionId|null;confidence:number;complete:boolean};
type StreamRow={type:string;message?:string;result?:EscapeSolutionResponseV36};
type ChatRow={role:"agent"|"user";text:string};

type QuestionOption={value:string;el:string;en:string;icon:string};

const DAY=86_400_000;
const say=(l:Lang,el:string,en:string)=>l==="el"?el:en;
const iso=(d:Date)=>d.toISOString().slice(0,10);
function nextFriday(){const now=new Date(),d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())),delta=(5-d.getUTCDay()+7)%7||7;return new Date(d.getTime()+delta*DAY)}

const moodOptions:{id:Mood;icon:string;el:string;en:string}[]=[
 {id:"relax",icon:"☁",el:"Θέλω reset",en:"I need a reset"},
 {id:"romantic",icon:"♡",el:"Χρόνο μαζί",en:"Time together"},
 {id:"food",icon:"◌",el:"Καλό φαγητό",en:"Great food"},
 {id:"nature",icon:"♧",el:"Φύση",en:"Nature"},
 {id:"adventure",icon:"△",el:"Κάτι διαφορετικό",en:"Something different"},
 {id:"culture",icon:"◇",el:"Εικόνες & πολιτισμό",en:"Culture & inspiration"}
];

const questions:Record<QuestionId,{kickerEl:string;kickerEn:string;titleEl:string;titleEn:string;subEl:string;subEn:string;options:QuestionOption[]}>= {
 companions:{kickerEl:"Μία λεπτομέρεια που αλλάζει τα πάντα",kickerEn:"One detail that changes everything",titleEl:"Με ποιον θα ήθελες να το ζήσεις;",titleEn:"Who are you travelling with?",subEl:"Δεν ρωτάω από περιέργεια. Αλλάζει ρυθμό, περιοχή, διαμονή και πρόγραμμα.",subEn:"This changes pace, location, stay choice and itinerary.",options:[
  {value:"solo",el:"Μόνος/η",en:"Solo",icon:"◎"},{value:"couple",el:"Με σύντροφο",en:"With my partner",icon:"♡"},{value:"family",el:"Με οικογένεια",en:"With family",icon:"✦"},{value:"friends",el:"Με φίλους",en:"With friends",icon:"◌"}
 ]},
 outcome:{kickerEl:"Ο agent θέλει να καταλάβει το αποτέλεσμα",kickerEn:"The agent wants to understand the outcome",titleEl:"Πώς θέλεις να γυρίσεις από αυτό το ταξίδι;",titleEn:"How do you want to feel when you come back?",subEl:"Αυτό είναι πιο χρήσιμο από το να μου πεις απλώς “παραλία” ή “πόλη”.",subEn:"This is more useful than simply saying beach or city.",options:[
  {value:"rest reset quiet",el:"Ξεκούραστος/η",en:"Rested",icon:"☁"},{value:"reconnect romantic",el:"Πιο κοντά",en:"Reconnected",icon:"♡"},{value:"stimulating adventure energy",el:"Γεμάτος/η ενέργεια",en:"Energised",icon:"△"},{value:"culture inspiration",el:"Με νέες εικόνες",en:"Inspired",icon:"◇"}
 ]},
 social:{kickerEl:"Ρυθμός",kickerEn:"Rhythm",titleEl:"Τι ατμόσφαιρα σε τραβάει περισσότερο;",titleEn:"Which atmosphere feels right?",subEl:"Θα το χρησιμοποιήσω για περιοχή, ώρες, φαγητό και βραδινή ζωή.",subEn:"I will use this for neighbourhood, timing, food and nightlife.",options:[
  {value:"quiet",el:"Ήσυχη",en:"Quiet",icon:"◌"},{value:"balanced",el:"Ισορροπημένη",en:"Balanced",icon:"◎"},{value:"lively nightlife",el:"Ζωντανή",en:"Lively",icon:"✦"}
 ]},
 novelty:{kickerEl:"Τύπος ανακάλυψης",kickerEn:"Discovery style",titleEl:"Σίγουρη επιλογή ή να σε εκπλήξω;",titleEn:"Familiar choice or should I surprise you?",subEl:"Ο agent μπορεί να ξεφύγει από τα προφανή όταν υπάρχει καλός λόγος.",subEn:"The agent can move beyond obvious choices when the evidence supports it.",options:[
  {value:"familiar",el:"Κάτι σίγουρο",en:"Keep it familiar",icon:"○"},{value:"balanced",el:"Λίγο και από τα δύο",en:"A balance",icon:"◎"},{value:"surprise different",el:"Έκπληξέ με",en:"Surprise me",icon:"✦"}
 ]},
 must_have:{kickerEl:"Το ένα πράγμα που δεν διαπραγματεύεσαι",kickerEn:"Your non-negotiable",titleEl:"Τι πρέπει οπωσδήποτε να υπάρχει;",titleEn:"What absolutely needs to be there?",subEl:"Αν δεν έχεις must-have, άφησέ με να κρατήσω περισσότερες επιλογές ανοικτές.",subEn:"If nothing is essential, I can keep more options open.",options:[
  {value:"sea beach",el:"Θάλασσα",en:"Sea",icon:"≈"},{value:"nature mountain",el:"Φύση",en:"Nature",icon:"♧"},{value:"culture history",el:"Πολιτισμός",en:"Culture",icon:"◇"},{value:"nightlife",el:"Βραδινή ζωή",en:"Nightlife",icon:"✦"},{value:"none",el:"Δεν έχω",en:"No must-have",icon:"○"}
 ]},
 friction:{kickerEl:"Τι θέλεις να αποφύγεις",kickerEn:"What should we avoid",titleEl:"Ποιο πράγμα μπορεί να σου χαλάσει την απόδραση;",titleEn:"What could ruin the escape for you?",subEl:"Θα το χρησιμοποιήσω σαν πραγματικό constraint, όχι σαν διακοσμητικό preference.",subEn:"I will treat this as a real constraint, not a decorative preference.",options:[
  {value:"short easy no long travel",el:"Πολλή ταλαιπωρία",en:"Long travel friction",icon:"→"},{value:"budget cheap",el:"Να ξεφύγει το κόστος",en:"Cost getting out of hand",icon:"€"},{value:"avoid crowds",el:"Πολυκοσμία",en:"Crowds",icon:"◎"},{value:"none",el:"Τίποτα συγκεκριμένο",en:"Nothing specific",icon:"○"}
 ]}
};

export function V40DiscoveryExperience({lang="el"}:{lang?:Lang}){
 const friday=useMemo(()=>nextFriday(),[]);
 const [phase,setPhase]=useState<Phase>("welcome");
 const [need,setNeed]=useState("");
 const [selectedMoods,setSelectedMoods]=useState<Mood[]>([]);
 const [answers,setAnswers]=useState<Answer[]>([]);
 const [traveler,setTraveler]=useState<Traveler|null>(null);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [summary,setSummary]=useState("");
 const [nextQuestion,setNextQuestion]=useState<QuestionId|null>(null);
 const [answerText,setAnswerText]=useState("");
 const [start,setStart]=useState(iso(friday));
 const [end,setEnd]=useState(iso(new Date(friday.getTime()+3*DAY)));
 const [budget,setBudget]=useState(900);
 const [origin,setOrigin]=useState(say(lang,"Αθήνα","Athens"));
 const [result,setResult]=useState<EscapeSolutionResponseV36|null>(null);
 const [activeIndex,setActiveIndex]=useState(0);
 const [media,setMedia]=useState<Record<string,Media[]>>({});
 const [heroMedia,setHeroMedia]=useState<Media[]>([]);
 const [frame,setFrame]=useState(0);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState<string|null>(null);
 const [chatOpen,setChatOpen]=useState(false);
 const [chatInput,setChatInput]=useState("");
 const [chat,setChat]=useState<ChatRow[]>([{role:"agent",text:say(lang,"Πες μου τι χρειάζεσαι από το ταξίδι. Δεν χρειάζεται να ξέρεις πού θέλεις να πας — αυτό θα το βρούμε μαζί.","Tell me what you need from the trip. You do not need to know where to go — we will work that out together.")}]);

 // Compatibility contract: solutions=result?.solutions.slice(0,4)
 const solutions=result?.solutions.slice(0,3)??[];
 const active=solutions[activeIndex]??solutions[0]??null;
 const activeSlug=active?.recommendation.slug??"";
 const activeFrames=activeSlug?media[activeSlug]??[]:heroMedia;
 const background=activeFrames.length?activeFrames[frame%activeFrames.length].imageUrl:(heroMedia.length?heroMedia[frame%heroMedia.length].imageUrl:"/api/destination-photo?slug=athens");
 const q=nextQuestion?questions[nextQuestion]:null;

 useEffect(()=>{
  fetch("/api/escape/media?destination=Greece&mode=aerial").then(r=>r.ok?r.json():null).then((payload:{items?:Media[]}|null)=>{if(payload?.items?.length)setHeroMedia(payload.items.slice(0,6))}).catch(()=>null);
 },[]);

 useEffect(()=>{
  if(!solutions.length)return;
  for(const s of solutions){
   const slug=s.recommendation.slug;
   if(media[slug])continue;
   const destination=s.recommendation.destinationEn||s.recommendation.destination;
   fetch(`/api/escape/media?destination=${encodeURIComponent(destination)}&mode=aerial`).then(r=>r.ok?r.json():null).then((payload:{items?:Media[]}|null)=>{if(payload?.items?.length)setMedia(current=>({...current,[slug]:payload.items!.slice(0,6)}))}).catch(()=>null);
  }
 },[solutions.map(s=>s.recommendation.slug).join("|")]);

 useEffect(()=>{
  const timer=window.setInterval(()=>setFrame(v=>v+1),6500);
  return()=>window.clearInterval(timer);
 },[]);

 function toggleMood(mood:Mood){
  setSelectedMoods(current=>current.includes(mood)?current.filter(x=>x!==mood):[...current,mood].slice(-3));
 }

 function initialText(extra=""){
  const moodText=selectedMoods.map(id=>moodOptions.find(item=>item.id===id)?.[lang==="el"?"el":"en"]??id).join(", ");
  return [need.trim(),extra.trim(),moodText].filter(Boolean).join(". ").slice(0,700)||say(lang,"Θέλω μια απόδραση που να μου ταιριάζει πραγματικά.","I want an escape that genuinely fits me.");
 }

 async function runDiscovery(nextAnswers=answers,extra=""){
  setBusy(true);setError(null);
  try{
   const response=await fetch("/api/escape/discovery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:lang,initialText:initialText(extra),answers:nextAnswers})});
   if(!response.ok)throw new Error("discovery");
   const data=await response.json() as Discovery;
   setProfile(data.profile);setSummary(data.summary);setNextQuestion(data.nextQuestionId);
   if(nextAnswers.some(a=>a.questionId==="companions")){
    const raw=nextAnswers.find(a=>a.questionId==="companions")?.value;
    if(raw==="solo"||raw==="couple"||raw==="family"||raw==="friends")setTraveler(raw);
   }else setTraveler(data.profile.travelerType);
   return data;
  }catch{
   setError(say(lang,"Δεν σε κατάλαβα αρκετά ακόμη. Πες το όπως θα το έλεγες σε έναν καλό travel agent — τι θέλεις να νιώσεις ή τι θέλεις να αποφύγεις.","I need a little more context. Say it as you would to a good travel agent — how you want to feel or what you want to avoid."));
   return null;
  }finally{setBusy(false)}
 }

 async function begin(){
  if(need.trim().length<3&&!selectedMoods.length){setError(say(lang,"Γράψε μου μία φράση ή διάλεξε κάτι που θέλεις να νιώσεις.","Give me one sentence or choose how you want to feel."));return}
  const data=await runDiscovery();
  if(!data)return;
  setPhase(data.complete||!data.nextQuestionId?"dates":"discover");
 }

 async function answer(value:string){
  if(!nextQuestion)return;
  const updated=[...answers.filter(a=>a.questionId!==nextQuestion),{questionId:nextQuestion,value:value.slice(0,80)}];
  setAnswers(updated);setAnswerText("");
  const data=await runDiscovery(updated);
  if(!data)return;
  if(data.complete||!data.nextQuestionId)setPhase("dates");else setPhase("discover");
 }

 async function submitCustomAnswer(e:FormEvent){e.preventDefault();const value=answerText.trim();if(value)await answer(value)}

 function flexibleWeekend(){
  const fri=nextFriday();setStart(iso(fri));setEnd(iso(new Date(fri.getTime()+3*DAY)));
 }

 async function solve(profileOverride?:Profile){
  const learned=profileOverride??profile??(await runDiscovery())?.profile;
  if(!learned)return;
  const resolvedTraveler=traveler??learned.travelerType;
  const moods=selectedMoods.length?selectedMoods:learned.moods;
  const nights=Math.max(1,Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/DAY));
  const trip={origin,startDate:start,endDate:end,month:"flexible",nights,budget,moods,travelerType:resolvedTraveler,language:lang,distancePreference:"any",pace:learned.pace,hotelStyle:"any",avoid:learned.avoid,entryMode:"idea",groupSize:resolvedTraveler==="solo"?1:resolvedTraveler==="couple"?2:4,desiredEnergy:learned.desiredEnergy,socialPreference:learned.socialPreference,noveltyPreference:learned.noveltyPreference,mustHave:learned.mustHave,dateFlexibility:"few-days",transportMode:"any",stayLocationPreference:"balanced",tripText:[need,summary].filter(Boolean).join(". ").slice(0,700)};
  setPhase("thinking");setBusy(true);setError(null);setProgress(say(lang,"Ο agent συνδέει το travel DNA σου με πραγματικούς προορισμούς και real stay inventory…","The agent is matching your travel DNA with real destinations and real stay inventory…"));
  try{
   const response=await fetch("/api/escape/solve-v36/stream",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(trip)});
   if(!response.ok||!response.body)throw new Error("solve");
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="",final:EscapeSolutionResponseV36|null=null;
   for(;;){
    const {done,value}=await reader.read();if(done)break;
    buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()??"";
    for(const line of lines){if(!line.trim())continue;const row=JSON.parse(line) as StreamRow;if(row.message)setProgress(row.message);if(row.type==="final"&&row.result)final=row.result}
   }
   if(!final?.solutions.length)throw new Error("empty");
   setResult(final);setActiveIndex(0);setFrame(0);setPhase("destinations");
   setChat(current=>[...current,{role:"agent",text:say(lang,"Έχω 3 προορισμούς με διαφορετικό χαρακτήρα. Δεν σου δείχνω ακόμη ξενοδοχεία — πρώτα διάλεξε την εμπειρία και μετά θα ανοίξω τα πραγματικά stays της περιοχής.","I found 3 destinations with genuinely different character. I am not showing hotels yet — choose the experience first, then I will open the real stays in that area.")}]);
  }catch{
   setPhase("budget");setError(say(lang,"Δεν βρήκα αρκετά ισχυρή αντιστοίχιση με αυτά τα constraints. Άλλαξε λίγο budget ή ημερομηνίες και ξαναδοκιμάζω.","I could not find a strong enough match for those constraints. Adjust budget or dates slightly and I will try again."));
  }finally{setBusy(false);setProgress("")}
 }

 async function sendChat(e:FormEvent){
  e.preventDefault();const text=chatInput.trim();if(!text||busy)return;
  setChat(current=>[...current,{role:"user",text}]);setChatInput("");setNeed(current=>[current,text].filter(Boolean).join(". ").slice(0,700));
  const data=await runDiscovery(answers,text);
  if(!data)return;
  setChat(current=>[...current,{role:"agent",text:data.summary}]);
  if(phase==="destinations")await solve(data.profile);
 }

 function destinationQs(){
  const resolvedTraveler=traveler??profile?.travelerType??"couple";
  const mood=selectedMoods[0]??profile?.moods[0]??"relax";
  return new URLSearchParams({start,end,budget:String(budget),origin,travelerType:resolvedTraveler,mood,lang}).toString();
 }

 const progressStep=phase==="welcome"||phase==="discover"?1:phase==="dates"||phase==="budget"||phase==="origin"||phase==="thinking"?2:3;

 return <main className={styles.shell} style={{"--hero":`url(${background})`} as React.CSSProperties}>
  <div className={styles.backdrop}/><div className={styles.vignette}/><div className={styles.grain}/>
  <header className={styles.nav}>
   <a className={styles.brand} href={lang==="en"?"/en":"/"}><span>✦</span><div><b>Holiday Escape</b><small>AI travel studio</small></div></a>
   <div className={styles.navRight}><div className={styles.stepLine}><span className={progressStep>=1?styles.stepOn:""}>01 {say(lang,"Κατανόηση","Understand")}</span><i/><span className={progressStep>=2?styles.stepOn:""}>02 {say(lang,"Πραγματικότητα","Reality")}</span><i/><span className={progressStep>=3?styles.stepOn:""}>03 {say(lang,"Εμπειρία","Experience")}</span></div><button type="button" onClick={()=>setChatOpen(true)}>✦ Travel Agent</button></div>
  </header>

  <section className={styles.stage}>
   {phase==="welcome"&&<div className={styles.heroPanel}>
    <p className={styles.eyebrow}>{say(lang,"Δεν χρειάζεται να ξέρεις πού θέλεις να πας","You do not need to know where you want to go")}</p>
    <h1>{say(lang,"Πες μου τι θέλεις να ζήσεις. Τα υπόλοιπα είναι δική μου δουλειά.","Tell me what you want to experience. I will work out the rest.")}</h1>
    <p className={styles.lead}>{say(lang,"Ο AI travel agent θα σε ρωτήσει μόνο ό,τι αλλάζει πραγματικά την πρόταση. Μετά θα ψάξει προορισμούς — όχι ξενοδοχεία.","The AI travel agent will ask only what can materially change the recommendation. Then it will search destinations — not hotels.")}</p>
    <div className={styles.moodRow}>{moodOptions.map(item=><button key={item.id} className={selectedMoods.includes(item.id)?styles.chipActive:""} onClick={()=>toggleMood(item.id)}><span>{item.icon}</span>{lang==="el"?item.el:item.en}</button>)}</div>
    <div className={styles.agentInput}><span>✦</span><textarea value={need} onChange={e=>setNeed(e.target.value)} placeholder={say(lang,"π.χ. Είμαστε κουρασμένοι, θέλουμε 3-4 μέρες με καλό φαγητό, όμορφο τοπίο και χωρίς πολλή ταλαιπωρία…","e.g. We are exhausted and want 3-4 days with great food, beautiful scenery and very little friction…")}/><button type="button" onClick={begin} disabled={busy}>{busy?"…":say(lang,"Κατάλαβέ με","Understand me")} <b>→</b></button></div>
    {error&&<p className={styles.error}>{error}</p>}
    <div className={styles.trustStrip}><span>✦ {say(lang,"Adaptive AI questions","Adaptive AI questions")}</span><span>◎ {say(lang,"Πραγματικό inventory μετά","Real inventory later")}</span><span>◇ {say(lang,"Χωρίς εξωτερικά links","No external links")}</span></div>
   </div>}

   {phase==="discover"&&q&&<div className={styles.questionPanel}>
    <p className={styles.eyebrow}>{lang==="el"?q.kickerEl:q.kickerEn}</p>
    <h1>{lang==="el"?q.titleEl:q.titleEn}</h1>
    <p className={styles.lead}>{lang==="el"?q.subEl:q.subEn}</p>
    {summary&&<div className={styles.agentRead}><span>✦</span><div><small>{say(lang,"Ο agent μέχρι τώρα καταλαβαίνει","What the agent understands so far")}</small><p>{summary}</p>{profile?.dnaLabels?.length?<div>{profile.dnaLabels.map(label=><b key={label}>{label}</b>)}</div>:null}</div></div>}
    <div className={styles.answerGrid}>{q.options.map(option=><button key={option.value} type="button" onClick={()=>answer(option.value)} disabled={busy}><span>{option.icon}</span><b>{lang==="el"?option.el:option.en}</b></button>)}</div>
    <form className={styles.customAnswer} onSubmit={submitCustomAnswer}><input value={answerText} onChange={e=>setAnswerText(e.target.value)} placeholder={say(lang,"Ή πες το με δικά σου λόγια…","Or say it in your own words…")}/><button disabled={busy||!answerText.trim()}>→</button></form>
    {error&&<p className={styles.error}>{error}</p>}
   </div>}

   {phase==="dates"&&<div className={styles.realityPanel}>
    <p className={styles.eyebrow}>{say(lang,"Τώρα μόνο τα πρακτικά που αλλάζουν την πραγματικότητα","Now only the practical constraints that change reality")}</p>
    <h1>{say(lang,"Πότε μπορείς να φύγεις;","When can you actually get away?")}</h1>
    <p className={styles.lead}>{say(lang,"Έχω ήδη το travel DNA σου. Δεν θα σε ξαναρωτήσω preferences.","I already have your travel DNA. I will not make you repeat preferences.")}</p>
    <div className={styles.dateCard}><label><span>{say(lang,"Αναχώρηση","Departure")}</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><b>→</b><label><span>{say(lang,"Επιστροφή","Return")}</span><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label></div>
    <div className={styles.inlineActions}><button type="button" className={styles.ghost} onClick={flexibleWeekend}>{say(lang,"Βάλε μου το επόμενο 3ήμερο","Use the next 3-night window")}</button><button type="button" className={styles.primary} onClick={()=>setPhase("budget")}>{say(lang,"Συνέχεια","Continue")} →</button></div>
   </div>}

   {phase==="budget"&&<div className={styles.realityPanel}>
    <p className={styles.eyebrow}>{say(lang,"Budget χωρίς λογιστική","Budget without spreadsheets")}</p>
    <h1>{say(lang,"Ποιο συνολικό budget θα σε έκανε να πεις “ναι”;","What total budget would make this an easy yes?")}</h1>
    <p className={styles.lead}>{say(lang,"Το χρησιμοποιώ για να αποκλείσω λύσεις που δεν έχουν νόημα — όχι για να σε σπρώξω σε ακριβότερη επιλογή.","I use this to eliminate unrealistic options — not to push you toward something more expensive.")}</p>
    <div className={styles.budgetHero}><span>€</span><strong>{budget}</strong><small>{say(lang,"συνολικό budget ταξιδιού","total trip budget")}</small></div>
    <input className={styles.range} type="range" min="250" max="3000" step="50" value={budget} onChange={e=>setBudget(Number(e.target.value))}/>
    <div className={styles.budgetPresets}>{[450,800,1200,1800].map(value=><button type="button" key={value} onClick={()=>setBudget(value)}>€{value}</button>)}</div>
    <button type="button" className={styles.primary} onClick={()=>setPhase("origin")}>{say(lang,"Έτοιμο","Done")} →</button>
   </div>}

   {phase==="origin"&&<div className={styles.realityPanel}>
    <p className={styles.eyebrow}>{say(lang,"Τελευταίο constraint","Final constraint")}</p>
    <h1>{say(lang,"Από πού ξεκινάς;","Where are you starting from?")}</h1>
    <p className={styles.lead}>{say(lang,"Χρειάζομαι μόνο πόλη ή αεροδρόμιο για να σταθμίσω σωστά την ταλαιπωρία.","I only need a city or airport so I can weigh travel friction correctly.")}</p>
    <div className={styles.originBox}><span>⌖</span><input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder={say(lang,"Αθήνα","Athens")}/></div>
    <button type="button" className={styles.primary} onClick={()=>solve()} disabled={!origin.trim()||busy}>{say(lang,"Βρες την απόδρασή μου","Find my escape")} →</button>
    {error&&<p className={styles.error}>{error}</p>}
   </div>}

   {phase==="thinking"&&<div className={styles.thinking}>
    <div className={styles.orbit}><span>✦</span><i/><i/><i/></div>
    <p className={styles.eyebrow}>{say(lang,"AI Travel Council","AI Travel Council")}</p>
    <h1>{say(lang,"Δεν ψάχνω το πιο δημοφιλές. Ψάχνω το σωστό για εσένα.","I am not looking for the most popular. I am looking for the right fit for you.")}</h1>
    <p>{progress||say(lang,"Συνδυάζω προορισμό, πραγματικό stay inventory, απόσταση και travel DNA…","Combining destination fit, real stay inventory, distance and travel DNA…")}</p>
   </div>}

   {phase==="destinations"&&<div className={styles.results}>
    <div className={styles.resultsTop}><div><p className={styles.eyebrow}>{say(lang,"Πρώτα ο τόπος","Destination first")}</p><h1>{say(lang,"3 προορισμοί. Τρεις διαφορετικές εκδοχές της απόδρασής σου.","3 destinations. Three different versions of your escape.")}</h1><p>{summary}</p></div><button type="button" className={styles.ghost} onClick={()=>{setResult(null);setPhase("welcome")}}>{say(lang,"Ξεκίνα ξανά","Start over")}</button></div>
    <div className={styles.destinationDeck}>{solutions.map((s,index)=>{
     const slug=s.recommendation.slug,items=media[slug]??[],image=items.length?items[(frame+index)%items.length].imageUrl:"/api/destination-photo?slug="+encodeURIComponent(slug),name=lang==="en"?s.recommendation.destinationEn:s.recommendation.destination;
     return <article key={slug} className={index===activeIndex?styles.destinationActive:""} onMouseEnter={()=>{setActiveIndex(index);setFrame(0)}} onClick={()=>{setActiveIndex(index);setFrame(0)}}>
      <img src={image} alt={name}/><div className={styles.cardShade}/><div className={styles.cardTop}><span>0{index+1}</span><b>{Math.round(s.combinedScore)}% {say(lang,"FIT","FIT")}</b></div>
      <div className={styles.cardCopy}><small>{s.recommendation.explorationRole?.replaceAll("_"," ")||say(lang,"AI MATCH","AI MATCH")}</small><h2>{name}</h2><p>{s.reasoning.destination}</p><div className={styles.cardFacts}><span>◎ {say(lang,"Destination","Destination")} {Math.round(s.destinationScore)}%</span><span>✦ {say(lang,"inventory ελεγμένο","inventory checked")}</span></div><a href={`/escape/${s.recommendation.slug}?${destinationQs()}`}>{say(lang,"Ζήσε αυτό το ταξίδι","Explore this experience")} <b>→</b></a></div>
     </article>
    })}</div>
    <div className={styles.resultFooter}><span>✦ {say(lang,"real stay inventory ελέγχεται πριν την κατάταξη","real stay inventory is checked before ranking")}</span><span>{say(lang,"Τα καταλύματα ανοίγουν μόνο αφού επιλέξεις προορισμό.","Stays open only after you choose a destination.")}</span></div>
   </div>}
  </section>

  <button className={styles.chatFab} type="button" onClick={()=>setChatOpen(v=>!v)}><span>✦</span><div><b>Travel Agent</b><small>{say(lang,"Ρώτα με οτιδήποτε","Ask me anything")}</small></div></button>
  {chatOpen&&<aside className={styles.chatPanel}>
   <div className={styles.chatHead}><div><span>✦</span><p><b>Holiday Agent</b><small>● {say(lang,"γνωρίζει το ταξίδι σου","knows your trip")}</small></p></div><button type="button" onClick={()=>setChatOpen(false)}>×</button></div>
   <div className={styles.chatBody}>{chat.map((row,index)=><div key={`${row.role}-${index}`} className={row.role==="agent"?styles.agentBubble:styles.userBubble}>{row.text}</div>)}</div>
   <form onSubmit={sendChat}><input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder={say(lang,"π.χ. Δεν θέλω τουριστικό μέρος…","e.g. I do not want somewhere touristy…")}/><button disabled={busy||!chatInput.trim()}>↑</button></form>
  </aside>}
 </main>
}
