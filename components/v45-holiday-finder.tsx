"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import styles from "./v45-holiday-finder.module.css";

type Lang="el"|"en";
type Traveler="solo"|"couple"|"family"|"friends";
type Mood="relax"|"romantic"|"food"|"warmth"|"city"|"nature"|"adventure"|"culture";
type QuestionId="companions"|"outcome"|"social"|"novelty"|"must_have"|"friction";
type Answer={questionId:QuestionId;value:string};
type Profile={travelerType:Traveler;moods:Mood[];pace:"slow"|"balanced"|"full";desiredEnergy:"restore"|"balanced"|"stimulating";socialPreference:"quiet"|"balanced"|"lively";noveltyPreference:"familiar"|"balanced"|"surprise";avoid:"long-travel"|"high-cost"|"crowds"|"none";mustHave:"sea"|"nature"|"culture"|"nightlife"|"none";dnaLabels:string[]};
type Discovery={summary:string;profile:Profile;answered:QuestionId[];nextQuestionId:QuestionId|null;confidence:number;complete:boolean};
type Media={imageUrl:string;sourceUrl:string;title:string;description?:string;license:string;attribution:string};
type Solution={rank:number;score:number;destination:{slug:string;name:string;nameEn:string;tags:string[]};stay:{sourceProductId:string;propertyName:string;trackingUrl:string;imageUrl:string|null;price:number|null;currency:string|null;distanceKm:number|null;availability:string|null;semanticScore:number;valueScore:number};matchedSignals:string[];reason:string};
type SolveResult={ok:boolean;version:number;intentSource:string;intentSummary:string;inventoryChecked:number;solutionCount:number;solutions:Solution[]};
type Phase="welcome"|"clarify"|"setup"|"thinking"|"results";
type SearchWindow={start:string;end:string;shiftDays:number};

const DAY=86_400_000;
const say=(l:Lang,el:string,en:string)=>l==="el"?el:en;
const iso=(d:Date)=>d.toISOString().slice(0,10);
const shiftIso=(value:string,days:number)=>iso(new Date(Date.parse(`${value}T00:00:00Z`)+days*DAY));
function nextFriday(){const now=new Date(),d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())),delta=(5-d.getUTCDay()+7)%7||7;return new Date(d.getTime()+delta*DAY)}
function shortDate(value:string,lang:Lang){try{return new Intl.DateTimeFormat(lang==="el"?"el-GR":"en-GB",{day:"numeric",month:"short"}).format(new Date(`${value}T12:00:00Z`))}catch{return value}}

const questions:Record<QuestionId,{el:string;en:string;choices:{v:string;el:string;en:string}[]}>= {
 companions:{el:"Με ποιον θα μοιραστείς αυτό το ταξίδι;",en:"Who are you sharing this trip with?",choices:[{v:"solo",el:"Μόνος/η",en:"Solo"},{v:"couple",el:"Ζευγάρι",en:"Couple"},{v:"family",el:"Οικογένεια",en:"Family"},{v:"friends",el:"Φίλοι",en:"Friends"}]},
 outcome:{el:"Αν το ταξίδι πετύχει, πώς θέλεις να γυρίσεις;",en:"If the trip works, how do you want to come back?",choices:[{v:"rest reset quiet",el:"Ξεκουρασμένος/η",en:"Reset"},{v:"reconnect romantic",el:"Πιο κοντά",en:"Reconnected"},{v:"stimulating adventure energy",el:"Γεμάτος/η ενέργεια",en:"Energised"},{v:"culture inspiration",el:"Με νέες εικόνες",en:"Inspired"}]},
 social:{el:"Πόση ενέργεια θέλεις γύρω σου;",en:"How much energy do you want around you?",choices:[{v:"quiet",el:"Ήσυχα",en:"Quiet"},{v:"balanced",el:"Ισορροπία",en:"Balanced"},{v:"lively nightlife",el:"Ζωντανά",en:"Lively"}]},
 novelty:{el:"Να παίξω στα σίγουρα ή να σε εκπλήξω;",en:"Play it safe or surprise you?",choices:[{v:"familiar",el:"Στα σίγουρα",en:"Familiar"},{v:"balanced",el:"Λίγο απ’ όλα",en:"Balanced"},{v:"surprise different",el:"Έκπληξέ με",en:"Surprise me"}]},
 must_have:{el:"Ποιο είναι το ένα πράγμα που δεν διαπραγματεύεσαι;",en:"What is the one non-negotiable?",choices:[{v:"sea beach",el:"Θάλασσα",en:"Sea"},{v:"nature mountain",el:"Φύση",en:"Nature"},{v:"culture history",el:"Πολιτισμός",en:"Culture"},{v:"nightlife",el:"Βραδινή ζωή",en:"Nightlife"},{v:"none",el:"Κανένα",en:"None"}]},
 friction:{el:"Τι πρέπει να σου γλιτώσω;",en:"What should I save you from?",choices:[{v:"short easy no long travel",el:"Ταλαιπωρία",en:"Travel friction"},{v:"budget cheap",el:"Υψηλό κόστος",en:"High cost"},{v:"avoid crowds",el:"Πολυκοσμία",en:"Crowds"},{v:"none",el:"Τίποτα συγκεκριμένο",en:"Nothing specific"}]}
};

