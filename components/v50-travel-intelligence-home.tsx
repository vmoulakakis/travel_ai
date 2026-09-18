"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import type { Map as LeafletMap,LayerGroup,TileLayer } from "leaflet";
import { ArrowUpRight,Brain,Crosshair,MapPin,SlidersHorizontal,Sparkle,Waves } from "@phosphor-icons/react";
import type { Mood,TripRequest } from "@/lib/validation/trip";
import styles from "./v50-travel-intelligence-home.module.css";

type BaseMode="map"|"satellite"|"terrain";
type Phase="idle"|"solving"|"results"|"error";
type FilterKey="calm"|"food"|"nature"|"discovery"|"nightlife"|"value";

type StayPin={
 productId:string;placeId:string;name:string;location:string;address:string;
 latitude:number;longitude:number;category:string;imageUrl:string|null;
 price:number|null;fullPrice:number|null;discount:number|null;currency:string;
 onSale:boolean;availability:string;validTo:string|null;demandScore:number|null;trackingUrl:string;
};
type MapPayload={
 version:number;source:string;generatedAt:string;count:number;locationCount:number;
 demandLayer:{status:string;reason:string};
 products:StayPin[];
};
type Solution={
 rank:number;score:number;
 destination:{slug:string;name:string;nameEn:string;tags:string[]};
 stay:{sourceProductId:string;propertyName:string;trackingUrl:string;imageUrl:string|null;price:number|null;currency:string|null;distanceKm:number|null;availability:string|null;semanticScore:number;vectorScore:number;travelerFit:number;valueScore:number;evidenceScore:number};
 matchedSignals:string[];
 reason:string;
};
type SolvePayload={ok:boolean;inventoryChecked:number;solutionCount:number;intentSummary:string;solutions:Solution[]};

