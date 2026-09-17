"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import styles from "./v40-discovery-experience.module.css";

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

const questionCopy:Record<QuestionId,{el:string;en:string;choices:{v:string;el:string;en:string}[]}>= {
 companions:{el:"Με ποιον ταξιδεύεις;",en:"Who are you travelling with?",choices:[{v:"solo",el:"Μόνος/η",en:"Solo"},{v:"couple",el:"Ζευγάρι",en:"Couple"},{v:"family",el:"Οικογένεια",en:"Family"},{v:"friends",el:"Φίλοι",en:"Friends"}]},
 outcome:{el:"Τι θέλεις να σου αφήσει αυτό το ταξίδι;",en:"What should this trip give you?",choices:[{v:"rest reset quiet",el:"Ξεκούραση",en:"Reset"},{v:"reconnect romantic",el:"Σύνδεση",en:"Reconnect"},{v:"stimulating adventure energy",el:"Ενέργεια",en:"Energy"},{v:"culture inspiration",el:"Έμπνευση",en:"Inspiration"}]},
 social:{el:"Πόσο ζωντανά το θέλεις;",en:"How lively should it feel?",choices:[{v:"quiet",el:"Ήσυχα",en:"Quiet"},{v:"balanced",el:"Ισορροπημένα",en:"Balanced"},{v:"lively nightlife",el:"Ζωντανά",en:"Lively"}]},
 novelty:{el:"Να μείνω στα σίγουρα ή να σε εκπλήξω;",en:"Familiar or surprising?",choices:[{v:"familiar",el:"Σίγουρα",en:"Familiar"},{v:"balanced",el:"Ισορροπία",en:"Balanced"},{v:"surprise different",el:"Έκπληξέ με",en:"Surprise me"}]},
 must_have:{el:"Έχεις ένα πραγματικό must-have;",en:"One real must-have?",choices:[{v:"sea beach",el:"Θάλασσα",en:"Sea"},{v:"nature mountain",el:"Φύση",en:"Nature"},{v:"culture history",el:"Πολιτισμός",en:"Culture"},{v:"nightlife",el:"Βραδινή ζωή",en:"Nightlife"},{v:"none",el:"Όχι",en:"None"}]},
 friction:{el:"Τι θέλεις οπωσδήποτε να αποφύγεις;",en:"What do you want to avoid?",choices:[{v:"short easy no long travel",el:"Ταλαιπωρία",en:"Travel friction"},{v:"budget cheap",el:"Υψηλό κόστος",en:"High cost"},{v:"avoid crowds",el:"Πολυκοσμία",en:"Crowds"},{v:"none",el:"Τίποτα",en:"Nothing"}]}
};