export function V45HolidayFinder({lang="el"}:{lang?:Lang}){
 const friday=useMemo(()=>nextFriday(),[]);
 const[phase,setPhase]=useState<Phase>("welcome");
 const[need,setNeed]=useState("");
 const[answers,setAnswers]=useState<Answer[]>([]);
 const[profile,setProfile]=useState<Profile|null>(null);
 const[summary,setSummary]=useState("");
 const[nextQuestion,setNextQuestion]=useState<QuestionId|null>(null);
 const[start,setStart]=useState(iso(friday));
 const[end,setEnd]=useState(iso(new Date(friday.getTime()+3*DAY)));
 const[budget,setBudget]=useState(900);
 const[origin,setOrigin]=useState(say(lang,"Αθήνα","Athens"));
 const[traveler,setTraveler]=useState<Traveler>("couple");
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState<string|null>(null);
 const[result,setResult]=useState<SolveResult|null>(null);
 const[resultWindow,setResultWindow]=useState<SearchWindow|null>(null);
 const[recoveryNote,setRecoveryNote]=useState<string|null>(null);
 const[searchStep,setSearchStep]=useState(0);
 const[heroMedia,setHeroMedia]=useState<Media[]>([]);
 const[frame,setFrame]=useState(0);
 const[activeIndex,setActiveIndex]=useState(0);
 const solutions=result?.solutions.slice(0,3)??[];
 const active=solutions[activeIndex]??solutions[0]??null;
 const q=nextQuestion?questions[nextQuestion]:null;
 const preview=active?.stay.imageUrl||heroMedia[frame%Math.max(1,heroMedia.length)]?.imageUrl||"";
 const secondary=heroMedia[(frame+1)%Math.max(1,heroMedia.length)]?.imageUrl||preview;
 const tertiary=heroMedia[(frame+2)%Math.max(1,heroMedia.length)]?.imageUrl||secondary;
 const destinationHref=lang==="en"?"/en/destinations":"/proorismoi";
 const guidesHref=lang==="en"?"/en/guides":"/guides";
 const howHref=lang==="en"?"/en/how-ai-works":"/how-ai-works";
 const languageHref=lang==="en"?"/":"/en";
 const prompts=[
  {label:say(lang,"Ήσυχο 3ήμερο για δύο","Quiet 3-night escape for two"),value:say(lang,"Είμαστε ζευγάρι και θέλουμε τρεις ήσυχες νύχτες, καλό φαγητό, όμορφο κατάλυμα και όσο γίνεται λιγότερη ταλαιπωρία","We are a couple looking for three quiet nights, great food, a beautiful stay and as little travel friction as possible")},
  {label:say(lang,"Οικογένεια κοντά στη θάλασσα","Family by the sea"),value:say(lang,"Θέλω οικογενειακές διακοπές κοντά στη θάλασσα, πρακτικό κατάλυμα, εύκολη πρόσβαση και καλή σχέση αξίας","I want a family holiday near the sea, a practical stay, easy access and good value")},
  {label:say(lang,"Nature reset","Nature reset"),value:say(lang,"Χρειάζομαι ένα σύντομο reset με φύση, ησυχία και καλό ξενοδοχείο, χωρίς πολυκοσμία","I need a short reset with nature, quiet and a good hotel, without crowds")}
 ];

 useEffect(()=>{const id=window.setTimeout(()=>{fetch("/api/escape/media?destination=Greece&mode=aerial").then(r=>r.ok?r.json():null).then((p:{items?:Media[]}|null)=>{if(p?.items?.length)setHeroMedia(p.items.slice(0,6))}).catch(()=>null)},180);return()=>window.clearTimeout(id)},[]);
 useEffect(()=>{const id=window.setInterval(()=>setFrame(v=>v+1),8500);return()=>window.clearInterval(id)},[]);

 async function discover(nextAnswers=answers){
  const r=await fetch("/api/escape/discovery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:lang,initialText:need.trim(),answers:nextAnswers})});
  if(!r.ok)throw new Error("discovery");
  const data=await r.json() as Discovery;
  setProfile(data.profile);setSummary(data.summary);setNextQuestion(data.nextQuestionId);setTraveler(data.profile.travelerType);return data;
 }

 async function begin(e:FormEvent){
  e.preventDefault();
  if(need.trim().length<8){setError(say(lang,"Πες μου με μία πρόταση πώς θέλεις να νιώσεις σε αυτές τις διακοπές.","Tell me in one sentence how you want this holiday to feel."));return}
  setBusy(true);setError(null);
  try{const d=await discover();setPhase(d.complete||!d.nextQuestionId?"setup":"clarify")}
  catch{setError(say(lang,"Πες το όπως θα το έλεγες σε έναν καλό travel agent — φυσικά, χωρίς φίλτρα.","Say it as you would tell a good travel agent — naturally, without filters."))}
  finally{setBusy(false)}
 }

 async function answer(value:string){
  if(!nextQuestion)return;
  const updated=[...answers.filter(a=>a.questionId!==nextQuestion),{questionId:nextQuestion,value}];
  setAnswers(updated);setBusy(true);setError(null);
  try{const d=await discover(updated);if(updated.length>=2||d.complete||!d.nextQuestionId)setPhase("setup")}
  catch{setPhase("setup")}
  finally{setBusy(false)}
 }

 function quickWeekend(){const f=nextFriday();setStart(iso(f));setEnd(iso(new Date(f.getTime()+3*DAY)))}

 function buildTrip(p:Profile,startDate:string,endDate:string){
  const nights=Math.max(1,Math.round((Date.parse(`${endDate}T00:00:00Z`)-Date.parse(`${startDate}T00:00:00Z`))/DAY));
  return {origin,startDate,endDate,month:"flexible",nights,budget,moods:p.moods,travelerType:traveler,language:lang,distancePreference:"any",pace:p.pace,hotelStyle:"any",avoid:p.avoid,entryMode:"idea",groupSize:traveler==="solo"?1:traveler==="couple"?2:4,desiredEnergy:p.desiredEnergy,socialPreference:p.socialPreference,noveltyPreference:p.noveltyPreference,mustHave:p.mustHave,dateFlexibility:"few-days",transportMode:"any",stayLocationPreference:"balanced",tripText:[need,summary].filter(Boolean).join(". ").slice(0,1200)};
 }

 async function requestSolve(p:Profile,startDate:string,endDate:string){
  try{
   const r=await fetch("/api/escape/solve-v42",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(buildTrip(p,startDate,endDate))});
   if(!r.ok)return null;
   const data=await r.json() as SolveResult;
   return data?.solutions?.length?data:null;
  }catch{return null}
 }

 async function findNearbyWindows(p:Profile,shifts:number[]){
  const attempts=await Promise.all(shifts.map(async shiftDays=>{
   const shiftedStart=shiftIso(start,shiftDays),shiftedEnd=shiftIso(end,shiftDays);
   const data=await requestSolve(p,shiftedStart,shiftedEnd);
   return {data,start:shiftedStart,end:shiftedEnd,shiftDays};
  }));
  return attempts.filter((x):x is {data:SolveResult;start:string;end:string;shiftDays:number}=>Boolean(x.data?.solutions?.length)).sort((a,b)=>b.data.solutions.length-a.data.solutions.length||b.data.inventoryChecked-a.data.inventoryChecked)[0]??null;
 }

 async function solve(){
  const learned=profile??(await discover());
  const p="profile" in learned?learned.profile:learned;
  if(!p)return;
  setPhase("thinking");setBusy(true);setError(null);setResult(null);setRecoveryNote(null);setResultWindow(null);setSearchStep(0);
  try{
   const exact=await requestSolve(p,start,end);
   if(exact){setResult(exact);setResultWindow({start,end,shiftDays:0});setActiveIndex(0);setPhase("results");return}
   setSearchStep(1);
   const nearby=await findNearbyWindows(p,[7,14,21,28]);
   if(nearby){
    setResult(nearby.data);setResultWindow({start:nearby.start,end:nearby.end,shiftDays:nearby.shiftDays});setActiveIndex(0);
    setRecoveryNote(say(lang,`Δεν σε έστειλα πίσω στα φίλτρα. Δεν υπήρχε αρκετό verified inventory στις αρχικές ημερομηνίες, οπότε βρήκα το κοντινότερο δυνατό παράθυρο ${shortDate(nearby.start,lang)}–${shortDate(nearby.end,lang)}.`,`I did not send you back to filters. There was not enough verified inventory for the original dates, so I found the closest workable window: ${shortDate(nearby.start,lang)}–${shortDate(nearby.end,lang)}.`));
    setPhase("results");return;
   }
   setSearchStep(2);setPhase("results");
   setError(say(lang,"Έλεγξα τις αρχικές ημερομηνίες και τέσσερα κοντινά παράθυρα στις επόμενες εβδομάδες. Δεν υπάρχει αρκετό verified inventory για να σου δείξω έντιμη πρόταση — δεν θα γεμίσω την οθόνη με ψεύτικα matches.","I checked the original dates and four nearby windows over the following weeks. There is not enough verified inventory for an honest recommendation — I will not fill the screen with fake matches."));
  }finally{setBusy(false)}
 }

 async function broadenSearch(){
  const p=profile??(await discover()).profile;
  setPhase("thinking");setBusy(true);setError(null);setSearchStep(2);
  try{
   const wider=await findNearbyWindows(p,[35,42,49,56]);
   if(wider){setResult(wider.data);setResultWindow({start:wider.start,end:wider.end,shiftDays:wider.shiftDays});setActiveIndex(0);setRecoveryNote(say(lang,`Άνοιξα αυτόματα τον ορίζοντα και βρήκα verified επιλογές για ${shortDate(wider.start,lang)}–${shortDate(wider.end,lang)}.`,`I widened the horizon automatically and found verified options for ${shortDate(wider.start,lang)}–${shortDate(wider.end,lang)}.`));setPhase("results");return}
   setPhase("results");setError(say(lang,"Δεν υπάρχει επαρκές verified offer inventory ούτε στον επόμενο μήνα. Κρατάω το brief σου — άλλαξε μόνο ένα πράγμα όταν θέλεις και ξαναδοκιμάζω.","There is not enough verified offer inventory even across the next month. I am keeping your brief — change only one thing when you want and I will retry."));
  }finally{setBusy(false)}
 }

 function destinationUrl(s:Solution){const window=resultWindow??{start,end,shiftDays:0};return `${lang==="en"?"/en/destinations/":"/proorismoi/"}${s.destination.slug}?start=${window.start}&end=${window.end}&budget=${budget}&origin=${encodeURIComponent(origin)}`}
 function priceLabel(s:Solution){if(s.stay.price==null||s.stay.price<=0)return say(lang,"Τιμή στον πάροχο","Price at provider");const n=new Intl.NumberFormat(lang==="el"?"el-GR":"en-GB",{maximumFractionDigits:0}).format(s.stay.price);return s.stay.currency?`${n} ${s.stay.currency}`:`${n} · feed price`}

 return <main className={styles.shell}>
  <header className={styles.nav}>
   <a className={styles.brand} href={lang==="en"?"/en":"/"}><span className={styles.brandMark}>✦</span><div><b>TravelAI</b><small>Holiday Finder</small></div></a>
   <nav className={styles.navLinks}><a href={destinationHref}>{say(lang,"Προορισμοί","Destinations")}</a><a href={guidesHref}>{say(lang,"Εμπειρίες","Experiences")}</a><a href={howHref}>{say(lang,"Πώς δουλεύει","How it works")}</a></nav>
   <div className={styles.navActions}><a className={styles.lang} href={languageHref}>{lang==="en"?"EL":"EN"}</a><span className={styles.live}><i/>Travel Agent</span></div>
  </header>

  <section className={styles.stage}>
   <div className={styles.workspace} data-phase={phase}>
    <section className={styles.chatPane}>
     <div className={styles.agentBar}><span className={styles.agentAvatar}>AI</span><div><b>{say(lang,"Holiday Agent","Holiday Agent")}</b><small>{say(lang,"μαθαίνει · ψάχνει · εξηγεί","learns · searches · explains")}</small></div><i/></div>

     {phase==="welcome"&&<div className={styles.panelIn}>
      <p className={styles.kicker}>AI HOLIDAY FINDER · REAL OFFER PRODUCTS</p>
      <h1>{say(lang,"Πες μου πώς θέλεις να νιώσεις. Τα υπόλοιπα θα τα ψάξω εγώ.","Tell me how you want to feel. I’ll search the rest.")}</h1>
      <p className={styles.lead}>{say(lang,"Όχι άλλο ψάξιμο σε tabs. Περιέγραψε τις διακοπές που έχεις στο μυαλό σου και θα μετατρέψω το brief σε πραγματικά offer-backed matches.","No more tab juggling. Describe the holiday in your head and I’ll turn the brief into real offer-backed matches.")}</p>
      <form className={styles.composer} onSubmit={begin}>
       <textarea autoFocus value={need} onChange={e=>setNeed(e.target.value)} placeholder={say(lang,"π.χ. Είμαστε κουρασμένοι, θέλουμε 4 μέρες με φύση, ωραίο φαγητό και καθόλου τρέξιμο…","e.g. We are tired and want four days of nature, great food and zero rushing…")}/>
       <div className={styles.composerBottom}><span>{say(lang,"Γράψε όπως μιλάς","Write naturally")}</span><button disabled={busy}>{busy?say(lang,"Καταλαβαίνω…","Understanding…"):say(lang,"Βρες το ταξίδι μου","Find my trip")}<b>↗</b></button></div>
      </form>
      <div className={styles.promptRow}>{prompts.map(p=><button key={p.label} type="button" onClick={()=>setNeed(p.value)}>{p.label}<span>＋</span></button>)}</div>
      <div className={styles.trust}><span>Real inventory</span><span>Product-aware matching</span><span>No fake urgency</span></div>
      {error&&<div className={styles.error}>{error}</div>}
     </div>}

     {phase==="clarify"&&q&&<div className={styles.panelIn}>
      <p className={styles.microLabel}>{say(lang,"Μία ερώτηση ακόμη","One more useful question")}</p>
      <div className={styles.userBubble}>{need}</div>
      <div className={styles.agentBubble}><span>✦</span><p>{summary||say(lang,"Έχω το βασικό brief. Θέλω μόνο μία λεπτομέρεια που αλλάζει πραγματικά το αποτέλεσμα.","I have the core brief. I only need one detail that genuinely changes the result.")}</p></div>
      <h2>{say(lang,q.el,q.en)}</h2>
      <div className={styles.choiceGrid}>{q.choices.map(c=><button key={c.v} type="button" disabled={busy} onClick={()=>answer(c.v)}><span>{say(lang,c.el,c.en)}</span><i>→</i></button>)}</div>
      <button className={styles.textButton} type="button" onClick={()=>answer("none")}>{say(lang,"Δεν με νοιάζει — αποφάσισε εσύ","No preference — you decide")}</button>
     </div>}

     {phase==="setup"&&<div className={styles.panelIn}>
      <p className={styles.microLabel}>{say(lang,"Το brief είναι έτοιμο","Your brief is ready")}</p>
      <div className={styles.agentBubble}><span>✦</span><p>{summary||say(lang,"Κατάλαβα τι ψάχνεις. Δεν χρειάζομαι άλλη ανάκριση — μόνο το πραγματικό πλαίσιο για να ελέγξω offers.","I understand what you want. No more interrogation — I only need the real-world frame to check offers.")}</p></div>
      <h2>{say(lang,"Δώσε μου το πλαίσιο. Θα κάνω εγώ το matching.","Give me the frame. I’ll do the matching.")}</h2>
      <div className={styles.tripGrid}>
       <label><span>{say(lang,"Από","From")}</span><input value={origin} onChange={e=>setOrigin(e.target.value)}/></label>
       <label><span>{say(lang,"Αναχώρηση","Leave")}</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
       <label><span>{say(lang,"Επιστροφή","Return")}</span><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label>
       <label><span>{say(lang,"Συνολικό budget","Total budget")}</span><div className={styles.money}><b>€</b><input type="number" min={150} step={50} value={budget} onChange={e=>setBudget(Number(e.target.value)||0)}/></div></label>
      </div>
      <div className={styles.travellerRow}><span>{say(lang,"Ποιοι πάτε;","Who’s going?")}</span><div>{(["solo","couple","family","friends"] as Traveler[]).map(t=><button key={t} type="button" className={traveler===t?styles.selectedChip:""} onClick={()=>setTraveler(t)}>{say(lang,t==="solo"?"Μόνος/η":t==="couple"?"Ζευγάρι":t==="family"?"Οικογένεια":"Φίλοι",t==="solo"?"Solo":t==="couple"?"Couple":t==="family"?"Family":"Friends")}</button>)}</div></div>
      <div className={styles.setupActions}><button className={styles.secondary} type="button" onClick={quickWeekend}>{say(lang,"Βάλε επόμενο weekend","Use next weekend")}</button><button className={styles.primary} type="button" disabled={busy||!start||!end||budget<=0} onClick={solve}>{say(lang,"Βρες τα 3 καλύτερα matches","Find my best matches")}<span>→</span></button></div>
      <p className={styles.recoveryPromise}>{say(lang,"Αν δεν υπάρχει exact match, δεν θα σε πετάξω πίσω στα φίλτρα — θα δοκιμάσω αυτόματα κοντινά verified παράθυρα.","If there is no exact match, I won’t throw you back to filters — I’ll automatically test nearby verified windows.")}</p>
     </div>}

     {phase==="thinking"&&<div className={styles.panelIn}>
      <p className={styles.microLabel}>{searchStep===0?say(lang,"Exact search","Exact search"):searchStep===1?say(lang,"Smart recovery","Smart recovery"):say(lang,"Wider recovery","Wider recovery")}</p>
      <h2>{searchStep===0?say(lang,"Ψάχνω το δικό σου ταξίδι — όχι έναν δημοφιλή προορισμό.","I’m searching for your trip — not a popular destination."):say(lang,"Δεν βγήκε το πρώτο παράθυρο. Συνεχίζω μόνος μου.","The first window did not work. I’m continuing automatically.")}</h2>
      <div className={styles.scanSteps}>
       <div className={styles.done}><span>✓</span><p><b>{say(lang,"Intent understood","Intent understood")}</b><small>{say(lang,"mood, must-have, friction","mood, must-have, friction")}</small></p></div>
       <div className={styles.activeStep}><span>⌁</span><p><b>{say(lang,"Scanning real offer products","Scanning real offer products")}</b><small>{say(lang,"dates, stay fit, value, evidence","dates, stay fit, value, evidence")}</small></p></div>
       <div><span>3</span><p><b>{say(lang,"Ranking only defensible matches","Ranking only defensible matches")}</b><small>{say(lang,"fit before commercial signal","fit before commercial signal")}</small></p></div>
      </div>
      <div className={styles.thinkingNote}><i/><span>{say(lang,"AI + REAL INVENTORY · Το commission δεν ανεβάζει το traveller fit.","AI + REAL INVENTORY · Commission never raises traveller fit.")}</span></div>
     </div>}

     {phase==="results"&&<div className={styles.panelIn}>
      <p className={styles.microLabel}>{solutions.length?say(lang,"Shortlist ready","Shortlist ready"):say(lang,"Truth before filler","Truth before filler")}</p>
      {solutions.length?<>
       <h2>{say(lang,`${solutions.length} πραγματικά holiday matches. Κανένα filler.`,`${solutions.length} real holiday matches. No filler.`)}</h2>
       <div className={styles.agentBubble}><span>✦</span><p>{recoveryNote||say(lang,`Έλεγξα ${result?.inventoryChecked??0} offer rows και κράτησα μόνο τις επιλογές που στέκονται απέναντι στο brief σου.`,`I checked ${result?.inventoryChecked??0} offer rows and kept only the choices that stand up to your brief.`)}</p></div>
       {active&&<div className={styles.activeSummary}><small>{say(lang,"Η επιλογή που κοιτάς τώρα","You are viewing")}</small><b>{active.destination.name}</b><span>{active.stay.propertyName}</span></div>}
       <button className={styles.textButton} type="button" onClick={()=>setPhase("setup")}>{say(lang,"Αλλαγή πλαισίου","Adjust trip frame")}</button>
      </>:<>
       <h2>{say(lang,"Δεν θα εφεύρω διακοπές για να γεμίσω τρεις κάρτες.","I will not invent holidays just to fill three cards.")}</h2>
       {error&&<div className={styles.agentBubble}><span>✦</span><p>{error}</p></div>}
       <div className={styles.setupActions}><button className={styles.primary} type="button" disabled={busy} onClick={broadenSearch}>{say(lang,"Ψάξε αυτόματα τον επόμενο μήνα","Search the next month automatically")}<span>→</span></button><button className={styles.secondary} type="button" onClick={()=>setPhase("setup")}>{say(lang,"Άλλαξε ένα στοιχείο","Change one detail")}</button></div>
      </>}
     </div>}
    </section>

    <section className={styles.canvas} aria-live="polite" aria-busy={phase==="thinking"}>
     {phase==="results"&&solutions.length>0?<div className={styles.resultsCanvas}>
      <div className={styles.canvasHead}><div><span>Destination reveal</span><h3>{say(lang,"Τα matches σου, πάνω σε πραγματικά offers.","Your matches, grounded in real offers.")}</h3></div><p>{resultWindow&&resultWindow.shiftDays>0?`${shortDate(resultWindow.start,lang)} — ${shortDate(resultWindow.end,lang)}`:say(lang,"Ακριβείς ημερομηνίες","Exact dates")}</p></div>
      <div className={styles.resultGrid}>{solutions.map((s,i)=><article key={`${s.destination.slug}-${s.stay.sourceProductId}`} className={`${styles.resultCard} ${i===activeIndex?styles.activeCard:""}`} onMouseEnter={()=>setActiveIndex(i)} onFocusCapture={()=>setActiveIndex(i)}>
       <div className={styles.resultImage} style={s.stay.imageUrl?{backgroundImage:`url(${s.stay.imageUrl})`}:undefined}><span className={styles.rank}>#{s.rank}</span><b className={styles.score}>{Math.round(s.score)}% fit</b></div>
       <div className={styles.resultBody}><div className={styles.resultTop}><div><small>REAL OFFER PRODUCT</small><h4>{s.destination.name}</h4></div><strong>{priceLabel(s)}</strong></div><p className={styles.property}>{s.stay.propertyName}</p><p className={styles.reason}>{s.reason}</p><div className={styles.signalRow}>{s.matchedSignals.slice(0,3).map(x=><span key={x}>{x}</span>)}</div><div className={styles.cardFoot}><span>{s.stay.distanceKm!=null?`${Math.round(s.stay.distanceKm)} km · `:""}{say(lang,"τελικοί όροι στον πάροχο","final terms at provider")}</span><a href={destinationUrl(s)}>{say(lang,"Δες γιατί ταιριάζει","See why it fits")} <b>↗</b></a></div></div>
      </article>)}</div>
     </div>:phase==="thinking"?<div className={styles.scanCanvas} style={preview?{backgroundImage:`linear-gradient(rgba(6,45,50,.25),rgba(6,45,50,.25)),url(${preview})`}:undefined}>
      <div className={styles.scanOverlay}/><div className={styles.scanLine}/><div className={styles.scanCard}><span className={styles.scannerDot}/><small>{say(lang,"LIVE OFFER MATCHING","LIVE OFFER MATCHING")}</small><h3>{searchStep===0?say(lang,"Συνδέω το brief σου με πραγματικό inventory.","Connecting your brief to real inventory."):say(lang,"Το exact δεν έφτανε. Δοκιμάζω κοντινά παράθυρα.","Exact was not enough. Testing nearby windows.")}</h3><div className={styles.skeleton}><i/><i/><i/></div></div>
     </div>:<div className={styles.discoveryCanvas}>
      <div className={styles.canvasTitle}><span>LIVE MATCHING CANVAS</span><h3>{phase==="welcome"?say(lang,"Το ταξίδι εμφανίζεται καθώς ο agent σε καταλαβαίνει.","Your trip takes shape as the agent understands you."):say(lang,"Το brief σου ήδη μετατρέπεται σε match profile.","Your brief is already becoming a match profile.")}</h3></div>
      <div className={styles.mediaStage}>
       <div className={styles.mediaPrimary} style={preview?{backgroundImage:`url(${preview})`}:undefined}><span>{say(lang,"Εμπειρία","Experience")}</span><strong>{say(lang,"όχι απλώς προορισμός","not just a destination")}</strong></div>
       <div className={styles.mediaFloatOne} style={secondary?{backgroundImage:`url(${secondary})`}:undefined}><span>{say(lang,"Stay fit","Stay fit")}</span></div>
       <div className={styles.mediaFloatTwo} style={tertiary?{backgroundImage:`url(${tertiary})`}:undefined}><span>{say(lang,"Real inventory","Real inventory")}</span></div>
       <div className={styles.matchPreview}><small>TRAVEL INTELLIGENCE</small><div><span>01</span><p><b>{say(lang,"Καταλαβαίνω","Understand")}</b><small>intent</small></p></div><div><span>02</span><p><b>{say(lang,"Σκανάρω","Scan")}</b><small>offers</small></p></div><div><span>03</span><p><b>{say(lang,"Εξηγώ","Explain")}</b><small>fit</small></p></div></div>
      </div>
      <div className={styles.canvasProof}><span>AI + REAL INVENTORY</span><p>{say(lang,"Ο agent μπορεί να εκπλαγεί από το inventory. Δεν μπορεί να αγνοήσει το brief σου.","The agent may be surprised by inventory. It cannot ignore your brief.")}</p></div>
     </div>}
    </section>
   </div>
  </section>
 </main>
}
