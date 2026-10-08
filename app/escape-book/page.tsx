"use client";

import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { sameOrigin } from "@/lib/decision/escape-origin-gate";
import "./escape-book.css";

type Stay={productId:string;name:string;location:string;imageUrl:string|null;price:number|null;currency:string;destinationSlug:string|null;intelligenceScore?:number;seasonalScore?:number;priceScore?:number;availability:string;trackingUrl:string};
type Solution={score:number;destination:{name:string;why:string;seasonNote:string;effortLabel:string};stay:{productId:string;name:string;price:number|null;currency:string;availability:string;imageUrl:string|null;trackingUrl:string;seasonalFit?:{reason:string}}};
type AgentResult={ok:boolean;state:string;agentMessage:string;solutions?:Solution[];question?:{text:string;quickReplies:{label:string;value:string}[]}};
const localDate=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Athens",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const plusDays=(d:string,n:number)=>{const t=new Date(d+"T12:00:00Z");t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
const currency=(price:number|null,c="EUR")=>price!=null&&price>=5?new Intl.NumberFormat("el-GR",{style:"currency",currency:c,maximumFractionDigits:0}).format(price):"Τιμή στον πάροχο";
const escapeHref=(s:Stay)=>s.destinationSlug?`/escape/${encodeURIComponent(s.destinationSlug)}/stay/${encodeURIComponent(s.productId)}`:`/stay/${encodeURIComponent(s.productId)}`;
const moods=[{id:"ηρεμία",title:"Απόλυτη αποφόρτιση",subtitle:"Φύση · ησυχία · αργοί ρυθμοί",glyph:"◌"},{id:"ανακάλυψη",title:"Μικρές ανακαλύψεις",subtitle:"Χωριά · μονοπάτια · τοπικές ιστορίες",glyph:"✧"},{id:"ρομαντισμός",title:"Μαζί, μακριά από όλα",subtitle:"Δύο άνθρωποι · ιδιαίτερες στιγμές",glyph:"♡"},{id:"γαστρονομία",title:"Γεύσεις & άνθρωποι",subtitle:"Μικρά τραπέζια · αυθεντικοί τόποι",glyph:"✺"}] as const;

