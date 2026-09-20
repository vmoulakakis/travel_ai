"use client";

import {FormEvent,useEffect,useMemo,useRef,useState} from "react";
import {AirplaneTilt,ArrowRight,CalendarBlank,Compass,DownloadSimple,MapPin,Sparkle,Star,Users} from "@phosphor-icons/react";
import styles from "./v66-mobile-agent.module.css";

type Solution={
  rank:number;score:number;
  destination:{slug:string;name:string;regionGroup:string;latitude:number;longitude:number;why:string;seasonNote:string;effortLabel:string;budgetLabel:string;tags:string[]};
  stay:{productId:string;name:string;price:number|null;currency:string;latitude:number;longitude:number;imageUrl:string|null;trackingUrl:string;availability:string;distanceKm:number|null};
  liveOfferCount:number;
};
type Question={id:string;text:string;quickReplies:{label:string;value:string}[]};
type AgentResponse={ok:boolean;state:"clarify"|"results"|"challenge"|"error";agentMessage:string;question?:Question;solutions?:Solution[];trip?:{startDate:string;endDate:string;travelerType:string;moods:string[];budget:number;origin:string}};
type IntelStay={productId:string;name:string;location:string;latitude:number;longitude:number;price:number|null;currency:string;imageUrl:string|null;demandSignal?:number|null;seasonalScore?:number|null;priceScore?:number|null;intelligenceScore?:number|null;mapSignal?:"ai"|"demand"|"seasonal"|"value"|"explore"};
type MapIntel={focus:{latitude:number;longitude:number;zoom:number;label:string;score:number;demand:number;seasonality:number;value:number;reason:string}|null;demandIsDiscriminating?:boolean};
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};

const athensToday=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Athens",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const addDays=(iso:string,n:number)=>{const d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const money=(n:number|null,c="EUR")=>n!=null&&n>=5?new Intl.NumberFormat("el-GR",{style:"currency",currency:c,maximumFractionDigits:0}).format(n):"Τιμή στον πάροχο";

