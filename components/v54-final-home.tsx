"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import type { LayerGroup,Map as LeafletMap } from "leaflet";
import {
  ArrowRight,Brain,CalendarBlank,CheckCircle,Compass,Heart,Lightning,MapPin,
  PaperPlaneTilt,ShieldCheck,Sparkle,Star,Users,Wallet
} from "@phosphor-icons/react";
import styles from "./v54-final-home.module.css";

type FilterKey="calm"|"food"|"nature"|"discovery"|"nightlife"|"value";
type Filters=Record<FilterKey,number>;
type Stay={productId:string;placeId:string;name:string;location:string;address:string;latitude:number;longitude:number;category:string;imageUrl:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;onSale:boolean;availability:string;validTo:string|null;demandScore:number|null;trackingUrl:string;destinationSlug:string|null};
type Hero={id:string;location:string;imageUrl:string;propertyCount:number;minPrice:number|null;currency:string;latitude:number|null;longitude:number|null};
type Solution={rank:number;score:number;destination:{slug:string;name:string;regionGroup:string;latitude:number;longitude:number;explorationRole:string;explorationReason:string;why:string;seasonNote:string;effortLabel:string;budgetLabel:string;tags:string[]};stay:{productId:string;name:string;description:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;latitude:number;longitude:number;imageUrl:string|null;trackingUrl:string;availability:string;availabilityConfidence:string;distanceKm:number|null};liveOfferCount:number};
type AgentResponse={ok:boolean;state:"clarify"|"results"|"challenge"|"error";agentMessage:string;question?:{id:string;text:string;quickReplies:{label:string;value:string}[]};solutions?:Solution[];trip?:{startDate:string;endDate:string;travelerType:string;moods:string[];budget:number;origin:string};agentRuntime?:{today?:string;timezone?:string;dateRecovery?:{tier?:string;label?:string}|null}};
type DisplayStay={id:string;name:string;location:string;image:string|null;price:number|null;currency:string;lat:number;lon:number;slug:string|null;tracking:string;score:number|null;why:string;availability:string};

const defaults:Filters={calm:78,food:72,nature:74,discovery:68,nightlife:28,value:70};
const money=(n:number|null,c="EUR")=>n?new Intl.NumberFormat("el-GR",{style:"currency",currency:c,maximumFractionDigits:0}).format(n):"Τιμή στον πάροχο";
const todayIso=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Athens",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const addDays=(iso:string,days:number)=>{const d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};

