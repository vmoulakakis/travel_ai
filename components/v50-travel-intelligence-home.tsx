"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import type { DivIcon,LayerGroup,Map as LeafletMap,Marker,TileLayer } from "leaflet";
import {
  ArrowRight,
  Brain,
  ChatCircleDots,
  Compass,
  ForkKnife,
  Leaf,
  MapPin,
  MoonStars,
  Mountains,
  PaperPlaneTilt,
  Sparkle,
  Wallet
} from "@phosphor-icons/react";
import styles from "./v50-travel-intelligence-home.module.css";

type BaseMode="map"|"satellite"|"terrain";
type FilterKey="calm"|"food"|"nature"|"discovery"|"nightlife"|"value";
type Filters=Record<FilterKey,number>;
type Question={id:string;text:string;quickReplies:Array<{label:string;value:string}>};
type Turn={id:string;role:"user"|"agent";text:string};
type StayPin={
 productId:string;placeId:string;name:string;location:string;address:string;latitude:number;longitude:number;
 category:string;imageUrl:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;
 onSale:boolean;availability:string;validTo:string|null;demandScore:number|null;trackingUrl:string;
};
type Solution={
 rank:number;score:number;
 destination:{
  slug:string;name:string;regionGroup:string;latitude:number;longitude:number;explorationRole:string;
  explorationReason:string;why:string;seasonNote:string;effortLabel:string;budgetLabel:string;tags:string[];
  weather?:unknown;
 };
 stay:{
  productId:string;name:string;description:string|null;price:number|null;fullPrice:number|null;discount:number|null;
  currency:string;latitude:number;longitude:number;imageUrl:string|null;trackingUrl:string;availability:string;
  availabilityConfidence:string;distanceKm:number|null;
 };
 liveOfferCount:number;
};
type AgentPayload={
 ok:boolean;state:"clarify"|"results"|"challenge"|"error";agentMessage:string;question?:Question;
 interpreted?:{confidence?:number;signals?:string[];summary?:string;profileSummary?:string;startDate?:string;endDate?:string;nights?:number;mustHave?:string;travelerType?:string};
 inventory?:{catalogSize:number;eligibleCount:number;resultCount:number;stayVerifiedSolutions:number};
 feasibility?:string;solutions?:Solution[];
};
type MapPayload={count:number;locationCount:number;products:StayPin[];fullUniverse?:boolean};