export function V66MobileAgent(){
 const today=useMemo(()=>athensToday(),[]);
 const [text,setText]=useState("");
 const [start,setStart]=useState(addDays(today,7));
 const [end,setEnd]=useState(addDays(today,10));
 const [traveler,setTraveler]=useState("couple");
 const [budget,setBudget]=useState(800);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("Πες μου τι χρειάζεσαι. Θα αποφασίσω πού αξίζει να κοιτάξεις τώρα.");
 const [question,setQuestion]=useState<Question|null>(null);
 const [solutions,setSolutions]=useState<Solution[]>([]);
 const [intel,setIntel]=useState<IntelStay[]>([]);
 const [mapIntel,setMapIntel]=useState<MapIntel|null>(null);
 const [active,setActive]=useState(0);
 const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null);
 const [installed,setInstalled]=useState(false);
 const mapHost=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<any>(null);
 const markersRef=useRef<any>(null);

 useEffect(()=>{
   if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
   const standalone=window.matchMedia("(display-mode: standalone)").matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
   setInstalled(standalone);
   const onInstall=(e:Event)=>{e.preventDefault();setInstallEvent(e as InstallEvent)};
   window.addEventListener("beforeinstallprompt",onInstall);
   return()=>window.removeEventListener("beforeinstallprompt",onInstall);
 },[]);

 useEffect(()=>{
   let dead=false;
   fetch(`/api/v50/map-stays?mode=quick&limit=60&start=${encodeURIComponent(start)}`,{cache:"no-store"})
    .then(r=>r.json()).then(p=>{if(dead)return;if(Array.isArray(p.products))setIntel(p.products);if(p.mapIntelligence)setMapIntel(p.mapIntelligence)})
    .catch(()=>{});
   return()=>{dead=true};
 },[start]);

 useEffect(()=>{
   if(!solutions.length||!mapHost.current)return;
   let dead=false;
   void import("leaflet").then(L=>{
     if(dead||!mapHost.current)return;
     if(!mapRef.current){
       mapRef.current=L.map(mapHost.current,{zoomControl:false,attributionControl:false,scrollWheelZoom:false,minZoom:5}).setView([38.2,23.7],6);
       L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(mapRef.current);
     }
     markersRef.current?.remove();
     const group=L.layerGroup().addTo(mapRef.current);markersRef.current=group;
     const bounds:L.LatLngExpression[]=[];
     solutions.slice(0,3).forEach((s,i)=>{
       const size=i===0?50:40;
       const icon=L.divIcon({className:"v66MapPin",html:`<span style="width:${size}px;height:${size}px">★<small>#${i+1}</small></span>`,iconSize:[size,size],iconAnchor:[size/2,size/2]});
       L.marker([s.stay.latitude,s.stay.longitude],{icon}).addTo(group).on("click",()=>setActive(i));
       bounds.push([s.stay.latitude,s.stay.longitude]);
     });
     if(bounds.length>1)mapRef.current.fitBounds(bounds,{padding:[46,46],maxZoom:10});
     else if(bounds.length===1)mapRef.current.flyTo(bounds[0],11,{duration:.8});
     window.setTimeout(()=>mapRef.current?.invalidateSize(),60);
   });
   return()=>{dead=true};
 },[solutions]);

 const current=solutions[active]??solutions[0]??null;
 const currentIntel=current?intel.find(x=>x.productId===current.stay.productId):null;
 const intelligence=useMemo(()=>{
   if(!current)return null;
   return{
    season:Math.round(currentIntel?.seasonalScore??mapIntel?.focus?.seasonality??0),
    demand:Math.round(currentIntel?.demandSignal??mapIntel?.focus?.demand??0),
    value:Math.round(currentIntel?.priceScore??mapIntel?.focus?.value??0)
   };
 },[current,currentIntel,mapIntel]);

 async function ask(extra?:string){
   const userText=(extra??text).trim()||"Βρες μου εσύ την καλύτερη απόδραση τώρα.";
   setBusy(true);setQuestion(null);setMessage("Ελέγχω εποχή, περιοχή, ζήτηση και πραγματικές διαμονές…");
   try{
     const body={
       userText,
       priorUserText:text,
       origin:"Αθήνα",
       budget,
       answers:{dates:`${start} – ${end}`,companions:traveler},
       conversationContext:`MOBILE_APP=true. TODAY_LOCAL=${today} Europe/Athens. User wants the simplest possible answer. Always reason about seasonality, spatial fit, demand intelligence and live stay inventory. Prefer 3 strong choices, not a long list.`,
       mapContext:mapIntel?.focus?{centerLat:mapIntel.focus.latitude,centerLon:mapIntel.focus.longitude,zoom:mapIntel.focus.zoom,visibleDestination:mapIntel.focus.label}:undefined
     };
     const r=await fetch("/api/v50/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
     const p=await r.json() as AgentResponse;
     setMessage(p.agentMessage||"Έτοιμο.");
     if(p.question)setQuestion(p.question);
     if(p.solutions?.length){setSolutions(p.solutions.slice(0,3));setActive(0)}
   }catch{
     setMessage("Δεν πήρα ασφαλή live απάντηση. Δεν θα γεμίσω την οθόνη με πρόχειρες προτάσεις — ξαναδοκίμασε.");
   }finally{setBusy(false)}
 }

 function submit(e:FormEvent){e.preventDefault();void ask()}
 function answer(value:string){setText(prev=>[prev,value].filter(Boolean).join(". "));void ask(value)}
 function openStay(s:Solution){
   const q=new URLSearchParams({start,end,budget:String(budget),origin:"Αθήνα",travelerType:traveler,dn:s.destination.name});
   window.location.assign(`/escape/${encodeURIComponent(s.destination.slug)}/stay/${encodeURIComponent(s.stay.productId)}?${q}`);
 }
 async function install(){
   if(!installEvent)return;
   await installEvent.prompt();
   const choice=await installEvent.userChoice;
   if(choice.outcome==="accepted"){setInstalled(true);setInstallEvent(null)}
 }

 return <main className={styles.app}>
   <header className={styles.top}>
     <a href="/" className={styles.brand}><span>✦</span><b>TravelAI</b></a>
     <div className={styles.topActions}>
       <span className={styles.live}><i/> LIVE INTELLIGENCE</span>
       {!installed&&installEvent?<button className={styles.install} onClick={()=>void install()}><DownloadSimple size={17}/> Install</button>:null}
     </div>
   </header>

   <section className={styles.hero}>
     <div className={styles.heroCopy}>
       <span className={styles.kicker}>YOUR AI TRAVEL AGENT</span>
       <h1>Πες μου <em>τι χρειάζεσαι.</em><br/>Θα βρω πού αξίζει.</h1>
       <p>Δεν χρειάζεται να ψάξεις προορισμούς, φίλτρα και εκατοντάδες pins. Το TravelAI συνδυάζει <b>εποχή, χώρο, ζήτηση και live stays</b> και σου δείχνει μόνο τις επιλογές που αξίζουν τώρα.</p>
     </div>

     <form className={styles.agentBox} onSubmit={submit}>
       <div className={styles.agentHead}><Sparkle size={20} weight="fill"/><div><b>Τι απόδραση χρειάζεσαι;</b><small>Γράψε το όπως θα το έλεγες σε έναν καλό travel agent.</small></div></div>
       <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="π.χ. Θέλουμε 3 μέρες κάπου όμορφα, ήσυχα, με καλό φαγητό και χωρίς μεγάλη ταλαιπωρία…"/>
       <div className={styles.quick}>
         <button type="button" onClick={()=>setText("Θέλω να ξεκουραστώ κάπου όμορφα και ήσυχα.")}>🌿 Reset</button>
         <button type="button" onClick={()=>setText("Θέλω ρομαντικό τριήμερο με καλό φαγητό.")}>❤️ Couple</button>
         <button type="button" onClick={()=>setText("Βρες μου εσύ κάτι που αξίζει πραγματικά αυτή την εποχή.")}>✨ Surprise me</button>
       </div>
       <div className={styles.compactRow}>
         <label><CalendarBlank size={17}/><input aria-label="Από" type="date" min={today} value={start} onChange={e=>setStart(e.target.value)}/></label>
         <label><CalendarBlank size={17}/><input aria-label="Έως" type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)}/></label>
         <label><Users size={17}/><select aria-label="Ταξιδιώτες" value={traveler} onChange={e=>setTraveler(e.target.value)}><option value="solo">Solo</option><option value="couple">Ζευγάρι</option><option value="family">Οικογένεια</option><option value="friends">Φίλοι</option></select></label>
         <label className={styles.budget}>€<input aria-label="Budget" type="number" min="150" step="50" value={budget} onChange={e=>setBudget(Math.max(150,Number(e.target.value)||150))}/></label>
       </div>
       <button className={styles.go} disabled={busy}>{busy?<><span className={styles.spinner}/>Σκέφτομαι σαν travel agent…</>:<>Βρες τι αξίζει τώρα <ArrowRight size={20} weight="bold"/></>}</button>
     </form>

     <div className={styles.status}>
       <Sparkle size={18} weight="fill"/>
       <p>{message}</p>
     </div>

     {question?<div className={styles.question}>
       <b>{question.text}</b>
       <div>{question.quickReplies?.slice(0,4).map(x=><button key={x.value} onClick={()=>answer(x.value)}>{x.label}</button>)}</div>
     </div>:null}
   </section>

   {solutions.length?<section className={styles.results} id="results">
     <div className={styles.resultsHead}>
       <div><span className={styles.kicker}>AI SHORTLIST</span><h2>Τρεις επιλογές. <em>Όχι τριάντα.</em></h2></div>
       <small>Season-aware · Spatial-aware · Demand-aware</small>
     </div>

     <div className={styles.resultLayout}>
       <div className={styles.cards}>
        {solutions.map((s,i)=><article key={s.stay.productId} className={i===active?styles.cardActive:styles.card} onClick={()=>setActive(i)}>
          <div className={styles.photo} style={s.stay.imageUrl?{backgroundImage:`url(${s.stay.imageUrl})`}:undefined}>
            <span className={styles.rank}>#{i+1}</span>
            <span className={styles.fit}><Star size={13} weight="fill"/>{Math.round(s.score)}% fit</span>
          </div>
          <div className={styles.cardBody}>
            <small>{i===0?"BEST NOW":i===1?"STRONG ALTERNATIVE":"SMART CONTRAST"}</small>
            <h3>{s.destination.name}</h3>
            <p>{s.destination.why}</p>
            <div className={styles.stay}><MapPin size={16}/><span><b>{s.stay.name}</b><small>{money(s.stay.price,s.stay.currency)}</small></span></div>
            <button onClick={e=>{e.stopPropagation();openStay(s)}}>Δες την επιλογή <ArrowRight size={17}/></button>
          </div>
        </article>)}
       </div>

       <aside className={styles.intelPanel}>
         <div className={styles.map} ref={mapHost}/>
         <div className={styles.intelOverlay}>
           <span><Compass size={16}/> {current?.destination.name}</span>
           <h3>{mapIntel?.focus?.label||"AI geographic focus"}</h3>
           <p>{mapIntel?.focus?.reason||current?.destination.seasonNote||"Ο agent έχει περιορίσει γεωγραφικά τις επιλογές πριν σου δείξει stays."}</p>
           {intelligence?<div className={styles.signals}>
             <div><b>{intelligence.season}</b><small>Season</small></div>
             <div><b>{mapIntel?.demandIsDiscriminating===false?"—":intelligence.demand}</b><small>Demand</small></div>
             <div><b>{intelligence.value}</b><small>Value</small></div>
           </div>:null}
         </div>
       </aside>
     </div>
   </section>:null}

   <nav className={styles.mobileNav}>
     <a href="#"><Sparkle size={21} weight="fill"/><span>Agent</span></a>
     <a href={solutions.length?"#results":"#"}><Compass size={21}/><span>Explore</span></a>
     {!installed&&installEvent?<button onClick={()=>void install()}><DownloadSimple size={21}/><span>Install</span></button>:<span className={styles.installed}><AirplaneTilt size={21}/><small>TravelAI</small></span>}
   </nav>
 </main>
}