export function V54FinalHome(){
 const [inventory,setInventory]=useState<Stay[]>([]);
 const [heroMedia,setHeroMedia]=useState<Hero[]>([]);
 const [solutions,setSolutions]=useState<Solution[]>([]);
 const [active,setActive]=useState(0);
 const [origin,setOrigin]=useState("Αθήνα");
 const [start,setStart]=useState(()=>addDays(todayIso(),14));
 const [end,setEnd]=useState(()=>addDays(todayIso(),17));
 const [traveler,setTraveler]=useState("couple");
 const [budget,setBudget]=useState(800);
 const [intent,setIntent]=useState("Χαλάρωση");
 const [freeText,setFreeText]=useState("");
 const [filters,setFilters]=useState<Filters>(defaults);
 const [agentMessage,setAgentMessage]=useState("Πες μου τι χρειάζεσαι και θα περιορίσω τις επιλογές σε όσες αξίζουν πραγματικά.");
 const [agentRuntime,setAgentRuntime]=useState<AgentResponse["agentRuntime"]>(null);
 const [question,setQuestion]=useState<AgentResponse["question"]|null>(null);
 const [busy,setBusy]=useState(false);
 const [lastTrip,setLastTrip]=useState<AgentResponse["trip"]|null>(null);
 const [showSatellite,setShowSatellite]=useState(true);
 const mapHost=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<LeafletMap|null>(null);
 const layerRef=useRef<LayerGroup|null>(null);

 useEffect(()=>{
  Promise.all([
   fetch("/api/v50/map-stays?limit=2000",{cache:"no-store"}).then(r=>r.json()),
   fetch("/api/v50/hero-media",{cache:"no-store"}).then(r=>r.json())
  ]).then(([m,h])=>{
   setInventory(Array.isArray(m.products)?m.products:[]);
   setHeroMedia(Array.isArray(h.items)?h.items:[]);
  }).catch(()=>{});
 },[]);

 useEffect(()=>{
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapHost.current||mapRef.current)return;
   const map=L.map(mapHost.current,{zoomControl:false,attributionControl:false,minZoom:5,maxZoom:18}).setView([38.4,23.7],6);
   L.control.zoom({position:"bottomright"}).addTo(map);
   L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18}).addTo(map);
   mapRef.current=map;
  });
  return()=>{dead=true;mapRef.current?.remove();mapRef.current=null};
 },[]);

 const cards=useMemo<DisplayStay[]>(()=>{
  if(solutions.length)return solutions.map(s=>({
   id:s.stay.productId,name:s.stay.name,location:s.destination.name,image:s.stay.imageUrl,
   price:s.stay.price,currency:s.stay.currency,lat:s.stay.latitude,lon:s.stay.longitude,
   slug:s.destination.slug,tracking:s.stay.trackingUrl,score:Math.round(s.score),why:s.destination.why,availability:s.stay.availability
  }));
  return inventory.slice(0,12).map((p,i)=>({
   id:p.productId,name:p.name,location:p.location||p.address||"Ελλάδα",image:p.imageUrl,price:p.price,currency:p.currency,
   lat:p.latitude,lon:p.longitude,slug:p.destinationSlug,tracking:p.trackingUrl,score:null,
   why:i===0?"Ισχυρό value / location fit από το live inventory.":"Πραγματικό stay από το ενεργό inventory.",availability:p.availability
  }));
 },[solutions,inventory]);

 const activeStay=cards[active]??cards[0]??null;
 const hero=activeStay?.image??heroMedia[0]?.imageUrl??inventory.find(x=>x.imageUrl)?.imageUrl??null;
 const gallery=useMemo(()=>{
  const urls=[activeStay?.image,...heroMedia.map(x=>x.imageUrl),...inventory.slice(0,20).map(x=>x.imageUrl)].filter((x):x is string=>Boolean(x));
  return [...new Set(urls)].slice(0,8);
 },[activeStay?.image,heroMedia,inventory]);

 useEffect(()=>{
  if(!mapRef.current)return;
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapRef.current)return;
   layerRef.current?.remove();
   const g=L.layerGroup().addTo(mapRef.current);layerRef.current=g;
   for(const p of inventory){
    const marker=L.circleMarker([p.latitude,p.longitude],{radius:3,weight:1,opacity:.85,fillOpacity:.72});
    marker.bindTooltip(`${p.name}<br><b>${money(p.price,p.currency)}</b>`);
    marker.on("click",()=>{const idx=cards.findIndex(c=>c.id===p.productId);if(idx>=0)setActive(idx)});
    marker.addTo(g);
   }
   cards.slice(0,10).forEach((p,i)=>{
    const icon=L.divIcon({className:"v54PricePin",html:`<span>${p.price?money(p.price,p.currency):"★"}</span>`,iconSize:[74,32],iconAnchor:[37,16]});
    L.marker([p.lat,p.lon],{icon,zIndexOffset:1000-i}).on("click",()=>setActive(i)).addTo(g);
   });
  });
  return()=>{dead=true};
 },[inventory,cards]);

 useEffect(()=>{
  if(activeStay&&mapRef.current)mapRef.current.flyTo([activeStay.lat,activeStay.lon],11,{duration:.8});
 },[activeStay?.id]);

 async function runAgent(extra?:string){
  const prompt=(extra??freeText).trim()||`${intent}, ${traveler==="couple"?"με σύντροφο":traveler}, ${start} έως ${end}. Θέλω τις καλύτερες πραγματικές επιλογές.`;
  setBusy(true);setAgentMessage("Αναλύω ημερομηνίες, profile, inventory και πραγματικές επιλογές…");
  try{
   const body={
    userText:prompt,
    conversationContext:`USER PROFILE: origin=${origin}, dates=${start}..${end}, traveler=${traveler}, budget=${budget}, intent=${intent}`,
    priorUserText:freeText,
    origin,budget,filters,
    answers:{dates:start+" – "+end,companions:traveler,outcome:filters.calm>72?"restore":"balanced"}
   };
   const r=await fetch("/api/v50/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   const p=await r.json() as AgentResponse;
   setAgentMessage(p.agentMessage||"Έχω το brief σου και συνεχίζω με τις καλύτερες διαθέσιμες επιλογές.");
   setQuestion(p.question??null);setAgentRuntime(p.agentRuntime??null);
   if(p.solutions?.length){setSolutions(p.solutions);setActive(0);setLastTrip(p.trip??null)}
  }catch{setAgentMessage("Το live reasoning δεν απάντησε έγκαιρα. Κρατάω το brief σου και εμφανίζω το ενεργό inventory χωρίς να εφεύρω δεδομένα.");}
  finally{setBusy(false)}
 }

 function openStay(stay:DisplayStay){
  if(stay.slug){
   const q=new URLSearchParams({start,end,budget:String(budget),origin,travelerType:traveler});
   window.location.assign(`/escape/${encodeURIComponent(stay.slug)}/stay/${encodeURIComponent(stay.id)}?${q}`);
  }else if(stay.tracking)window.open(stay.tracking,"_blank","noopener,noreferrer");
 }

 const destinationTiles=heroMedia.slice(0,6);
 const runtimeLabel=agentRuntime?.dateRecovery?.label?agentRuntime.dateRecovery.label:"AI + live inventory";

 return <main className={styles.page}>
  <header className={styles.nav}>
   <a className={styles.logo} href="/">TRAVEL<span>AI</span><small>AI ESCAPE INTELLIGENCE</small></a>
   <nav><a href="#destinations">Προορισμοί</a><a href="#stays">Διαμονή</a><a href="#planner">AI Planner</a><a href="#map">Χάρτης</a><a href="#featured">Featured</a></nav>
   <button onClick={()=>document.getElementById("planner")?.scrollIntoView({behavior:"smooth"})}>Ξεκίνα το ταξίδι σου <ArrowRight/></button>
  </header>

  <section className={styles.hero}>
   <div className={styles.heroImage} style={hero?{backgroundImage:`url(${hero})`}:undefined}>
    <div className={styles.heroShade}/>
    <div className={styles.heroCopy}>
     <p><Sparkle weight="fill"/> AI TRAVEL PLANNING · REAL INVENTORY</p>
     <h1>Δεν ψάχνεις<br/><em>προορισμό.</em><br/>Ψάχνεις το σωστό <i>feeling.</i></h1>
     <span>Η TravelAI περιορίζει τον θόρυβο: καταλαβαίνει τι χρειάζεσαι, ελέγχει πραγματικά stays και μετατρέπει ένα ασαφές “θέλω να φύγω” σε επιλογές που αξίζουν.</span>
     <div className={styles.heroActions}><button onClick={()=>document.getElementById("planner")?.scrollIntoView({behavior:"smooth"})}>Σχεδίασε το ταξίδι μου με AI <ArrowRight/></button><a href="#stays">Δες πραγματικές επιλογές</a></div>
     <div className={styles.heroProof}><b><Brain/> Προσωποποιημένο reasoning</b><b><MapPin/> {inventory.length.toLocaleString("el-GR")} live stays</b><b><ShieldCheck/> Grounded επιλογές</b></div>
    </div>
   </div>

   <aside id="planner" className={styles.planner}>
    <div className={styles.plannerTitle}><Brain weight="fill"/><div><b>AI Travel Planner</b><span>Πες μου τι ονειρεύεσαι. Αναλαμβάνει η AI.</span></div><i className={busy?styles.busy:styles.ready}/></div>
    <div className={styles.tabs}><button className={styles.tabActive}>Ταξίδι</button><button>Εμπειρία</button><button>Απόδραση</button></div>
    <label><span><MapPin/> Από πού ξεκινάς;</span><input value={origin} onChange={e=>setOrigin(e.target.value)}/></label>
    <div className={styles.double}>
     <label><span><CalendarBlank/> Από</span><input type="date" value={start} min={todayIso()} onChange={e=>setStart(e.target.value)}/></label>
     <label><span><CalendarBlank/> Έως</span><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label>
    </div>
    <div className={styles.double}>
     <label><span><Users/> Ταξιδιώτες</span><select value={traveler} onChange={e=>setTraveler(e.target.value)}><option value="couple">2 ενήλικες</option><option value="solo">Μόνος/η</option><option value="family">Οικογένεια</option><option value="friends">Φίλοι</option></select></label>
     <label><span><Wallet/> Budget</span><input type="number" value={budget} onChange={e=>setBudget(Number(e.target.value)||800)}/></label>
    </div>
    <p className={styles.chipTitle}>Τι θέλεις να νιώσεις;</p>
    <div className={styles.chips}>{["Χαλάρωση","Ρομαντικό","Φύση","Γαστρονομία","Περιπέτεια","Πολιτισμός"].map(x=><button key={x} className={intent===x?styles.chipActive:""} onClick={()=>setIntent(x)}>{x}</button>)}</div>
    <textarea value={freeText} onChange={e=>setFreeText(e.target.value)} placeholder="π.χ. Βρες εσύ ένα ήσυχο 3ήμερο με ωραίο φαγητό και καλό ξενοδοχείο…"/>
    <button className={styles.primary} disabled={busy} onClick={()=>void runAgent()}>{busy?"Η AI σκέφτεται…":"Δημιούργησε το δικό μου ταξίδι"} <Sparkle weight="fill"/></button>
    <div className={styles.reasonBox}><Sparkle weight="fill"/><div><b>{runtimeLabel}</b><p>{agentMessage}</p>{question?.quickReplies?.length?<div className={styles.inlineReplies}>{question.quickReplies.slice(0,4).map(q=><button key={q.value} onClick={()=>void runAgent(q.label)}>{q.label}</button>)}</div>:null}</div></div>
   </aside>
  </section>

  <section id="destinations" className={styles.destinations}>
   <div className={styles.sectionHead}><div><small>INSPIRE ME</small><h2>Δημοφιλείς προορισμοί</h2></div><span>{heroMedia.length?heroMedia.length:"Live"} περιοχές από το inventory</span></div>
   <div className={styles.destinationRail}>{destinationTiles.map(d=><article key={d.id} style={{backgroundImage:`url(${d.imageUrl})`}}><div/><b>{d.location}</b><span>{d.propertyCount?d.propertyCount+" stays":"Live supply"}</span></article>)}</div>
  </section>

  <section id="stays" className={styles.discovery}>
   <div className={styles.stayColumn}>
    <div className={styles.sectionHead}><div><small>AI CURATED</small><h2>Προτάσεις διαμονής από την AI</h2></div><button onClick={()=>void runAgent("Βελτιστοποίησε ξανά τις επιλογές με βάση το τρέχον brief.")}>Ανανέωση AI <Sparkle/></button></div>
    <div className={styles.cardGrid}>{cards.slice(0,6).map((s,i)=><article key={s.id} onMouseEnter={()=>setActive(i)} className={i===active?styles.cardActive:""}>
      <div className={styles.cardPhoto} style={s.image?{backgroundImage:`url(${s.image})`}:undefined}><span>{s.score?Math.round(s.score)+"% MATCH":"LIVE STAY"}</span><button><Heart/></button></div>
      <div className={styles.cardBody}><small>{s.location}</small><h3>{s.name}</h3><p>{s.why}</p><div className={styles.tags}><span><CheckCircle/> {s.availability.includes("confirmed")?"Active":"Provider check"}</span><span><Star weight="fill"/> AI fit</span></div><div className={styles.cardFoot}><b>{money(s.price,s.currency)}<small>/ διαμονή</small></b><button onClick={()=>openStay(s)}>Δες λεπτομέρειες <ArrowRight/></button></div></div>
    </article>)}</div>
   </div>

   <div id="map" className={styles.mapPanel}>
    <div className={styles.mapHead}><div><small>LIVE MAP</small><h2>Δες τα όλα στον χάρτη</h2><p>{inventory.length.toLocaleString("el-GR")} πραγματικά stays φορτωμένα</p></div><button onClick={()=>setShowSatellite(v=>!v)}>{showSatellite?"Δορυφόρος":"Χάρτης"}</button></div>
    <div ref={mapHost} className={styles.map}/>
    {activeStay?<div className={styles.mapCard}><div style={activeStay.image?{backgroundImage:`url(${activeStay.image})`}:undefined}/><span><small>{activeStay.location}</small><b>{activeStay.name}</b><strong>{money(activeStay.price,activeStay.currency)}</strong></span><button onClick={()=>openStay(activeStay)}><ArrowRight/></button></div>:null}
   </div>
  </section>

  {activeStay?<section id="featured" className={styles.featured}>
   <div className={styles.featureCopy}><small>FEATURED STAY · AI PICK</small><h2>{activeStay.name}</h2><h3>{activeStay.location}</h3><p>{activeStay.why} Η σύνθεση παρακάτω χρησιμοποιεί πραγματικές εικόνες από το ενεργό travel inventory για να σου δώσει γρήγορα το mood πριν μπεις στις λεπτομέρειες.</p><div className={styles.featureStats}><span><Star weight="fill"/> {activeStay.score?activeStay.score+"% match":"Live inventory"}</span><span><MapPin/> {activeStay.location}</span><span><ShieldCheck/> Grounded stay</span></div><button onClick={()=>openStay(activeStay)}>Δες το κατάλυμα <ArrowRight/></button></div>
   <div className={styles.gallery}>{gallery.slice(0,5).map((src,i)=><div key={src} className={i===0?styles.galleryMain:""} style={{backgroundImage:`url(${src})`}}>{i===4?<span>+{Math.max(0,gallery.length-4)} εικόνες</span>:null}</div>)}</div>
  </section>:null}

  <section className={styles.why}>
   <div><Brain weight="fill"/><span><b>AI που καταλαβαίνει</b><p>Context, ημερομηνίες, budget και travel DNA στο ίδιο reasoning loop.</p></span></div>
   <div><Lightning weight="fill"/><span><b>Λιγότερη αναζήτηση</b><p>Από χιλιάδες επιλογές σε λίγες πραγματικές προτάσεις που αξίζουν.</p></span></div>
   <div><Compass weight="fill"/><span><b>Πραγματικό inventory</b><p>Ο χάρτης και τα cards προέρχονται από το ενεργό supply layer.</p></span></div>
   <div><ShieldCheck weight="fill"/><span><b>Truth-first</b><p>Δεν εφευρίσκουμε availability, ratings ή weather όταν δεν υπάρχουν στοιχεία.</p></span></div>
  </section>

  <section className={styles.footerCta} style={gallery[1]?{backgroundImage:`linear-gradient(90deg,rgba(2,18,15,.94),rgba(2,18,15,.45)),url(${gallery[1]})`}:undefined}>
   <div><small>TRAVELAI · AI ESCAPE INTELLIGENCE</small><h2>Καλύτερα ταξίδια.<br/>Λιγότερος θόρυβος.</h2><p>Ξεκίνα από το feeling. Η AI θα κάνει το δύσκολο μέρος.</p></div><button onClick={()=>document.getElementById("planner")?.scrollIntoView({behavior:"smooth"})}>Ξεκίνα τώρα <ArrowRight/></button>
  </section>
 </main>
}