const tileConfig:Record<BaseMode,{url:string;attribution:string;maxZoom:number}>={
 map:{url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png",attribution:"© OpenStreetMap contributors",maxZoom:19},
 satellite:{url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}.png",attribution:"Tiles © Esri",maxZoom:19},
 terrain:{url:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",attribution:"© OpenStreetMap · SRTM · OpenTopoMap",maxZoom:17}
};

const filterMeta:Array<{key:FilterKey;label:string;icon:typeof Leaf}>=[
 {key:"calm",label:"Ηρεμία",icon:MoonStars},
 {key:"food",label:"Γεύση",icon:ForkKnife},
 {key:"nature",label:"Φύση",icon:Leaf},
 {key:"discovery",label:"Ανακάλυψη",icon:Compass},
 {key:"nightlife",label:"Ζωντάνια",icon:Sparkle},
 {key:"value",label:"Αξία",icon:Wallet}
];

const seedFilters:Filters={calm:72,food:66,nature:70,discovery:70,nightlife:28,value:68};
const uid=()=>Math.random().toString(36).slice(2);
const money=(value:number|null,currency="EUR")=>value&&value>0
 ?new Intl.NumberFormat("el-GR",{style:"currency",currency,maximumFractionDigits:0}).format(value)
 :"Τιμή στον πάροχο";

export function V50TravelIntelligenceHome(){
 const[baseMode,setBaseMode]=useState<BaseMode>("satellite");
 const[inventory,setInventory]=useState<StayPin[]>([]);
 const[mapMeta,setMapMeta]=useState({count:0,locationCount:0,fullUniverse:false});
 const[filters,setFilters]=useState<Filters>(seedFilters);
 const[origin,setOrigin]=useState("Αθήνα");
 const[budget,setBudget]=useState(800);
 const[input,setInput]=useState("Βρες μου ένα μοναδικό ΣΚ βουνό μετά τις 01/10/2026");
 const[turns,setTurns]=useState<Turn[]>([
  {id:"welcome",role:"agent",text:"Πες μου την απόδραση όπως θα την έλεγες σε έναν άνθρωπο. Αν κάτι σημαντικό λείπει, θα σε ρωτήσω πριν σου προτείνω."}
 ]);
 const[answers,setAnswers]=useState<Record<string,string>>({});
 const[question,setQuestion]=useState<Question|null>(null);
 const[phase,setPhase]=useState<"ready"|"thinking"|"results"|"error">("ready");
 const[solutions,setSolutions]=useState<Solution[]>([]);
 const[activeIndex,setActiveIndex]=useState(0);
 const[activePin,setActivePin]=useState<StayPin|null>(null);
 const[mapReady,setMapReady]=useState(false);
 const[filtersOpen,setFiltersOpen]=useState(true);

 const mapHost=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<LeafletMap|null>(null);
 const tileLayer=useRef<TileLayer|null>(null);
 const inventoryLayer=useRef<LayerGroup|null>(null);
 const topLayer=useRef<LayerGroup|null>(null);
 const markerRefs=useRef<Map<string,Marker>>(new Map());
 const transcript=useRef<HTMLDivElement|null>(null);

 const currentSolution=solutions[activeIndex]??null;
 const topIds=useMemo(()=>new Set(solutions.map(x=>x.stay.productId)),[solutions]);
 const topRanks=useMemo(()=>new Map(solutions.map((x,i)=>[x.stay.productId,i+1])),[solutions]);

 useEffect(()=>{
  transcript.current?.scrollTo({top:transcript.current.scrollHeight,behavior:"smooth"});
 },[turns,question,phase]);

 useEffect(()=>{
  let dead=false;
  fetch("/api/v50/map-stays?limit=1800",{cache:"no-store"})
   .then(async r=>{if(!r.ok)throw new Error("map");return await r.json() as MapPayload})
   .then(data=>{
    if(dead)return;
    const products=Array.isArray(data.products)?data.products:[];
    setInventory(products);
    setMapMeta({count:data.count??products.length,locationCount:data.locationCount??0,fullUniverse:data.fullUniverse!==false});
   })
   .catch(()=>{if(!dead)setTurns(v=>[...v,{id:uid(),role:"agent",text:"Ο live χάρτης δεν φόρτωσε όλα τα stays. Η συνομιλία παραμένει διαθέσιμη και δεν θα επινοήσω pins."}])});
  return()=>{dead=true};
 },[]);

 useEffect(()=>{
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapHost.current||mapRef.current)return;
   const map=L.map(mapHost.current,{zoomControl:false,attributionControl:true,minZoom:5,maxZoom:19,worldCopyJump:false,preferCanvas:true}).setView([38.55,23.4],6);
   mapRef.current=map;
   L.control.zoom({position:"bottomright"}).addTo(map);
   const cfg=tileConfig[baseMode],tile=L.tileLayer(cfg.url,{maxZoom:cfg.maxZoom,attribution:cfg.attribution});
   tile.addTo(map);tileLayer.current=tile;
   setMapReady(true);
   window.setTimeout(()=>map.invalidateSize(),120);
  });
  return()=>{dead=true;mapRef.current?.remove();mapRef.current=null;inventoryLayer.current=null;topLayer.current=null;markerRefs.current.clear()};
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
   inventoryLayer.current?.remove();
   const group=L.layerGroup().addTo(mapRef.current);inventoryLayer.current=group;
   const topSet=topIds;
   for(const p of inventory){
    if(topSet.has(p.productId))continue;
    const marker=L.circleMarker([p.latitude,p.longitude],{
      radius:2.6,weight:1,color:"#f3eadb",fillColor:"#62877a",fillOpacity:.54,opacity:.34
    }).addTo(group);
    marker.on("mouseover",()=>setActivePin(p));
    marker.on("mouseout",()=>setActivePin(current=>current?.productId===p.productId?null:current));
    marker.on("click",()=>void challengeStay(p));
   }
  });
  return()=>{dead=true};
 },[inventory,mapReady,solutions]);

 useEffect(()=>{
  if(!mapReady||!mapRef.current)return;
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapRef.current)return;
   topLayer.current?.remove();markerRefs.current.clear();
   const group=L.layerGroup().addTo(mapRef.current);topLayer.current=group;
   for(const [i,s] of solutions.entries()){
    const active=i===activeIndex;
    const html=`<div class="${styles.rankMarker} ${active?styles.rankMarkerActive:""}">
      <span class="${styles.rankMarkerHalo}"></span>
      <span class="${styles.rankMarkerNum}">${i+1}</span>
      <span class="${styles.rankMarkerScore}">${Math.round(s.score)}%</span>
    </div>`;
    const icon:L.DivIcon=L.divIcon({html,className:styles.rankMarkerHost,iconSize:[58,58],iconAnchor:[29,50]});
    const marker=L.marker([s.stay.latitude,s.stay.longitude],{icon,zIndexOffset:1000-i*10}).addTo(group);
    marker.on("click",()=>focusSolution(i));
    marker.on("mouseover",()=>focusSolution(i,false));
    markerRefs.current.set(s.stay.productId,marker);
   }
  });
  return()=>{dead=true};
 },[solutions,activeIndex,mapReady]);

 async function callAgent(userText:string,nextAnswers=answers,selectedStay?:StayPin){
  const clean=userText.trim();if(!clean)return;
  setPhase("thinking");setQuestion(null);
  const prior=turns.filter(t=>t.role==="user").map(t=>t.text).join(" · ").slice(-1000);
  setTurns(v=>[...v,{id:uid(),role:"user",text:clean}]);
  try{
    const response=await fetch("/api/v50/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      userText:clean,priorUserText:prior,origin,budget,filters,answers:nextAnswers,
      currentTopIds:solutions.map(x=>x.stay.productId),
      selectedStay:selectedStay?{productId:selectedStay.productId,name:selectedStay.name,location:selectedStay.location,price:selectedStay.price}:null
    })});
    const payload=await response.json() as AgentPayload;
    if(!response.ok||!payload.ok)throw new Error(payload.agentMessage||"agent_failed");
    setTurns(v=>[...v,{id:uid(),role:"agent",text:payload.agentMessage}]);
    if(payload.state==="clarify"){
      setQuestion(payload.question??null);setPhase("ready");return;
    }
    if(payload.state==="challenge"){
      setPhase(solutions.length?"results":"ready");return;
    }
    const next=payload.solutions??[];
    setSolutions(next);setActiveIndex(0);setPhase("results");
    if(next.length&&mapRef.current){
      const L=await import("leaflet");
      const bounds=L.latLngBounds(next.map(s=>[s.stay.latitude,s.stay.longitude] as [number,number]));
      mapRef.current.fitBounds(bounds,{paddingTopLeft:[470,100],paddingBottomRight:[360,220],maxZoom:9});
    }
  }catch(error){
    setPhase("error");
    setTurns(v=>[...v,{id:uid(),role:"agent",text:error instanceof Error?error.message:"Δεν ολοκληρώθηκε ο έλεγχος. Δεν θα σου δώσω πρόχειρη απάντηση."}]);
  }
 }

 function submit(){
  const clean=input.trim();if(!clean)return;
  setInput("");void callAgent(clean);
 }

 function answerQuick(reply:{label:string;value:string}){
  if(!question)return;
  const next={...answers,[question.id]:reply.value};setAnswers(next);
  void callAgent(reply.label,next);
 }

 async function challengeStay(pin:StayPin){
  setActivePin(pin);
  if(!solutions.length||topIds.has(pin.productId))return;
  await callAgent(`Μου άρεσε το ${pin.name}. Τι λες;`,answers,pin);
 }

 function focusSolution(index:number,fly=true){
  const s=solutions[index];if(!s)return;
  setActiveIndex(index);setActivePin(null);
  if(fly&&mapRef.current)mapRef.current.flyTo([s.stay.latitude,s.stay.longitude],Math.max(11,mapRef.current.getZoom()),{duration:.82});
 }

 function updateFilter(key:FilterKey,value:number){setFilters(v=>({...v,[key]:value}))}

 return <main className={styles.experience}>
  <div ref={mapHost} className={styles.map}/>
  <div className={styles.mapGrade}/>

  <header className={styles.nav}>
    <a className={styles.brand} href="/" aria-label="TravelAI home"><span>TRAVEL</span><b>AI</b></a>
    <div className={styles.navCenter}><span className={styles.liveDot}/><span>{mapMeta.count?mapMeta.count.toLocaleString("el-GR"):"…"} πραγματικά stays</span><i/> <span>Agentic Escape Intelligence</span></div>
    <div className={styles.mapModes}>
      {(["map","satellite","terrain"] as BaseMode[]).map(mode=><button key={mode} className={baseMode===mode?styles.mapModeActive:""} onClick={()=>setBaseMode(mode)}>{mode==="map"?"MAP":mode==="satellite"?"SATELLITE":"TERRAIN"}</button>)}
    </div>
  </header>

  <section className={styles.agentDeck}>
    <div className={styles.agentHero}>
      <div className={styles.agentSeal}><Brain weight="fill"/><span>TRAVEL<br/>INTELLIGENCE</span></div>
      <div>
        <p className={styles.eyebrow}>YOUR ESCAPE, UNDERSTOOD</p>
        <h1>Δεν ψάχνω μέρος.<br/><em>Καταλαβαίνω την απόδραση.</em></h1>
      </div>
    </div>

    <div className={styles.transcript} ref={transcript}>
      {turns.map(turn=><div key={turn.id} className={turn.role==="agent"?styles.agentTurn:styles.userTurn}>
        <span className={styles.turnRole}>{turn.role==="agent"?"AI AGENT":"ΕΣΥ"}</span>
        <p>{turn.text}</p>
      </div>)}
      {phase==="thinking"?<div className={styles.thinkingTurn}><span/><span/><span/><small>Ελέγχω intent, μνήμη, πραγματικά stays και constraints…</small></div>:null}
      {question?.quickReplies?.length?<div className={styles.quickReplies}>
        {question.quickReplies.map(reply=><button key={reply.value} onClick={()=>answerQuick(reply)}>{reply.label}<ArrowRight/></button>)}
      </div>:null}
    </div>

    <div className={styles.contextStrip}>
      <label><span>Αφετηρία</span><input value={origin} onChange={e=>setOrigin(e.target.value)}/></label>
      <label><span>Budget</span><div><b>€</b><input type="number" min={150} max={5000} step={50} value={budget} onChange={e=>setBudget(Number(e.target.value)||150)}/></div></label>
      <button onClick={()=>setFiltersOpen(v=>!v)}><Sparkle/> Travel DNA</button>
    </div>

    <div className={styles.composer}>
      <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit()}}} placeholder="Πες μου τι θέλεις, τι σε κουράζει, τι δεν θέλεις…"/>
      <button onClick={submit} disabled={phase==="thinking"||!input.trim()} aria-label="Στείλε στον AI agent"><PaperPlaneTilt weight="fill"/></button>
    </div>
    <p className={styles.agentPromise}>Δεν θα σου πετάξω προορισμούς αν δεν έχω καταλάβει αρκετά. Θα ρωτήσω πρώτα.</p>
  </section>

  <section className={styles.filterDock} data-open={filtersOpen}>
    <button className={styles.filterToggle} onClick={()=>setFiltersOpen(v=>!v)}><Sparkle/><span>TRAVEL DNA</span></button>
    <div className={styles.filterRail}>
      {filterMeta.map(item=>{
        const Icon=item.icon,value=filters[item.key];
        return <label key={item.key} className={styles.dial} style={{"--value":value+"%"} as React.CSSProperties}>
          <span className={styles.dialRing}><Icon/><b>{value}</b></span>
          <span className={styles.dialLabel}>{item.label}</span>
          <input aria-label={item.label} type="range" min="0" max="100" value={value} onChange={e=>updateFilter(item.key,Number(e.target.value))}/>
        </label>;
      })}
    </div>
  </section>

  {solutions.length?<section className={styles.resultRail}>
    <div className={styles.resultRailHead}><span>AI SHORTLIST</span><b>{solutions.length} λύσεις που πέρασαν τον έλεγχο</b></div>
    <div className={styles.resultCards}>
      {solutions.map((s,i)=><button key={s.stay.productId} className={i===activeIndex?styles.resultCardActive:styles.resultCard} onClick={()=>focusSolution(i)}>
        <span className={styles.cardRank}>0{i+1}</span>
        <span className={styles.cardCopy}><small>{s.destination.explorationRole.replaceAll("_"," ")}</small><strong>{s.destination.name}</strong><em>{s.stay.name}</em></span>
        <span className={styles.cardScore}>{s.score}%</span>
      </button>)}
    </div>
  </section>:null}

  {currentSolution?<aside className={styles.storyCard}>
    <div className={styles.storyImage} style={currentSolution.stay.imageUrl?{backgroundImage:`url("${currentSolution.stay.imageUrl}")`}:undefined}>
      <div className={styles.photoGrade}/>
      <div className={styles.photoBadge}><span>0{activeIndex+1}</span><small>AI PICK</small></div>
      <div className={styles.droneLens} style={currentSolution.stay.imageUrl?{backgroundImage:`url("${currentSolution.stay.imageUrl}")`}:undefined}><span>AREA<br/>LENS</span></div>
      <div className={styles.imageCaption}><small>{currentSolution.destination.explorationRole.replaceAll("_"," ")}</small><h2>{currentSolution.destination.name}</h2></div>
    </div>
    <div className={styles.storyBody}>
      <div className={styles.storyMetric}><span>FIT</span><b>{currentSolution.score}%</b></div>
      <div className={styles.storyMetric}><span>LIVE OPTIONS</span><b>{currentSolution.liveOfferCount}</b></div>
      <div className={styles.storyMetric}><span>STAY</span><b>{money(currentSolution.stay.price,currentSolution.stay.currency)}</b></div>
      <p>{currentSolution.destination.why}</p>
      <div className={styles.storyFacts}><span><Mountains/> {currentSolution.destination.effortLabel}</span><span><MapPin/> {currentSolution.stay.distanceKm==null?"περιοχή":currentSolution.stay.distanceKm.toFixed(1)+" km από κέντρο"}</span></div>
      <div className={styles.storyStay}><small>ΠΡΑΓΜΑΤΙΚΟ STAY</small><strong>{currentSolution.stay.name}</strong><span>{currentSolution.destination.seasonNote}</span></div>
      <a className={styles.offerButton} href={currentSolution.stay.trackingUrl} target="_blank" rel="sponsored nofollow noopener noreferrer">ΔΕΣ ΤΗΝ ΠΡΟΣΦΟΡΑ <ArrowRight/></a>
    </div>
  </aside>:null}

  {activePin&&!currentSolution?<aside className={styles.hoverCard}>
    <span>LIVE INVENTORY</span><strong>{activePin.name}</strong><small>{activePin.location}</small><b>{money(activePin.price,activePin.currency)}</b>
  </aside>:null}

  <div className={styles.mapHint}><MapPin/><span>Τα μικρά pins είναι το inventory σου. Τα μεγάλα ranked pins είναι οι λύσεις του agent.</span></div>
 </main>
}
