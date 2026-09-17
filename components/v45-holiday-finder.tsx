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

const DAY=86_400_000;
const say=(l:Lang,el:string,en:string)=>l==="el"?el:en;
const iso=(d:Date)=>d.toISOString().slice(0,10);
function nextFriday(){const now=new Date(),d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())),delta=(5-d.getUTCDay()+7)%7||7;return new Date(d.getTime()+delta*DAY)}

const questions:Record<QuestionId,{el:string;en:string;choices:{v:string;el:string;en:string}[]}>= {
 companions:{el:"Με ποιον ταξιδεύεις;",en:"Who are you travelling with?",choices:[{v:"solo",el:"Μόνος/η",en:"Solo"},{v:"couple",el:"Ζευγάρι",en:"Couple"},{v:"family",el:"Οικογένεια",en:"Family"},{v:"friends",el:"Φίλοι",en:"Friends"}]},
 outcome:{el:"Τι θέλεις να σου αφήσει αυτό το ταξίδι;",en:"What should this trip give you?",choices:[{v:"rest reset quiet",el:"Ξεκούραση",en:"Reset"},{v:"reconnect romantic",el:"Σύνδεση",en:"Reconnect"},{v:"stimulating adventure energy",el:"Ενέργεια",en:"Energy"},{v:"culture inspiration",el:"Έμπνευση",en:"Inspiration"}]},
 social:{el:"Πόσο ζωντανά το θέλεις;",en:"How lively should it feel?",choices:[{v:"quiet",el:"Ήσυχα",en:"Quiet"},{v:"balanced",el:"Ισορροπημένα",en:"Balanced"},{v:"lively nightlife",el:"Ζωντανά",en:"Lively"}]},
 novelty:{el:"Σίγουρη επιλογή ή κάτι που δεν θα σκεφτόσουν μόνος σου;",en:"Familiar or something you would not have picked yourself?",choices:[{v:"familiar",el:"Στα σίγουρα",en:"Familiar"},{v:"balanced",el:"Ισορροπία",en:"Balanced"},{v:"surprise different",el:"Έκπληξέ με",en:"Surprise me"}]},
 must_have:{el:"Ποιο είναι το ένα must-have;",en:"What is the one must-have?",choices:[{v:"sea beach",el:"Θάλασσα",en:"Sea"},{v:"nature mountain",el:"Φύση",en:"Nature"},{v:"culture history",el:"Πολιτισμός",en:"Culture"},{v:"nightlife",el:"Βραδινή ζωή",en:"Nightlife"},{v:"none",el:"Δεν έχω",en:"None"}]},
 friction:{el:"Τι θέλεις οπωσδήποτε να αποφύγεις;",en:"What do you definitely want to avoid?",choices:[{v:"short easy no long travel",el:"Μεγάλη ταλαιπωρία",en:"Long travel"},{v:"budget cheap",el:"Υψηλό κόστος",en:"High cost"},{v:"avoid crowds",el:"Πολυκοσμία",en:"Crowds"},{v:"none",el:"Τίποτα συγκεκριμένο",en:"Nothing specific"}]}
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
 const[heroMedia,setHeroMedia]=useState<Media[]>([]);
 const[frame,setFrame]=useState(0);
 const solutions=result?.solutions.slice(0,3)??[];
 const q=nextQuestion?questions[nextQuestion]:null;
 const preview=heroMedia[frame%Math.max(1,heroMedia.length)]?.imageUrl||"";
 const destinationHref=lang==="en"?"/en/destinations":"/proorismoi";
 const guidesHref=lang==="en"?"/en/guides":"/guides";
 const howHref=lang==="en"?"/en/how-ai-works":"/how-ai-works";
 const languageHref=lang==="en"?"/":"/en";
 const prompts=[
  {label:say(lang,"Ζευγάρι · 3 βράδια","Couple · 3 nights"),value:say(lang,"Είμαστε ζευγάρι και θέλουμε 3 βράδια για χαλάρωση, ωραίο φαγητό και όμορφο κατάλυμα χωρίς πολλή ταλαιπωρία","We are a couple looking for 3 nights of relaxation, great food and a beautiful stay without much travel friction")},
  {label:say(lang,"Οικογένεια · θάλασσα","Family · sea"),value:say(lang,"Θέλω οικογενειακές διακοπές κοντά στη θάλασσα, πρακτικό κατάλυμα και καλή σχέση αξίας","I want a family holiday near the sea, a practical stay and good value")},
  {label:say(lang,"Weekend reset","Weekend reset"),value:say(lang,"Χρειάζομαι ένα σύντομο weekend reset με φύση, ησυχία και καλό ξενοδοχείο, χωρίς πολυκοσμία","I need a short weekend reset with nature, quiet and a good hotel, without crowds")}
 ];

 useEffect(()=>{const id=window.setTimeout(()=>{fetch("/api/escape/media?destination=Greece&mode=aerial").then(r=>r.ok?r.json():null).then((p:{items?:Media[]}|null)=>{if(p?.items?.length)setHeroMedia(p.items.slice(0,4))}).catch(()=>null)},250);return()=>window.clearTimeout(id)},[]);
 useEffect(()=>{const id=window.setInterval(()=>setFrame(v=>v+1),10000);return()=>window.clearInterval(id)},[]);

 async function discover(nextAnswers=answers){
  const r=await fetch("/api/escape/discovery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:lang,initialText:need.trim(),answers:nextAnswers})});
  if(!r.ok)throw new Error("discovery");
  const data=await r.json() as Discovery;
  setProfile(data.profile);setSummary(data.summary);setNextQuestion(data.nextQuestionId);setTraveler(data.profile.travelerType);return data;
 }
 async function begin(e:FormEvent){e.preventDefault();if(need.trim().length<8){setError(say(lang,"Πες μου με μία πρόταση τι θέλεις από αυτές τις διακοπές.","Tell me in one sentence what you want from this holiday."));return}setBusy(true);setError(null);try{const d=await discover();setPhase(d.complete||!d.nextQuestionId?"setup":"clarify")}catch{setError(say(lang,"Γράψε το όπως θα το έλεγες σε έναν καλό travel agent.","Write it as you would tell a good travel agent."))}finally{setBusy(false)}}
 async function answer(value:string){if(!nextQuestion)return;const updated=[...answers.filter(a=>a.questionId!==nextQuestion),{questionId:nextQuestion,value}];setAnswers(updated);setBusy(true);try{const d=await discover(updated);if(updated.length>=2||d.complete||!d.nextQuestionId)setPhase("setup")}catch{setPhase("setup")}finally{setBusy(false)}}
 function quickWeekend(){const f=nextFriday();setStart(iso(f));setEnd(iso(new Date(f.getTime()+3*DAY)))}
 async function solve(){
  const learned=profile??(await discover());const p="profile" in learned?learned.profile:learned;if(!p)return;
  const nights=Math.max(1,Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/DAY));
  const trip={origin,startDate:start,endDate:end,month:"flexible",nights,budget,moods:p.moods,travelerType:traveler,language:lang,distancePreference:"any",pace:p.pace,hotelStyle:"any",avoid:p.avoid,entryMode:"idea",groupSize:traveler==="solo"?1:traveler==="couple"?2:4,desiredEnergy:p.desiredEnergy,socialPreference:p.socialPreference,noveltyPreference:p.noveltyPreference,mustHave:p.mustHave,dateFlexibility:"few-days",transportMode:"any",stayLocationPreference:"balanced",tripText:[need,summary].filter(Boolean).join(". ").slice(0,1200)};
  setPhase("thinking");setBusy(true);setError(null);
  try{const r=await fetch("/api/escape/solve-v42",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(trip)});if(!r.ok)throw new Error();const data=await r.json() as SolveResult;if(!data.solutions?.length)throw new Error();setResult(data);setPhase("results")}catch{setPhase("setup");setError(say(lang,"Δεν βρήκα αρκετά ασφαλή offer matches. Άλλαξε λίγο ημερομηνίες ή budget και ξαναψάχνω.","I did not find enough safe offer matches. Adjust dates or budget slightly and I will search again."))}finally{setBusy(false)}
 }
 function destinationUrl(s:Solution){return `${lang==="en"?"/en/destinations/":"/proorismoi/"}${s.destination.slug}?start=${start}&end=${end}&budget=${budget}&origin=${encodeURIComponent(origin)}`}

 return <main className={styles.shell}>
  <header className={styles.nav}>
   <a className={styles.brand} href={lang==="en"?"/en":"/"}><span>✦</span><div><b>TravelAI</b><small>Holiday Finder</small></div></a>
   <nav className={styles.navLinks}><a href={destinationHref}>{say(lang,"Προορισμοί","Destinations")}</a><a href={guidesHref}>{say(lang,"Εμπειρίες","Experiences")}</a><a href={howHref}>{say(lang,"Πώς δουλεύει","How it works")}</a></nav>
   <div className={styles.navActions}><a className={styles.lang} href={languageHref}>{lang==="en"?"EL":"EN"}</a><span className={styles.live}><i/>Travel Agent</span></div>
  </header>

  <section className={styles.stage}>
   {phase==="welcome"&&<div className={styles.heroGrid}>
    <section className={styles.heroCopy}>
     <p className={styles.kicker}>AI HOLIDAY FINDER · REAL OFFER PRODUCTS</p>
     <h1>{say(lang,"Πες μου τι διακοπές χρειάζεσαι. Θα βρω τι αξίζει να κλείσεις.","Tell me the holiday you need. I’ll find what is worth booking.")}</h1>
     <p className={styles.lead}>{say(lang,"Ο agent καταλαβαίνει το brief σου, ελέγχει τα πραγματικά offer products μας για τις ημερομηνίες σου και κρατά μόνο όσα ταιριάζουν πραγματικά.","The agent understands your brief, checks our real offer products for your dates and keeps only the options that truly fit.")}</p>
     <form className={styles.composer} onSubmit={begin}>
      <div className={styles.composerTitle}><span>AI</span><div><b>{say(lang,"Μίλα στον Holiday Agent","Talk to your Holiday Agent")}</b><small>{say(lang,"Χωρίς φίλτρα. Πες το φυσικά.","No filter maze. Say it naturally.")}</small></div></div>
      <textarea value={need} onChange={e=>setNeed(e.target.value)} placeholder={say(lang,"π.χ. Θέλουμε 4 μέρες σαν ζευγάρι, κοντά στη θάλασσα, καλό φαγητό και budget έως 900€…","e.g. We want 4 days as a couple, near the sea, great food and a budget up to €900…")}/>
      <button disabled={busy}>{busy?say(lang,"Καταλαβαίνω…","Understanding…"):say(lang,"Βρες μου διακοπές","Find my holiday")}<span>→</span></button>
     </form>
     <div className={styles.promptRow}>{prompts.map(p=><button key={p.label} type="button" onClick={()=>setNeed(p.value)}>{p.label}<span>＋</span></button>)}</div>
     <div className={styles.trust}><span>✓ Real inventory</span><span>✓ Product-aware matching</span><span>✓ No fake urgency</span></div>
     {error&&<div className={styles.error}>{error}</div>}
    </section>

    <aside className={styles.agentCard}>
     <div className={styles.agentHead}><div><span className={styles.avatar}>AI</span><p><b>{say(lang,"Ο Holiday Agent σου","Your Holiday Agent")}</b><small>offer-aware · live inventory</small></p></div><span className={styles.livePill}><i/>LIVE</span></div>
     <div className={styles.media} style={preview?{backgroundImage:`url(${preview})`}:undefined}><div><small>{say(lang,"Από την ανάγκη σου","From your need")}</small><strong>{say(lang,"σε πραγματικό offer που μπορείς να εξετάσεις","to a real offer you can evaluate")}</strong></div></div>
     <div className={styles.flow}><div><span>1</span><p><b>{say(lang,"Καταλαβαίνω","Understand")}</b><small>mood + constraints</small></p></div><div><span>2</span><p><b>{say(lang,"Σκανάρω offers","Scan offers")}</b><small>dates + stay + value</small></p></div><div><span>3</span><p><b>{say(lang,"Κρατάω 3","Keep 3")}</b><small>fit + trade-offs</small></p></div></div>
     <div className={styles.truthBox}><b>AI + REAL INVENTORY</b><p>{say(lang,"Το commission δεν ανεβάζει μια επιλογή αν δεν ταιριάζει στον ταξιδιώτη.","Commission cannot lift an option that does not fit the traveler.")}</p></div>
    </aside>
   </div>}

   {phase==="clarify"&&q&&<div className={styles.panelWrap}>
    <div className={styles.progress}><span style={{width:`${Math.min(66,33+answers.length*33)}%`}}/></div>
    <section className={styles.panel}>
     <div className={styles.agentCue}><span>AI</span><p><small>{say(lang,"Μία ερώτηση ακόμη","One more question")}</small>{summary||say(lang,"Έχω το βασικό brief. Θέλω μόνο αυτό για να κόψω άσχετα offers.","I have the core brief. I only need this to remove irrelevant offers.")}</p></div>
     <p className={styles.kicker}>{say(lang,"Βήμα","Step")} {Math.min(2,answers.length+1)} / 2</p>
     <h2>{say(lang,q.el,q.en)}</h2>
     <div className={styles.choiceGrid}>{q.choices.map(c=><button key={c.v} onClick={()=>answer(c.v)} disabled={busy}>{say(lang,c.el,c.en)}<span>→</span></button>)}</div>
     <button className={styles.skip} onClick={()=>setPhase("setup")}>{say(lang,"Προχώρα με όσα ξέρεις","Continue with what you know")}</button>
    </section>
   </div>}

   {phase==="setup"&&<section className={`${styles.panel} ${styles.setup}`}>
    <p className={styles.kicker}>ΤΟ ΜΟΝΟ ΠΡΑΚΤΙΚΟ ΒΗΜΑ</p>
    <div className={styles.setupTop}><div><h2>{say(lang,"Δώσε μου ημερομηνίες και budget.","Give me dates and budget.")}</h2><p>{say(lang,"Με αυτά μπορώ να ελέγξω πραγματικά offers αντί να σου δώσω απλές ιδέες.","With these I can check real offers instead of giving you generic ideas.")}</p></div><div className={styles.brief}><span>✦</span>{summary||need}</div></div>
    <div className={styles.tripGrid}><label><span>{say(lang,"Αναχώρηση από","Leaving from")}</span><input value={origin} onChange={e=>setOrigin(e.target.value)}/></label><label><span>{say(lang,"Από","From")}</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label><span>{say(lang,"Έως","To")}</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><label><span>{say(lang,"Συνολικό budget","Total budget")}</span><div className={styles.money}><b>€</b><input type="number" min={150} step={50} value={budget} onChange={e=>setBudget(Number(e.target.value)||0)}/></div></label></div>
    <div className={styles.travelerRow}><span>{say(lang,"Ποιοι ταξιδεύουν;","Who is travelling?")}</span>{(["solo","couple","family","friends"] as Traveler[]).map(t=><button key={t} className={traveler===t?styles.selected:""} onClick={()=>setTraveler(t)}>{say(lang,t==="solo"?"Μόνος/η":t==="couple"?"Ζευγάρι":t==="family"?"Οικογένεια":"Φίλοι",t)}</button>)}</div>
    <div className={styles.actions}><button className={styles.secondary} onClick={quickWeekend}>{say(lang,"Επόμενο weekend","Next weekend")}</button><button className={styles.primary} onClick={solve} disabled={busy}>{say(lang,"Ψάξε τα offer products μου","Search my offer products")}<span>→</span></button></div>
    {error&&<div className={styles.error}>{error}</div>}
   </section>}

   {phase==="thinking"&&<section className={`${styles.panel} ${styles.thinking}`}><div className={styles.scan}>✦<i/></div><p className={styles.kicker}>HOLIDAY AGENT WORKING</p><h2>{say(lang,"Ταιριάζω το brief σου με πραγματικά offers.","Matching your brief to real offers.")}</h2><p>{say(lang,"Ξεκινώ από το τι θέλεις και ελέγχω ποια offer products μπορούν πράγματι να στηρίξουν αυτό το ταξίδι.","I start from what you want and check which offer products can actually support that trip.")}</p><div className={styles.steps}><span>Brief</span><i>→</i><span>Offer inventory</span><i>→</i><span>Dates + value</span><i>→</i><span>Traveler fit</span><i>→</i><span>Top 3</span></div></section>}

   {phase==="results"&&result&&<section className={styles.results}>
    <div className={styles.resultsTop}><div><p className={styles.kicker}>Destination reveal · 3 HOLIDAY MATCHES</p><h2>{say(lang,"Αυτά είναι τα 3 που αξίζει να δεις.","These are the 3 worth looking at.")}</h2><p>{say(lang,`Έλεγξα ${result.inventoryChecked.toLocaleString("el-GR")} offer rows και κράτησα τις ισχυρότερες διαφορετικές λύσεις.`,`I checked ${result.inventoryChecked.toLocaleString("en-GB")} offer rows and kept the strongest distinct matches.`)}</p></div><button className={styles.secondary} onClick={()=>{setPhase("welcome");setResult(null);setAnswers([]);setProfile(null);setSummary("");setNextQuestion(null)}}>{say(lang,"Νέο ψάξιμο","New search")}</button></div>
    <div className={styles.resultGrid}>{solutions.map((s,i)=><article key={s.stay.sourceProductId} className={styles.resultCard}><div className={styles.photo} style={s.stay.imageUrl?{backgroundImage:`url(${s.stay.imageUrl})`}:undefined}><span>#{i+1}</span><b>{s.score}% match</b></div><div className={styles.cardBody}><small>{i===0?say(lang,"ΚΑΛΥΤΕΡΟ FIT","BEST FIT"):i===1?say(lang,"ΙΣΧΥΡΗ ΕΝΑΛΛΑΚΤΙΚΗ","STRONG ALTERNATIVE"):say(lang,"ΔΙΑΦΟΡΕΤΙΚΗ ΕΠΙΛΟΓΗ","DIFFERENT PATH")}</small><h3>{s.destination.name}</h3><div className={styles.offer}><span>{say(lang,"Πραγματικό offer","Real offer")}</span><strong>{s.stay.propertyName}</strong></div><p>{s.reason}</p><div className={styles.signals}>{s.matchedSignals.slice(0,3).map(x=><span key={x}>{x}</span>)}</div><div className={styles.offerMeta}><small>{s.stay.sourceProductId}</small>{s.stay.price!=null&&s.stay.price>0&&<b>{s.stay.currency?`${s.stay.price} ${s.stay.currency}`:`${s.stay.price} feed price`}</b>}</div><a href={destinationUrl(s)}>{say(lang,"Δες γιατί ταιριάζει + το stay","See why it fits + the stay")}<span>→</span></a></div></article>)}</div>
    <div className={styles.resultTruth}><b>Real inventory</b><p>{say(lang,"Το match χρησιμοποιεί destination fit + semantic product profile + traveler fit + value + evidence. Το commission δεν αυξάνει το fit.","The match uses destination fit + semantic product profile + traveler fit + value + evidence. Commission does not increase fit.")}</p></div>
   </section>}
  </section>
 </main>
}
