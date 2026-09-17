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
  <div className={styles.backdrop}/><div className={styles.vignette}/><div className={styles.grain}/>
  <header className={styles.nav}><a className={styles.brand} href={lang==="en"?"/en":"/"}><span>✦</span><div><b>Holiday Escape</b><small>AI decision studio</small></div></a><div className={styles.status}><span>{phase==="results"?say(lang,"Έτοιμο","Ready"):say(lang,"Travel Agent","Travel Agent")}</span><i/></div></header>
  <section className={styles.stage}>
   {phase==="welcome"&&<div className={styles.heroPanel}><p className={styles.eyebrow}>AI TRAVEL DECISION STUDIO</p><h1>{say(lang,"Μην μου πεις πού θέλεις να πας. Πες μου τι θέλεις να ζήσεις.","Do not tell me where to go. Tell me what you want to experience.")}</h1><p className={styles.lead}>{say(lang,"Ένα φυσικό brief. Ο agent καταλαβαίνει προτεραιότητες, trade-offs και τι να αποφύγει — μετά ελέγχει πραγματικό inventory.","One natural brief. The agent understands priorities, trade-offs and exclusions, then checks real inventory.")}</p><form className={styles.composer} onSubmit={begin}><textarea autoFocus value={need} onChange={e=>setNeed(e.target.value)} placeholder={say(lang,"π.χ. Θέλω 3-4 ήσυχες μέρες, καλό φαγητό, όμορφο τοπίο, χωρίς πολυκοσμία και χωρίς πολλή ταλαιπωρία…","e.g. I want 3-4 quiet days, great food, beautiful scenery, no crowds and little travel friction…")}/><button disabled={busy}>{busy?say(lang,"Καταλαβαίνω…","Understanding…"):say(lang,"Βρες τι μου ταιριάζει →","Find my match →")}</button></form>{error&&<p className={styles.error}>{error}</p>}<div className={styles.trust}><span>AI semantic brief</span><span>Real inventory</span><span>Fit &gt; popularity</span></div></div>}
   {phase==="clarify"&&q&&<div className={styles.questionPanel}><div className={styles.agentCue}><span>✦</span><div><small>Travel Agent</small><p>{summary}</p></div></div><p className={styles.eyebrow}>{say(lang,"Μία ερώτηση ακόμη — μόνο επειδή αλλάζει την απόφαση","One more question — only because it changes the decision")}</p><h1>{say(lang,q.el,q.en)}</h1><div className={styles.choiceGrid}>{q.choices.map(c=><button key={c.v} disabled={busy} onClick={()=>answer(c.v)}>{say(lang,c.el,c.en)}</button>)}</div><button className={styles.skip} onClick={()=>setPhase("setup")}>{say(lang,"Αρκετά — προχώρα","Enough — continue")}</button></div>}
   {phase==="setup"&&<div className={styles.setupPanel}><p className={styles.eyebrow}>{say(lang,"ΤΟ ΜΟΝΟ ΠΡΑΚΤΙΚΟ ΒΗΜΑ","ONE PRACTICAL STEP")}</p><h1>{say(lang,"Δώσε μου το πλαίσιο. Τα υπόλοιπα τα αναλαμβάνω εγώ.","Give me the frame. I will handle the rest.")}</h1><p className={styles.setupSummary}>{summary||need}</p><div className={styles.tripGrid}><label><span>{say(lang,"Από","From")}</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label><span>{say(lang,"Έως","To")}</span><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label><label><span>{say(lang,"Συνολικό budget","Total budget")}</span><div className={styles.money}><b>€</b><input type="number" min="150" step="50" value={budget} onChange={e=>setBudget(Math.max(150,Number(e.target.value)||150))}/></div></label><label><span>{say(lang,"Αφετηρία","Origin")}</span><input type="text" value={origin} onChange={e=>setOrigin(e.target.value)} placeholder={say(lang,"Αθήνα ή ATH","Athens or ATH")}/></label></div><div className={styles.setupActions}><button className={styles.secondary} onClick={quickWeekend}>{say(lang,"Επόμενο τριήμερο","Next long weekend")}</button><button className={styles.primary} disabled={busy||!origin.trim()||Date.parse(end)<=Date.parse(start)} onClick={()=>void solve()}>{say(lang,"Βρες την καλύτερη απόδραση →","Find the best escape →")}</button></div>{error&&<p className={styles.error}>{error}</p>}</div>}
   {phase==="thinking"&&<div className={styles.thinking}><div className={styles.orbit}><span>✦</span><i/></div><p className={styles.eyebrow}>AI + REAL INVENTORY</p><h1>{say(lang,"Συνδέω το brief σου με όλες τις πραγματικές επιλογές.","Matching your brief against the full real inventory.")}</h1><p>{say(lang,"Ένα inventory fetch. Semantic intent. Destination fit. Value. Απόσταση. Χωρίς 50 διαδοχικά lookups.","One inventory fetch. Semantic intent. Destination fit. Value. Distance. No 50 sequential lookups.")}</p></div>}
   {phase==="results"&&result&&<div className={styles.results}><div className={styles.resultsTop}><div><p className={styles.eyebrow}>Destination reveal · V42</p><h1>{say(lang,"Αυτές είναι οι 3 ισχυρότερες λύσεις.","These are your 3 strongest options.")}</h1><p>{say(lang,`Έλεγξα ${result.inventoryChecked} πραγματικές προσφορές.`,`I checked ${result.inventoryChecked} real offers.`)}</p></div><button className={styles.secondary} onClick={()=>setPhase("setup")}>{say(lang,"Άλλαξε πλαίσιο","Adjust")}</button></div><div className={styles.resultGrid}>{solutions.map((s,i)=><article key={s.destination.slug} className={`${styles.resultCard} ${i===activeIndex?styles.active:""}`} onMouseEnter={()=>setActiveIndex(i)}><div className={styles.photo} style={s.stay.imageUrl?{backgroundImage:`url(${s.stay.imageUrl})`}:undefined}><span>#{i+1}</span><b>{s.score}% fit</b></div><div className={styles.cardBody}><small>{s.matchedSignals.slice(0,3).join(" · ")||"AI semantic fit"}</small><h2>{s.destination.name}</h2><p>{s.reason}</p><div className={styles.stayLine}><div><span>{say(lang,"Πραγματικό stay","Real stay")}</span><strong>{s.stay.propertyName}</strong></div>{s.stay.price!=null&&<b>{s.stay.currency??"EUR"} {Math.round(s.stay.price)}</b>}</div><a href={destinationUrl(s)}>{say(lang,"Δες γιατί ταιριάζει →","See why it fits →")}</a></div></article>)}</div></div>}
  </section>
  {/* Legacy regression reference only; active solver is /api/escape/solve-v42. /api/escape/solve-v36/stream */}
 </main>
}