const tileConfig:Record<BaseMode,{url:string;attribution:string;maxZoom:number}>={
 map:{url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png",attribution:"© OpenStreetMap contributors",maxZoom:19},
 satellite:{url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",attribution:"Tiles © Esri",maxZoom:19},
 terrain:{url:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",attribution:"© OpenStreetMap contributors · SRTM · OpenTopoMap",maxZoom:17}
};
const filterMeta:Array<{key:FilterKey;label:string}>=[
 {key:"calm",label:"Ηρεμία"},{key:"food",label:"Φαγητό"},{key:"nature",label:"Φύση"},
 {key:"discovery",label:"Ανακάλυψη"},{key:"nightlife",label:"Βραδινή ζωή"},{key:"value",label:"Αξία"}
];

function iso(d:Date){return d.toISOString().slice(0,10)}
function defaultRange(){
 const now=new Date(),day=now.getUTCDay(),days=(5-day+7)%7||7;
 const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+days));
 const end=new Date(start.getTime()+3*86400000);
 return{start:iso(start),end:iso(end)};
}
function money(value:number|null,currency:string|null="EUR"){
 if(value==null||value<=0)return"Τιμή στον πάροχο";
 return new Intl.NumberFormat("el-GR",{style:"currency",currency:currency||"EUR",maximumFractionDigits:0}).format(value);
}
function clamp(n:number,min=0,max=100){return Math.max(min,Math.min(max,n))}
function uniqueMoods(filters:Record<FilterKey,number>):Mood[]{
 const ranked:Array<[Mood,number]>=[
  ["relax",filters.calm],["food",filters.food],["nature",filters.nature],
  ["culture",filters.discovery],["city",filters.nightlife],["romantic",Math.round((filters.calm+filters.discovery)/2)]
 ];
 return ranked.sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
}
function destinationUrl(solution:Solution,trip:TripRequest){
 const q=new URLSearchParams({
  lang:"el",start:trip.startDate,end:trip.endDate,budget:String(trip.budget),origin:trip.origin,
  travelerType:trip.travelerType,mood:trip.moods[0]??"relax",offer:solution.stay.sourceProductId
 });
 return "/escape/"+encodeURIComponent(solution.destination.slug)+"?"+q.toString();
}

export function V50TravelIntelligenceHome(){
 const range=useMemo(defaultRange,[]);
 const[query,setQuery]=useState("Θέλω να ξεφύγω για λίγες μέρες, χωρίς πολύ κόσμο, με καλό φαγητό και κάτι που να αξίζει πραγματικά.");
 const[origin,setOrigin]=useState("Αθήνα");
 const[start,setStart]=useState(range.start),[end,setEnd]=useState(range.end),[budget,setBudget]=useState(800);
 const[filters,setFilters]=useState<Record<FilterKey,number>>({calm:86,food:78,nature:72,discovery:67,nightlife:22,value:76});
 const[baseMode,setBaseMode]=useState<BaseMode>("satellite"),[showAll,setShowAll]=useState(true),[phase,setPhase]=useState<Phase>("idle");
 const[inventory,setInventory]=useState<StayPin[]>([]),[mapMeta,setMapMeta]=useState({count:0,locationCount:0,demandReason:""});
 const[solutions,setSolutions]=useState<Solution[]>([]),[inventoryChecked,setInventoryChecked]=useState(0),[intentSummary,setIntentSummary]=useState("");
 const[activeIndex,setActiveIndex]=useState(0),[selected,setSelected]=useState<StayPin|null>(null),[hovered,setHovered]=useState<StayPin|null>(null),[selectionSource,setSelectionSource]=useState<"map"|"solution"|null>(null),[error,setError]=useState("");
 const mapHost=useRef<HTMLDivElement|null>(null),mapRef=useRef<LeafletMap|null>(null),markerLayer=useRef<LayerGroup|null>(null),tileLayer=useRef<TileLayer|null>(null);
 const[mapReady,setMapReady]=useState(false);

 const topIds=useMemo(()=>new Set(solutions.map(s=>s.stay.sourceProductId)),[solutions]);
 const topRank=useMemo(()=>new Map(solutions.map((s,i)=>[s.stay.sourceProductId,i+1])),[solutions]);
 const activeSolution=solutions[activeIndex]??null;
 const activePin=activeSolution?inventory.find(p=>p.productId===activeSolution.stay.sourceProductId)??null:null;
 const displayPin=hovered??selected??activePin;
 const selectedIsOutsideTop=Boolean(selected&&solutions.length&&!topIds.has(selected.productId)&&selectionSource==="map");

 useEffect(()=>{
  let dead=false;
  fetch("/api/v50/map-stays?limit=1800",{cache:"no-store"}).then(async response=>{
   if(!response.ok)throw new Error("map");
   return await response.json() as MapPayload;
  }).then(payload=>{
   if(dead)return;
   setInventory(Array.isArray(payload.products)?payload.products:[]);
   setMapMeta({count:payload.count??0,locationCount:payload.locationCount??0,demandReason:payload.demandLayer?.reason??""});
  }).catch(()=>{if(!dead)setError("Ο live χάρτης inventory δεν είναι διαθέσιμος αυτή τη στιγμή.")});
  return()=>{dead=true};
 },[]);

 useEffect(()=>{
  let dead=false;
  async function mount(){
   if(!mapHost.current||mapRef.current)return;
   const L=await import("leaflet");if(dead||!mapHost.current)return;
   const map=L.map(mapHost.current,{zoomControl:false,attributionControl:true,minZoom:5,maxZoom:19,worldCopyJump:false}).setView([38.35,23.45],6);
   mapRef.current=map;
   L.control.zoom({position:"bottomright"}).addTo(map);
   const cfg=tileConfig[baseMode],tile=L.tileLayer(cfg.url,{maxZoom:cfg.maxZoom,attribution:cfg.attribution});
   tile.addTo(map);tileLayer.current=tile;setMapReady(true);
   window.setTimeout(()=>map.invalidateSize(),100);
  }
  void mount();
  return()=>{dead=true;mapRef.current?.remove();mapRef.current=null;markerLayer.current=null;tileLayer.current=null};
 },[]);

 useEffect(()=>{
  if(!mapReady||!mapRef.current)return;
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapRef.current)return;
   tileLayer.current?.remove();
   const cfg=tileConfig[baseMode],tile=L.tileLayer(cfg.url,{maxZoom:cfg.maxZoom,attribution:cfg.attribution});
   tile.addTo(mapRef.current);tileLayer.current=tile;
  });
  return()=>{dead=true};
 },[baseMode,mapReady]);

 useEffect(()=>{
  if(!mapReady||!mapRef.current)return;
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapRef.current)return;
   markerLayer.current?.remove();
   const group=L.layerGroup().addTo(mapRef.current);markerLayer.current=group;
   for(const product of inventory){
    if(!showAll&&!topIds.has(product.productId))continue;
    const rank=topRank.get(product.productId),isTop=rank!=null;
    const marker=L.circleMarker([product.latitude,product.longitude],{
     radius:isTop?9:3.2,weight:isTop?2:1,color:isTop?"#ffbe6b":"#dbe8df",
     fillColor:isTop?"#ff8f3d":"#5d7d72",fillOpacity:isTop ? .96 : .56,opacity:isTop?1:.5
    }).addTo(group);
    marker.on("mouseover",()=>setHovered(product));
    marker.on("mouseout",()=>setHovered(current=>current?.productId===product.productId?null:current));
    marker.on("click",()=>{
     setSelected(product);setSelectionSource("map");
     const idx=solutions.findIndex(s=>s.stay.sourceProductId===product.productId);if(idx>=0)setActiveIndex(idx);
    });
   }
  });
  return()=>{dead=true};
 },[inventory,mapReady,showAll,solutions]);

 useEffect(()=>{
  if(!mapRef.current||!activePin||selectionSource==="map")return;
  mapRef.current.flyTo([activePin.latitude,activePin.longitude],Math.max(11,mapRef.current.getZoom()),{duration:.7});
 },[activePin?.productId,selectionSource]);

 function trip(textOverride?:string):TripRequest{
  const moods=uniqueMoods(filters),nights=Math.max(1,Math.round((Date.parse(end)-Date.parse(start))/86400000));
  return{
   origin,startDate:start,endDate:end,month:"flexible",nights,budget,moods,travelerType:"couple",language:"el",
   distancePreference:filters.calm>82?"easy-hop":"any",pace:filters.calm>74?"slow":"balanced",
   hotelStyle:filters.value>84?"value":"any",avoid:filters.calm>84?"crowds":"none",entryMode:"idea",groupSize:2,
   desiredEnergy:filters.calm>76?"restore":filters.nightlife>72?"stimulating":"balanced",
   socialPreference:filters.nightlife>68?"lively":filters.calm>78?"quiet":"balanced",
   noveltyPreference:filters.discovery>76?"surprise":"balanced",mustHave:filters.nature>88?"nature":"none",
   dateFlexibility:"few-days",transportMode:"any",stayLocationPreference:filters.calm>82?"outside":"balanced",
   tripText:(textOverride??query).slice(0,320)
  };
 }

 async function solve(textOverride?:string){
  if(!origin.trim()||!start||!end||Date.parse(end)<=Date.parse(start)){setError("Χρειάζομαι σωστή αφετηρία και ημερομηνίες.");setPhase("error");return}
  setPhase("solving");setError("");setSelectionSource(null);
  const request=trip(textOverride);
  try{
   const response=await fetch("/api/escape/solve-v42",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(request)});
   const payload=await response.json() as SolvePayload;
   if(!response.ok||!payload.ok)throw new Error("solve");
   const next=(payload.solutions??[]).slice(0,5);
   setSolutions(next);setInventoryChecked(payload.inventoryChecked??0);setIntentSummary(payload.intentSummary??"");setActiveIndex(0);setPhase("results");
   const first=next[0]?inventory.find(p=>p.productId===next[0].stay.sourceProductId)??null:null;
   if(first){setSelected(first);setSelectionSource("solution");mapRef.current?.flyTo([first.latitude,first.longitude],11,{duration:.9})}
  }catch{
   setError("Δεν ολοκληρώθηκε η semantic ανάλυση. Ο χάρτης παραμένει διαθέσιμος για εξερεύνηση.");setPhase("error");
  }
 }

 function focusSolution(index:number){
  const solution=solutions[index];if(!solution)return;
  setActiveIndex(index);setSelectionSource("solution");
  const pin=inventory.find(p=>p.productId===solution.stay.sourceProductId)??null;setSelected(pin);
  if(pin)mapRef.current?.flyTo([pin.latitude,pin.longitude],12,{duration:.75});
 }

 function compareSelected(){
  if(!selected)return;
  const next=query+" Εξέτασε και κάτι σαν «"+selected.name+"» στην περιοχή "+selected.location+", αλλά προτίμησε καλύτερο συνολικό fit αν υπάρχει.";
  setQuery(next);void solve(next);
 }

 return <main className={styles.shell}>
  <header className={styles.header}>
   <a className={styles.brand} href="/"><span>TRAVEL</span><b>AI</b></a>
   <div className={styles.headerState}><i/><span>V50 EXPERIENCE PROTOTYPE</span></div>
   <div className={styles.headerMeta}><span>{mapMeta.count?mapMeta.count.toLocaleString("el-GR"):"…"} live stays</span><span>{mapMeta.locationCount?mapMeta.locationCount.toLocaleString("el-GR"):"…"} areas</span></div>
  </header>

  <section className={styles.workspace}>
   <aside className={styles.controlPanel}>
    <div className={styles.intro}>
     <p className={styles.kicker}><Sparkle weight="fill"/> AGENTIC ESCAPE INTELLIGENCE</p>
     <h1>Πες μου <em>τι χρειάζεσαι</em> από αυτό το ταξίδι.</h1>
     <p>Δεν ξεκινάμε από προορισμό. Ο AI ψάχνει μέσα στο πραγματικό inventory και σου δείχνει τις πέντε πιο δυνατές λύσεις πάνω στον χάρτη.</p>
    </div>

    <div className={styles.composer}>
     <div className={styles.composerTop}><Brain size={18}/><span>TRAVEL AGENT</span><small>{phase==="solving"?"Αναλύει τώρα…":"Persistent context ready"}</small></div>
     <textarea value={query} onChange={e=>setQuery(e.target.value)} maxLength={320} aria-label="Περιέγραψε την απόδραση που θέλεις"/>
     <div className={styles.practical}>
      <label><span>ΑΠΟ</span><input value={origin} onChange={e=>setOrigin(e.target.value)}/></label>
      <label><span>ΑΝΑΧΩΡΗΣΗ</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
      <label><span>ΕΠΙΣΤΡΟΦΗ</span><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label>
      <label><span>BUDGET</span><div className={styles.moneyInput}><b>€</b><input type="number" min={150} max={5000} step={50} value={budget} onChange={e=>setBudget(clamp(Number(e.target.value)||150,150,5000))}/></div></label>
     </div>
     <button className={styles.solveButton} onClick={()=>void solve()} disabled={phase==="solving"}>
      {phase==="solving"?"ΑΝΑΛΥΩ 1.700+ ΠΙΘΑΝΟΤΗΤΕΣ":"ΒΡΕΣ ΤΙΣ 5 ΚΑΛΥΤΕΡΕΣ ΛΥΣΕΙΣ"} <ArrowUpRight size={17}/>
     </button>
    </div>

    <div className={styles.dna}>
     <div className={styles.sectionHead}><div><SlidersHorizontal/><span>TRAVEL DNA</span></div><small>Αλλάζει το semantic brief</small></div>
     <div className={styles.sliders}>
      {filterMeta.map(item=><label key={item.key}>
       <div><span>{item.label}</span><b>{filters[item.key]}</b></div>
       <input type="range" min="0" max="100" value={filters[item.key]} onChange={e=>setFilters(v=>({...v,[item.key]:Number(e.target.value)}))}/>
      </label>)}
     </div>
     {solutions.length>0?<button className={styles.recompute} onClick={()=>void solve()}>ΕΠΑΝΑΥΠΟΛΟΓΙΣΕ ΜΕ ΤΑ ΝΕΑ SIGNALS</button>:null}
    </div>

    {phase==="solving"?<div className={styles.thinking}>
     <div className={styles.thinkingPulse}><i/><i/><i/></div>
     <div><b>Semantic intent → real stay inventory → destination fit</b><span>Δεν εμφανίζω demand/weather/events αν δεν υπάρχει πραγματικό evidence.</span></div>
    </div>:null}

    {phase==="results"?<section className={styles.results}>
     <div className={styles.resultTitle}>
      <div><span>TOP {solutions.length}</span><h2>{solutions.length===5?"Πέντε λύσεις. Όχι πέντε τυχαία ξενοδοχεία.":"Οι ισχυρότερες λύσεις που πέρασαν."}</h2></div>
      <small>{inventoryChecked.toLocaleString("el-GR")} offers checked</small>
     </div>
     {intentSummary?<p className={styles.intentSummary}>AI brief · {intentSummary}</p>:null}
     <div className={styles.resultList}>
      {solutions.map((solution,index)=><article key={solution.stay.sourceProductId} className={index===activeIndex?styles.resultActive:""}>
       <button className={styles.resultMain} onClick={()=>focusSolution(index)}>
        <span className={styles.rank}>0{index+1}</span>
        <div><small>{solution.matchedSignals.slice(0,3).join(" · ")||"semantic fit"}</small><h3>{solution.destination.name}</h3><p>{solution.stay.propertyName}</p></div>
        <strong>{solution.score}%</strong>
       </button>
       <div className={styles.resultFoot}><span>{money(solution.stay.price,solution.stay.currency)}</span><span>{solution.stay.valueScore}% value fit</span><a href={destinationUrl(solution,trip())}>ΧΤΙΣΕ ΤΗΝ ΑΠΟΔΡΑΣΗ <ArrowUpRight/></a></div>
      </article>)}
     </div>
    </section>:null}
    {error?<p className={styles.error}>{error}</p>:null}
   </aside>

   <section className={styles.mapStage}>
    <div ref={mapHost} className={styles.map}/>
    <div className={styles.mapShade}/>
    <div className={styles.mapToolbar}>
     <div className={styles.baseModes}>
      <button className={baseMode==="map"?styles.activeMode:""} onClick={()=>setBaseMode("map")}>MAP</button>
      <button className={baseMode==="satellite"?styles.activeMode:""} onClick={()=>setBaseMode("satellite")}>SATELLITE</button>
      <button className={baseMode==="terrain"?styles.activeMode:""} onClick={()=>setBaseMode("terrain")}>TERRAIN</button>
     </div>
     <button className={showAll?styles.activeMode:""} onClick={()=>setShowAll(v=>!v)}><MapPin/> {showAll?"ALL STAYS":"TOP 5"}</button>
    </div>

    <div className={styles.mapLegend}>
     <div><i className={styles.dotAll}/><span>Real stay inventory</span></div>
     <div><i className={styles.dotTop}/><span>Current Top 5</span></div>
     <div className={styles.pending}><span>DEMAND FORECAST</span><b>V50 DATA MODEL</b></div>
    </div>

    <div className={styles.mapStatement}>
     <small>LIVE TRAVEL UNIVERSE</small>
     <b>{mapMeta.count?mapMeta.count.toLocaleString("el-GR"):"…"} πραγματικές βάσεις διαμονής</b>
     <span>Zoom · hover · click · μίλα στον agent</span>
    </div>

    {displayPin?<aside className={styles.pinCard}>
     {displayPin.imageUrl?<div className={styles.pinImage} style={{backgroundImage:"url("+displayPin.imageUrl+")"}}/>:<div className={styles.pinImageFallback}><Waves/></div>}
     <div className={styles.pinBody}>
      <small>{topRank.get(displayPin.productId)?"TOP 5 · #"+topRank.get(displayPin.productId):"LIVE INVENTORY"}</small>
      <h3>{displayPin.name}</h3>
      <p>{displayPin.location||displayPin.address}</p>
      <div><b>{money(displayPin.price,displayPin.currency)}</b><span>{displayPin.onSale&&displayPin.discount?"-"+Math.round(displayPin.discount)+"%":"offer checked"}</span></div>
     </div>
    </aside>:null}

    {selectedIsOutsideTop&&selected?<div className={styles.agentChallenge}>
     <Brain size={21} weight="fill"/>
     <div><small>AI CHALLENGE</small><b>Δεν είναι μέσα στο τρέχον Top 5.</b><p>Δεν θα στο κρύψω επειδή το επέλεξες. Μπορώ να το χρησιμοποιήσω ως reference και να ψάξω παρόμοια επιλογή με καλύτερο συνολικό fit.</p></div>
     <button onClick={compareSelected}>ΒΡΕΣ ΚΑΛΥΤΕΡΟ ΠΑΡΟΜΟΙΟ</button>
    </div>:null}

    {activeSolution&&activePin&&!selectedIsOutsideTop?<div className={styles.solutionDock}>
     <div className={styles.solutionIndex}><span>0{activeIndex+1}</span><small>OF {solutions.length}</small></div>
     <div><small>AI SOLUTION</small><h2>{activeSolution.destination.name}</h2><p>{activeSolution.reason}</p></div>
     <div className={styles.solutionStats}><span><b>{activeSolution.score}%</b> FIT</span><span><b>{activeSolution.stay.semanticScore}%</b> SEMANTIC</span><span><b>{activeSolution.stay.evidenceScore}%</b> EVIDENCE</span></div>
     <a href={destinationUrl(activeSolution,trip())}>EXPLORE <ArrowUpRight/></a>
    </div>:null}

    <div className={styles.mapCorner}><Crosshair/><span>Map, agent και filters μοιράζονται το ίδιο decision state.</span></div>
   </section>
  </section>
 </main>
}
