"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Signal={id:string,label:string};
const signals:Signal[]=[
 {id:"switch_off",label:"Να αποσυνδεθώ"},
 {id:"sun",label:"Να βρω ήλιο"},
 {id:"romance",label:"Να περάσουμε χρόνο μαζί"},
 {id:"family",label:"Να χαρούν τα παιδιά"},
 {id:"food",label:"Καλό φαγητό"},
 {id:"adventure",label:"Κάτι διαφορετικό"},
 {id:"luxury",label:"Να νιώσω λίγο πολυτέλεια"},
 {id:"quiet",label:"Ησυχία, όχι πολύ κόσμο"}
];
const whenOptions=["Αυτό το Σαββατοκύριακο","Το επόμενο Σαββατοκύριακο","3–4 ημέρες μέσα στον μήνα","Μία εβδομάδα","Είμαι ευέλικτος/η"];

export function V33EscapeFunnel(){
 const router=useRouter();
 const [when,setWhen]=useState(whenOptions[1]);
 const [need,setNeed]=useState("");
 const [dna,setDna]=useState<string[]>(["switch_off"]);
 const [origin,setOrigin]=useState("Αθήνα");
 const [budget,setBudget]=useState("800");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const dnaText=useMemo(()=>signals.filter(s=>dna.includes(s.id)).map(s=>s.label).join(" · "),[dna]);
 const toggle=(id:string)=>setDna(v=>v.includes(id)?v.filter(x=>x!==id):v.length<4?[...v,id]:v);
 async function submit(){
  setError("");setBusy(true);
  const fallbackNeed=need.trim()||`Θέλω ${dnaText.toLowerCase()} χωρίς περιττή ταλαιπωρία.`;
  try{
   const r=await fetch("/api/escape/mission",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({locale:"el",originText:origin,when,needText:fallbackNeed,budgetEur:budget?Number(budget):null,dna})});
   const data=await r.json();
   if(!r.ok||!data.missionId)throw new Error(data.error||"mission_failed");
   const seed=new URLSearchParams({mission:data.missionId,when,need:fallbackNeed,origin,budget}).toString();
   router.push(`/ai-planner?${seed}`);
  }catch{setError("Δεν μπόρεσα να αποθηκεύσω την αποστολή. Δοκίμασε ξανά.");setBusy(false);}
 }
 return <section className="v33-escape">
  <div className="v33-escape__backdrop" aria-hidden="true"/>
  <div className="wf-shell v33-escape__shell">
   <div className="v33-escape__intro"><span className="wf-kicker">AI ESCAPE CONCIERGE</span><h1>Δεν χρειάζεται να ξέρεις πού θέλεις να πας.</h1><p>Πες μου <strong>πότε μπορείς να φύγεις</strong> και <strong>τι χρειάζεσαι από αυτή την απόδραση</strong>. Θα περιορίσω τον κόσμο σε λίγες επιλογές που πραγματικά βγάζουν νόημα.</p></div>
   <div className="v33-escape__panel">
    <div className="v33-step"><span className="v33-step__n">01</span><div><label>Πότε μπορείς να φύγεις;</label><div className="v33-chips">{whenOptions.map(x=><button type="button" className={when===x?"is-active":""} onClick={()=>setWhen(x)} key={x}>{x}</button>)}</div></div></div>
    <div className="v33-step"><span className="v33-step__n">02</span><div><label>Τι χρειάζεσαι πραγματικά;</label><div className="v33-chips">{signals.map(x=><button type="button" className={dna.includes(x.id)?"is-active":""} onClick={()=>toggle(x.id)} key={x.id}>{x.label}</button>)}</div><textarea value={need} onChange={e=>setNeed(e.target.value)} placeholder="π.χ. Είμαστε κουρασμένοι, θέλουμε 4 ήσυχες μέρες με καλό φαγητό και χωρίς δύσκολες μετακινήσεις."/></div></div>
    <div className="v33-step v33-step--compact"><span className="v33-step__n">03</span><div className="v33-mini-grid"><label>Αφετηρία<input value={origin} onChange={e=>setOrigin(e.target.value)} /></label><label>Budget συνολικά (€)<input inputMode="numeric" value={budget} onChange={e=>setBudget(e.target.value.replace(/[^0-9]/g,""))}/></label></div></div>
    <div className="v33-dna"><span>ESCAPE DNA</span><strong>{dnaText||"Διάλεξε 1–4 στοιχεία"}</strong><small>Δεν είναι φίλτρα ξενοδοχείων. Είναι ο τρόπος που θέλεις να νιώσεις στο ταξίδι.</small></div>
    {error&&<p className="v33-error" role="alert">{error}</p>}
    <button className="v33-submit" onClick={submit} disabled={busy||dna.length===0}>{busy?"Χτίζω την αποστολή…":"Βρες μου 3 αποδράσεις →"}</button>
    <p className="v33-footnote">Πρώτα διαλέγεις προορισμό. Μόνο μετά ενεργοποιείται το 360° research για καιρό, μέρη, φαγητό, logistics και το προσωπικό Escape Book.</p>
   </div>
  </div>
 </section>
}