export default function EscapeBookPage(){
 const [mood,setMood]=useState<string>("ηρεμία");
 const [start,setStart]=useState<string>(()=>plusDays(localDate(),14));
 const [end,setEnd]=useState<string>(()=>plusDays(localDate(),17));
 const [budget,setBudget]=useState("800");
 const [origin,setOrigin]=useState("Αθήνα");
 const [travelers,setTravelers]=useState("couple");
 const [wish,setWish]=useState("");
 const [inventory,setInventory]=useState<Stay[]>([]);
 const [loading,setLoading]=useState(true);
 const [running,setRunning]=useState(false);
 const [agent,setAgent]=useState<AgentResult|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [saved,setSaved]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError("");
  fetch(`/api/v50/map-stays?limit=2000&start=${encodeURIComponent(start)}`,{signal:controller.signal})
   .then(r=>{if(!r.ok)throw new Error("inventory");return r.json()})
   .then(d=>setInventory(Array.isArray(d.products)?d.products:[]))
   .catch(e=>{if(e.name!=="AbortError")setError("Δεν ήταν δυνατή η φόρτωση της βάσης καταλυμάτων.")})
   .finally(()=>setLoading(false));
  return()=>controller.abort();
 },[start]);
 const featured=useMemo(()=>[...inventory].filter(s=>s.productId&&s.name&&s.trackingUrl&&!sameOrigin(origin,s.location,s.destinationSlug)).sort((a,b)=>(b.intelligenceScore??0)-(a.intelligenceScore??0)).slice(0,9),[inventory,origin]);
 const choices=agent?.state==="results"&&agent.solutions?.length?agent.solutions.filter(s=>!sameOrigin(origin,s.destination.name,inventory.find(x=>x.productId===s.stay.productId)?.destinationSlug)).slice(0,3).map((s,i)=>({id:s.stay.productId,name:s.stay.name,location:s.destination.name,image:s.stay.imageUrl,price:s.stay.price,currency:s.stay.currency,score:s.score,season:null as number|null,why:s.destination.why,seasonReason:s.destination.seasonNote,booking:s.stay.trackingUrl,slug:inventory.find(x=>x.productId===s.stay.productId)?.destinationSlug??null})):featured.slice(0,3).map(s=>({id:s.productId,name:s.name,location:s.location,image:s.imageUrl,price:s.price,currency:s.currency,score:s.intelligenceScore??null,season:s.seasonalScore??null,why:"Επιλογή της βάσης με εποχικά κριτήρια. Για προσωπικό itinerary ζήτησε ανάλυση από τον AI σύμβουλο.",seasonReason:"Η διαθεσιμότητα για τις ημερομηνίες σου δεν έχει επιβεβαιωθεί.",booking:s.trackingUrl,slug:s.destinationSlug}));
 const active=choices.find(s=>s.id===selected)??choices[0]??null;
 async function buildJourney(text?:string){
  setRunning(true);setError("");setSelected(null);
  try{
   const response=await fetch("/api/v50/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userText:text||wish.trim()||`Θέλω ${mood} απόδραση στην Ελλάδα, ${start} έως ${end}, ${travelers==="couple"?"ζευγάρι":travelers==="family"?"οικογένεια":travelers==="friends"?"φίλοι":"μόνος/η"}, budget ${budget} EUR, αφετηρία ${origin}. Βρες 3 πραγματικά κατάλληλες εμπειρίες και διαμονές.`,origin,budget:Number(budget),filters:{calm:mood==="ηρεμία"?95:58,food:mood==="γαστρονομία"?95:65,nature:75,discovery:mood==="ανακάλυψη"?95:64,nightlife:22,value:75}})});
   const result=await response.json() as AgentResult;
   if(!response.ok||!result.ok)throw new Error("agent");
   if(result.solutions)result.solutions=result.solutions.filter(s=>!sameOrigin(origin,s.destination.name,inventory.find(x=>x.productId===s.stay.productId)?.destinationSlug));
   setAgent(result);document.getElementById("escape-results")?.scrollIntoView({behavior:"smooth",block:"start"});
  }catch{setError("Ο AI σύμβουλος δεν απάντησε. Οι εποχικές επιλογές της βάσης παραμένουν διαθέσιμες.");}
  finally{setRunning(false);}
 }
 const save=()=>{if(!active)return;try{localStorage.setItem("travelai-escape-book",JSON.stringify({stay:active,mood,start,end,budget,origin,savedAt:new Date().toISOString()}));setSaved(true)}catch{setError("Δεν μπόρεσε να αποθηκευτεί σε αυτή τη συσκευή.")}};
 const share=async()=>{try{await navigator.clipboard.writeText(window.location.href+"#escape-results");setSaved(true)}catch{setError("Αντέγραψε τη διεύθυνση της σελίδας για κοινοποίηση.")}};
 return <main className="eb-shell">
  <header className="eb-nav"><Link href="/" className="eb-brand">TRAVEL<span>AI</span><small>THE ESCAPE COLLECTION</small></Link><nav><a href="#design-your-escape">Σχεδίασε</a><a href="#escape-results">Επιλογές</a><a href="#escape-book">Escape Book</a></nav><Link className="eb-nav-cta" href="/">Ζωντανός χάρτης ↗</Link></header>
  <section className="eb-hero"><div className="eb-hero-photo"/><div className="eb-hero-content"><div className="eb-eyebrow">GREECE · PERSONALIZED TRAVEL INTELLIGENCE</div><h1>Δεν ψάχνεις απλώς<br/>πού να πας.<br/><em>Ψάχνεις πώς να νιώσεις.</em></h1><p>Η απόδραση ξεκινά από εσένα. Συνδυάζουμε την εποχή, την Ελλάδα που δεν γνωρίζεις ακόμη, πραγματικά καταλύματα και την προσωπική σου επιθυμία σε μια εμπειρία που αξίζει να ζήσεις.</p><a href="#design-your-escape" className="eb-primary">Σχεδίασε την απόδρασή σου <span>↗</span></a><div className="eb-hero-foot"><span>01 / Νιώσε</span><span>02 / Ανακάλυψε</span><span>03 / Ζήσε</span></div></div><div className="eb-vertical">ESCAPE IS A FEELING — NOT A DESTINATION</div></section>
  <section id="design-your-escape" className="eb-design"><div className="eb-section-intro"><small>01 / YOUR TRAVEL DNA</small><h2>Πώς θέλεις να είναι<br/><em>η επόμενη ιστορία σου;</em></h2><p>Μία επιλογή αρκεί για να αρχίσουμε. Ο προσωπικός σου AI Travel Expert συνδυάζει τις ανάγκες σου με την πραγματική ταξιδιωτική βάση.</p></div><div className="eb-moods">{moods.map(x=><button key={x.id} type="button" className={mood===x.id?"eb-mood active":"eb-mood"} onClick={()=>setMood(x.id)} aria-pressed={mood===x.id}><span>{x.glyph}</span><b>{x.title}</b><small>{x.subtitle}</small></button>)}</div>
   <div className="eb-form"><label>Αναχώρηση<input aria-label="Αναχώρηση" type="date" value={start} min={localDate()} onChange={e=>{setStart(e.target.value);if(end<=e.target.value)setEnd(plusDays(e.target.value,2));setAgent(null)}}/></label><label>Επιστροφή<input aria-label="Επιστροφή" type="date" value={end} min={plusDays(start,1)} onChange={e=>{setEnd(e.target.value);setAgent(null)}}/></label><label>Αφετηρία<input value={origin} onChange={e=>setOrigin(e.target.value)}/></label><label>Μαζί με<select value={travelers} onChange={e=>setTravelers(e.target.value)}><option value="couple">Σύντροφο</option><option value="family">Οικογένεια</option><option value="friends">Φίλους</option><option value="solo">Μόνος/η</option></select></label><label>Συνολικό budget<select value={budget} onChange={e=>setBudget(e.target.value)}><option value="500">Έως €500</option><option value="800">Έως €800</option><option value="1200">Έως €1.200</option><option value="2000">Έως €2.000</option></select></label></div>
   <div className="eb-prompt"><textarea value={wish} onChange={e=>setWish(e.target.value)} placeholder="Ή μίλησε φυσικά: Θέλω ένα ήσυχο τριήμερο σε πέτρινα χωριά, όμορφο φαγητό, χωρίς πολύ οδήγηση…"/><button disabled={running||end<=start||!start} onClick={()=>void buildJourney()}>{running?"Ο AI Expert εξετάζει επιλογές…":"Δημιούργησε την εμπειρία μου"} <span>✧</span></button></div>
   {agent?.state==="clarify"&&agent.question?<div className="eb-clarify"><strong>{agent.question.text}</strong><div>{agent.question.quickReplies.map(q=><button key={q.value} onClick={()=>void buildJourney(q.label)}>{q.label}</button>)}</div></div>:null}
   {error&&<p className="eb-error" role="alert">{error}</p>}
  </section>
  <section className="eb-results" id="escape-results"><div className="eb-section-intro"><small>02 / THE CURATED COLLECTION</small><h2>Όχι αμέτρητες επιλογές.<br/><em>Οι σωστές για σένα.</em></h2><p>{agent?.state==="results"?"Επιλογές που επέστρεψε ο AI Travel Expert με βάση το αίτημά σου.":"Εποχικές επιλογές από το πραγματικό inventory. Ζήτησε προσωπική ανάλυση για πλήρη προσαρμογή."}</p></div><div className="eb-cardgrid">{loading?<p>Αναζητούμε πραγματικά καταλύματα…</p>:choices.length?choices.map((s,i)=><button key={s.id} className={active?.id===s.id?"eb-pick selected":"eb-pick"} onClick={()=>{setSelected(s.id);setSaved(false)}}><div className="eb-pick-photo" style={s.image?{backgroundImage:`linear-gradient(0deg,rgba(12,25,23,.60),transparent),url("${s.image.replace(/["\\]/g,"")}")`}:undefined}><span>0{i+1} — {agent?.state==="results"?"AI PERSONAL PICK":"SEASONAL PICK"}</span></div><div className="eb-pick-body"><small>{s.location}</small><h3>{s.name}</h3><p>{s.why}</p><div><strong>{currency(s.price,s.currency)}</strong><span>{s.score!=null?`Fit ${Math.round(s.score)}/100`:"Επιλογή inventory"}</span></div></div></button>):<p>Δεν υπάρχουν επιλέξιμα καταλύματα για εμφάνιση. Δοκίμασε διαφορετικές ημερομηνίες.</p>}</div></section>
  <section id="escape-book" className="eb-book"><div className="eb-book-cover"><small>03 / YOUR PERSONAL ESCAPE BOOK</small><h2>Η ιστορία σου,<br/><em>έτοιμη να αρχίσει.</em></h2><p>Διάλεξε μια εμπειρία και κράτησε τις βασικές πληροφορίες της απόδρασής σου. Το πλήρες ημερήσιο itinerary δημιουργείται στο επόμενο βήμα του AI Planner — δεν επινοούμε στάσεις ή διαθεσιμότητα.</p><div className="eb-book-stats"><span>{start}<small>ΑΝΑΧΩΡΗΣΗ</small></span><span>{end}<small>ΕΠΙΣΤΡΟΦΗ</small></span><span>{mood}<small>TRAVEL DNA</small></span></div></div><div className="eb-book-detail"><span className="eb-kicker">YOUR CURATED STAY</span>{active?<><h3>{active.name}</h3><p>{active.location} · {active.seasonReason}</p><p className="eb-honesty">Η τιμή είναι ένδειξη feed, όχι πλήρες κόστος ταξιδιού. Η διαθεσιμότητα επαληθεύεται στον πάροχο.</p><div className="eb-book-actions"><button onClick={save}>{saved?"✓ Αποθηκεύτηκε":"♡ Αποθήκευση στο κινητό"}</button><button onClick={()=>void share()}>↗ Κοινοποίηση</button></div><Link href={active.slug?`/escape/${encodeURIComponent(active.slug)}/stay/${encodeURIComponent(active.id)}`:`/stay/${encodeURIComponent(active.id)}`} className="eb-book-cta">Δες την πλήρη εμπειρία και τη διαμονή ↗</Link></>:<p>Ξεκίνα επιλέγοντας μία από τις προτάσεις.</p>}</div></section>
  <footer className="eb-footer"><Link href="/">TRAVELAI</Link><span>Η Ελλάδα είναι μια εμπειρία. Κάν' τη δική σου.</span><small>Οι πραγματικές τιμές, ώρες και κρατήσεις επιβεβαιώνονται πριν από την αγορά.</small></footer>
 </main>
}