export function V40DiscoveryExperience({lang="el"}:{lang?:Lang}){
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
 const[activeIndex,setActiveIndex]=useState(0);
 const[heroMedia,setHeroMedia]=useState<Media[]>([]);
 const[frame,setFrame]=useState(0);
 const solutions=result?.solutions.slice(0,3)??[];
 const active=solutions[activeIndex]??solutions[0]??null;
 const background=active?.stay.imageUrl||heroMedia[frame%Math.max(1,heroMedia.length)]?.imageUrl||"";
 const q=nextQuestion?questionCopy[nextQuestion]:null;
 const destinationHref=lang==="en"?"/en/destinations":"/proorismoi";
 const guidesHref=lang==="en"?"/en/guides":"/guides";
 const howHref=lang==="en"?"/en/how-ai-works":"/how-ai-works";
 const languageHref=lang==="en"?"/":"/en";
 const inspiration=[
  {label:say(lang,"Βόρειο σέλας","Northern lights"),value:say(lang,"Θέλω εντυπωσιακή φύση, βόρειο σέλας και κάτι που να νιώθω μια φορά στη ζωή μου","I want dramatic nature, northern lights and a once-in-a-lifetime feeling")},
  {label:say(lang,"Food weekend","Food weekend"),value:say(lang,"Θέλω ένα σύντομο ταξίδι με εξαιρετικό φαγητό, όμορφη πόλη και όσο γίνεται λιγότερη ταλαιπωρία","I want a short trip with excellent food, a beautiful city and as little travel friction as possible")},
  {label:say(lang,"Reset δίπλα στη φύση","Nature reset"),value:say(lang,"Χρειάζομαι ηρεμία, φύση, καλό ξενοδοχείο και πραγματικό reset χωρίς πολυκοσμία","I need calm, nature, a good hotel and a real reset without crowds")}
 ];

 useEffect(()=>{const id=window.setTimeout(()=>{fetch("/api/escape/media?destination=Greece&mode=aerial").then(r=>r.ok?r.json():null).then((p:{items?:Media[]}|null)=>{if(p?.items?.length)setHeroMedia(p.items.slice(0,4))}).catch(()=>null)},250);return()=>window.clearTimeout(id)},[]);
 useEffect(()=>{const id=window.setInterval(()=>setFrame(v=>v+1),9000);return()=>window.clearInterval(id)},[]);

 async function discover(nextAnswers=answers){
  const r=await fetch("/api/escape/discovery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:lang,initialText:need.trim(),answers:nextAnswers})});
  if(!r.ok)throw new Error("discovery");
  const data=await r.json() as Discovery;setProfile(data.profile);setSummary(data.summary);setNextQuestion(data.nextQuestionId);setTraveler(data.profile.travelerType);return data;
 }
 async function begin(e:FormEvent){e.preventDefault();if(need.trim().length<8){setError(say(lang,"Πες μου με μία πρόταση τι θέλεις να ζήσεις και τι θέλεις να αποφύγεις.","Tell me in one sentence what you want to experience and avoid."));return}setBusy(true);setError(null);try{const d=await discover();setPhase(d.complete||!d.nextQuestionId?"setup":"clarify")}catch{setError(say(lang,"Δεν κατάλαβα αρκετά. Γράψε το όπως θα το έλεγες σε έναν καλό travel agent.","I need a clearer brief. Write it as you would say it to a good travel agent."))}finally{setBusy(false)}}
 async function answer(value:string){if(!nextQuestion)return;const updated=[...answers.filter(a=>a.questionId!==nextQuestion),{questionId:nextQuestion,value}];setAnswers(updated);setBusy(true);try{const d=await discover(updated);if(updated.length>=2||d.complete||!d.nextQuestionId)setPhase("setup")}catch{setPhase("setup")}finally{setBusy(false)}}
 function quickWeekend(){const f=nextFriday();setStart(iso(f));setEnd(iso(new Date(f.getTime()+3*DAY)))}
 async function solve(){
  const learned=profile??(await discover());const p="profile" in learned?learned.profile:learned;if(!p)return;
  const nights=Math.max(1,Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/DAY));
  const trip={origin,startDate:start,endDate:end,month:"flexible",nights,budget,moods:p.moods,travelerType:traveler,language:lang,distancePreference:"any",pace:p.pace,hotelStyle:"any",avoid:p.avoid,entryMode:"idea",groupSize:traveler==="solo"?1:traveler==="couple"?2:4,desiredEnergy:p.desiredEnergy,socialPreference:p.socialPreference,noveltyPreference:p.noveltyPreference,mustHave:p.mustHave,dateFlexibility:"few-days",transportMode:"any",stayLocationPreference:"balanced",tripText:[need,summary].filter(Boolean).join(". ").slice(0,1200)};
  setPhase("thinking");setBusy(true);setError(null);
  try{const r=await fetch("/api/escape/solve-v42",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(trip)});if(!r.ok)throw new Error();const data=await r.json() as SolveResult;if(!data.solutions?.length)throw new Error();setResult(data);setActiveIndex(0);setPhase("results")}catch{setPhase("setup");setError(say(lang,"Δεν θα σε στείλω πάλι σε αδιέξοδο. Δεν βρήκα ασφαλή ακριβή λύση για αυτές τις ημερομηνίες — άλλαξε μόνο ημερομηνίες ή άνοιξε λίγο το budget και ξαναδοκίμασε.","I will not send you into a dead end. I found no safe exact match for these dates — adjust dates or widen budget slightly and rerun."))}finally{setBusy(false)}
 }
 function destinationUrl(s:Solution){return `${lang==="en"?"/en/destinations/":"/proorismoi/"}${s.destination.slug}?start=${start}&end=${end}&budget=${budget}&origin=${encodeURIComponent(origin)}`}

 return <main className={styles.shell} style={background?{"--hero":`url(${background})`} as React.CSSProperties:undefined}>
  <div className={styles.backdrop}/><div className={styles.aurora}/><div className={styles.vignette}/><div className={styles.grain}/>
  <header className={styles.nav}>
   <a className={styles.brand} href={lang==="en"?"/en":"/"}><span className={styles.brandMark}>✦</span><div><b>TravelAI</b><small>Plan smarter. Travel deeper.</small></div></a>
   <nav className={styles.navLinks} aria-label={say(lang,"Κύρια πλοήγηση","Main navigation")}><a href={destinationHref}>{say(lang,"Προορισμοί","Destinations")}</a><a href={guidesHref}>{say(lang,"Εμπειρίες","Experiences")}</a><a href={howHref}>{say(lang,"Πώς δουλεύει","How it works")}</a></nav>
   <div className={styles.navActions}><a className={styles.langSwitch} href={languageHref}>{lang==="en"?"EL":"EN"}</a><div className={styles.status}><i/><span>{phase==="results"?say(lang,"Matches ready","Matches ready"):"Travel Agent"}</span></div></div>
  </header>

  <section className={styles.stage}>
   {phase==="welcome"&&<div className={styles.landingGrid}>
    <div className={styles.heroPanel}>
     <div className={styles.releaseTag}><i/> AI POWERED TRAVEL EXPERIENCES</div>
     <h1>{say(lang,"Μεγαλύτερα ταξίδια. Πιο αληθινές εμπειρίες.","Bigger journeys. More real experiences.")}</h1>
     <p className={styles.lead}>{say(lang,"Η AI δεν ξεκινά από έναν προορισμό. Ξεκινά από εσένα — τι χρειάζεσαι τώρα, τι θέλεις να αποφύγεις και ποια πραγματική απόδραση αξίζει τον χρόνο και το budget σου.","AI does not start with a destination. It starts with you — what you need now, what you want to avoid, and which real escape deserves your time and budget.")}</p>
     <form className={styles.composer} onSubmit={begin}>
      <div className={styles.composerHead}><span>✦</span><div><b>{say(lang,"AI Trip Planner","AI Trip Planner")}</b><small>{say(lang,"Πες το φυσικά. Δεν χρειάζεται φόρμα.","Say it naturally. No form required.")}</small></div></div>
      <textarea autoFocus value={need} onChange={e=>setNeed(e.target.value)} placeholder={say(lang,"π.χ. Είμαστε κουρασμένοι, θέλουμε 3-4 μέρες με καλό φαγητό, ωραίο τοπίο και χωρίς πολλή ταλαιπωρία…","e.g. We are tired and want 3-4 days with great food, beautiful scenery and very little travel friction…")}/>
      <button disabled={busy}><span>{busy?say(lang,"Καταλαβαίνω…","Understanding…"):say(lang,"Σχεδίασε το ταξίδι μου","Plan my trip")}</span><b>↗</b></button>
     </form>
     {error&&<p className={styles.error}>{error}</p>}
     <div className={styles.ideaRow}>{inspiration.map(x=><button type="button" key={x.label} onClick={()=>setNeed(x.value)}>{x.label}<span>＋</span></button>)}</div>
     <div className={styles.trust}><span>{say(lang,"Semantic intent","Semantic intent")}</span><span>{say(lang,"Πραγματικό inventory","Real inventory")}</span><span>{say(lang,"Fit πάνω από δημοτικότητα","Fit over popularity")}</span></div>
    </div>

    <aside className={styles.plannerCard} aria-label={say(lang,"Πώς σκέφτεται το TravelAI","How TravelAI thinks")}>
     <div className={styles.plannerTop}><div><small>TRAVEL INTELLIGENCE</small><h2>{say(lang,"Από την ανάγκη σου σε ένα ταξίδι που στέκεται στην πραγματικότητα.","From your real need to a trip that survives reality.")}</h2></div><span className={styles.liveBadge}><i/> LIVE</span></div>
     <div className={styles.mediaFan}>
      {[0,1,2].map((index)=><div key={index} className={styles.mediaTile} style={heroMedia[index]?.imageUrl?{backgroundImage:`url(${heroMedia[index].imageUrl})`}:undefined}><span>{index===0?say(lang,"Αίσθηση","Feel"):index===1?say(lang,"Τόπος","Place"):say(lang,"Stay","Stay")}</span></div>)}
     </div>
     <div className={styles.reasonFlow}><div><span>01</span><b>{say(lang,"Καταλαβαίνει","Understands")}</b><small>{say(lang,"mood + constraints","mood + constraints")}</small></div><i>→</i><div><span>02</span><b>{say(lang,"Ταιριάζει","Matches")}</b><small>{say(lang,"destination + stay","destination + stay")}</small></div><i>→</i><div><span>03</span><b>{say(lang,"Εξηγεί","Explains")}</b><small>{say(lang,"fit + trade-offs","fit + trade-offs")}</small></div></div>
     <div className={styles.plannerFoot}><span>✦</span><p>{say(lang,"Δεν ανεβάζουμε έναν προορισμό επειδή πληρώνει περισσότερο. Το commercial signal δεν αποφασίζει το fit.","A destination does not rank higher because it pays more. Commercial signals do not decide fit.")}</p></div>
    </aside>

    <div className={styles.capabilities}>
     <div><span>◎</span><p><b>{say(lang,"AI προσαρμογή","AI personalization")}</b><small>{say(lang,"Με βάση το πραγματικό brief σου","Built around your actual brief")}</small></p></div>
     <div><span>◇</span><p><b>{say(lang,"Πραγματικά stays","Real stays")}</b><small>{say(lang,"Inventory πριν την τελική πρόταση","Inventory before the final match")}</small></p></div>
     <div><span>◉</span><p><b>{say(lang,"Εξηγήσιμο fit","Explainable fit")}</b><small>{say(lang,"Γιατί #1 και όχι απλώς τι","Why #1, not just what")}</small></p></div>
     <div><span>⌁</span><p><b>{say(lang,"Λιγότερη τριβή","Less friction")}</b><small>{say(lang,"Μία απόφαση τη φορά","One decision at a time")}</small></p></div>
    </div>
   </div>}

   {phase==="clarify"&&q&&<div className={styles.questionPanel}><div className={styles.agentCue}><span>✦</span><div><small>Travel Agent</small><p>{summary}</p></div></div><p className={styles.eyebrow}>{say(lang,"Μία ερώτηση ακόμη — μόνο επειδή αλλάζει την απόφαση","One more question — only because it changes the decision")}</p><h1>{say(lang,q.el,q.en)}</h1><div className={styles.choiceGrid}>{q.choices.map(c=><button key={c.v} disabled={busy} onClick={()=>answer(c.v)}>{say(lang,c.el,c.en)}<span>↗</span></button>)}</div><button className={styles.skip} onClick={()=>setPhase("setup")}>{say(lang,"Αρκετά — προχώρα","Enough — continue")}</button></div>}

   {phase==="setup"&&<div className={styles.setupPanel}><div className={styles.panelKicker}><span>✦</span><p><b>{say(lang,"ΤΟ ΜΟΝΟ ΠΡΑΚΤΙΚΟ ΒΗΜΑ","ONE PRACTICAL STEP")}</b><small>{say(lang,"Η AI έχει ήδη το intent. Χρειάζεται μόνο το πραγματικό πλαίσιο.","AI already has the intent. It only needs the real-world frame.")}</small></p></div><h1>{say(lang,"Βάλε τα όρια. Εγώ θα κάνω την έρευνα.","Set the boundaries. I will do the research.")}</h1><p className={styles.setupSummary}>{summary||need}</p><div className={styles.tripGrid}><label><span>{say(lang,"Από","From")}</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label><span>{say(lang,"Έως","To")}</span><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label><label><span>{say(lang,"Συνολικό budget","Total budget")}</span><div className={styles.money}><b>€</b><input type="number" min="150" step="50" value={budget} onChange={e=>setBudget(Math.max(150,Number(e.target.value)||150))}/></div></label><label><span>{say(lang,"Αφετηρία","Origin")}</span><input type="text" value={origin} onChange={e=>setOrigin(e.target.value)} placeholder={say(lang,"Αθήνα ή ATH","Athens or ATH")}/></label></div><div className={styles.setupActions}><button className={styles.secondary} onClick={quickWeekend}>{say(lang,"Επόμενο τριήμερο","Next long weekend")}</button><button className={styles.primary} disabled={busy||!origin.trim()||Date.parse(end)<=Date.parse(start)} onClick={()=>void solve()}>{say(lang,"Βρες τις 3 καλύτερες αποδράσεις","Find the 3 best escapes")} <span>↗</span></button></div>{error&&<p className={styles.error}>{error}</p>}</div>}

   {phase==="thinking"&&<div className={styles.thinking}><div className={styles.orbit}><span>✦</span><i/></div><p className={styles.eyebrow}>AI + REAL INVENTORY</p><h1>{say(lang,"Δεν ψάχνω απλώς προορισμούς. Ψάχνω ποιο ταξίδι αξίζει για εσένα.","I am not just searching destinations. I am finding which trip is worth it for you.")}</h1><div className={styles.thinkingSteps}><span>{say(lang,"Semantic intent","Semantic intent")}</span><i>→</i><span>{say(lang,"Destination fit","Destination fit")}</span><i>→</i><span>{say(lang,"Real stay inventory","Real stay inventory")}</span><i>→</i><span>{say(lang,"Trade-off check","Trade-off check")}</span></div><p>{say(lang,"Ένα inventory fetch. Semantic intent. Destination fit. Value. Απόσταση. Χωρίς 50 διαδοχικά lookups.","One inventory fetch. Semantic intent. Destination fit. Value. Distance. No 50 sequential lookups.")}</p></div>}

   {phase==="results"&&result&&<div className={styles.results}><div className={styles.resultsTop}><div><p className={styles.eyebrow}>Destination reveal · V44</p><h1>{say(lang,"Τρεις λύσεις. Καμία τυχαία.","Three options. None random.")}</h1><p>{say(lang,`Έλεγξα ${result.inventoryChecked} πραγματικές προσφορές και κράτησα μόνο τις τρεις ισχυρότερες λύσεις για το brief σου.`,`I checked ${result.inventoryChecked} real offers and kept only the three strongest solutions for your brief.`)}</p></div><button className={styles.secondary} onClick={()=>setPhase("setup")}>{say(lang,"Άλλαξε πλαίσιο","Adjust")}</button></div><div className={styles.resultGrid}>{solutions.map((s,i)=><article key={s.destination.slug} className={`${styles.resultCard} ${i===activeIndex?styles.active:""}`} onMouseEnter={()=>setActiveIndex(i)}><div className={styles.photo} style={s.stay.imageUrl?{backgroundImage:`url(${s.stay.imageUrl})`}:undefined}><span>#{i+1}</span><b>{s.score}% fit</b></div><div className={styles.cardBody}><small>{s.matchedSignals.slice(0,3).join(" · ")||"AI semantic fit"}</small><h2>{s.destination.name}</h2><p>{s.reason}</p><div className={styles.stayLine}><div><span>{say(lang,"Πραγματικό stay","Real stay")}</span><strong>{s.stay.propertyName}</strong></div>{s.stay.price!=null&&<b>{s.stay.currency??"EUR"} {Math.round(s.stay.price)}</b>}</div><a href={destinationUrl(s)}>{say(lang,"Δες γιατί ταιριάζει","See why it fits")} <span>↗</span></a></div></article>)}</div></div>}
  </section>
  {/* Legacy regression reference only; active solver is /api/escape/solve-v42. Destination reveal remains bounded to 3. /api/escape/solve-v36/stream */}
 </main>
}
