"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import type { LayerGroup,Map as LeafletMap,TileLayer } from "leaflet";
import { ArrowRight,Brain,ChatCircleDots,Crosshair,MapPin,PaperPlaneTilt,Sparkle } from "@phosphor-icons/react";
import styles from "./v50-travel-intelligence-home.module.css";

type BaseMode="map"|"satellite"|"terrain";
type FilterKey="calm"|"food"|"nature"|"discovery"|"nightlife"|"value";
type Filters=Record<FilterKey,number>;
type Question={id:"dates"|"companions"|"outcome"|"friction";text:string;quickReplies:Array<{label:string;value:string}>};
type Message={id:string;role:"user"|"agent";text:string};
type StayPin={productId:string;placeId:string;name:string;location:string;address:string;latitude:number;longitude:number;category:string;imageUrl:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;onSale:boolean;availability:string;validTo:string|null;demandScore:number|null;trackingUrl:string;destinationSlug:string|null};
type MapPayload={count:number;locationCount:number;products:StayPin[]};
type HeroMedia={id:string;location:string;imageUrl:string;propertyCount:number;minPrice:number|null;currency:string;latitude:number|null;longitude:number|null};
type Solution={rank:number;score:number;destination:{slug:string;name:string;regionGroup:string;latitude:number;longitude:number;explorationRole:string;explorationReason:string;why:string;seasonNote:string;effortLabel:string;budgetLabel:string;tags:string[]};stay:{productId:string;name:string;description:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;latitude:number;longitude:number;imageUrl:string|null;trackingUrl:string;availability:string;availabilityConfidence:string;distanceKm:number|null};liveOfferCount:number};
type AgentPayload={ok:boolean;state:"clarify"|"results"|"challenge"|"error";agentMessage:string;question?:Question;interpreted?:{summary?:string;profileSummary?:string;startDate?:string;endDate?:string;signals?:string[];confidence?:number};inventory?:{catalogSize:number;eligibleCount:number;resultCount:number;stayVerifiedSolutions:number};feasibility?:string;solutions?:Solution[];trip?:{startDate:string;endDate:string;travelerType:string;moods:string[];budget:number;origin:string}};
type RatingView={label:string;provider:string;reviewCount:number|null;summary?:string};

const tileConfig:Record<BaseMode,{url:string;attribution:string;maxZoom:number}>={
 map:{url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png",attribution:"© OpenStreetMap contributors",maxZoom:19},
 satellite:{url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",attribution:"Tiles © Esri",maxZoom:19},
 terrain:{url:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",attribution:"© OpenStreetMap contributors · OpenTopoMap",maxZoom:17}
};

const filterMeta:Array<{key:FilterKey;label:string;caption:string}>=[
 {key:"calm",label:"Ηρεμία",caption:"ρυθμός"},
 {key:"food",label:"Γεύση",caption:"φαγητό"},
 {key:"nature",label:"Φύση",caption:"τοπίο"},
 {key:"discovery",label:"Ανακάλυψη",caption:"novelty"},
 {key:"nightlife",label:"Ζωντάνια",caption:"βράδυ"},
 {key:"value",label:"Αξία",caption:"budget"}
];

const defaults:Filters={calm:72,food:68,nature:70,discovery:64,nightlife:24,value:74};
const id=()=>typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():String(Date.now());
const money=(n:number|null,c="EUR")=>n?new Intl.NumberFormat("el-GR",{style:"currency",currency:c,maximumFractionDigits:0}).format(n):"τιμή στον πάροχο";

export function V50TravelIntelligenceHome(){
 const [baseMode,setBaseMode]=useState<BaseMode>("satellite");
 const [filters,setFilters]=useState<Filters>(defaults);
 const [origin,setOrigin]=useState("Αθήνα");
 const [budget,setBudget]=useState(800);
 const [draft,setDraft]=useState("");
 const [messages,setMessages]=useState<Message[]>([
   {id:"agent-initial",role:"agent",text:"Πες μου τι θα έκανε αυτή την απόδραση να αξίζει πραγματικά για σένα. Δεν χρειάζεται να ξέρεις προορισμό."}
 ]);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [question,setQuestion]=useState<Question|null>(null);
 const [busy,setBusy]=useState(false);
 const [solutions,setSolutions]=useState<Solution[]>([]);
 const [active,setActive]=useState(0);
 const [inventory,setInventory]=useState<StayPin[]>([]);
 const [heroMedia,setHeroMedia]=useState<HeroMedia[]>([]);
 const [mapMeta,setMapMeta]=useState({count:0,locationCount:0});
 const [selectedPin,setSelectedPin]=useState<StayPin|null>(null);
 const [hoverPin,setHoverPin]=useState<StayPin|null>(null);
 const [ratings,setRatings]=useState<Record<string,RatingView|null>>({});
 const [lastTrip,setLastTrip]=useState<AgentPayload["trip"]|null>(null);
 const [showAll,setShowAll]=useState(true);
 const [cinematicTarget,setCinematicTarget]=useState<string|null>(null);
 const mapHost=useRef<HTMLDivElement|null>(null);
 const resultsRef=useRef<HTMLElement|null>(null);
 const mapRef=useRef<LeafletMap|null>(null);
 const tileRef=useRef<TileLayer|null>(null);
 const markerLayer=useRef<LayerGroup|null>(null);
 const [mapReady,setMapReady]=useState(false);

 const activeSolution=solutions[active]??null;
 const topIds=useMemo(()=>new Set(solutions.map(x=>x.stay.productId)),[solutions]);
 const heroImages=useMemo(()=>heroMedia.length?heroMedia.map(x=>x.imageUrl):inventory.filter(x=>x.imageUrl).slice(0,8).map(x=>x.imageUrl as string),[heroMedia,inventory]);
 const hero=activeSolution?.stay.imageUrl??heroImages[0]??null;
 const detail=activeSolution?.stay.imageUrl??heroImages[1]??hero;
 const userHistory=messages.filter(x=>x.role==="user").slice(-5).map(x=>x.text).join(" · ").slice(-700);

 function landingUrl(slug:string|null|undefined,productId:string){
  if(!slug)return null;
  const q=new URLSearchParams();
  if(lastTrip){
   q.set("start",lastTrip.startDate);q.set("end",lastTrip.endDate);q.set("budget",String(lastTrip.budget));
   q.set("origin",lastTrip.origin);q.set("travelerType",lastTrip.travelerType);
   if(lastTrip.moods?.[0])q.set("mood",lastTrip.moods[0]);
  }
  const suffix=q.toString()?"?"+q.toString():"";
  return "/escape/"+encodeURIComponent(slug)+"/stay/"+encodeURIComponent(productId)+suffix;
 }

 async function ensureRating(productId:string,propertyName:string,destinationSlug:string|null|undefined,destinationName:string,latitude:number,longitude:number){
  if(!destinationSlug||Object.prototype.hasOwnProperty.call(ratings,productId))return;
  setRatings(v=>({...v,[productId]:null}));
  try{
   const response=await fetch("/api/v50/stay-rating",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    propertyName,sourceProductId:productId,destinationSlug,destinationName,latitude,longitude
   })});
   const payload=await response.json() as {ok?:boolean;result?:{primary?:{rating:number;scale:number;provider:string;reviewCount:number|null}|null}};
   const p=payload.result?.primary;
   setRatings(v=>({...v,[productId]:p?{label:(p.scale===5?p.rating.toFixed(1)+"★":Math.round(p.rating)+"/"+p.scale),provider:p.provider,reviewCount:p.reviewCount}:null}));
  }catch{setRatings(v=>({...v,[productId]:null}))}
 }

 useEffect(()=>{
  fetch("/api/v50/map-stays?limit=1800",{cache:"no-store"}).then(r=>r.json()).then((p:MapPayload)=>{
    setInventory(Array.isArray(p.products)?p.products:[]);
    setMapMeta({count:p.count??0,locationCount:p.locationCount??0});
  }).catch(()=>{});
  fetch("/api/v50/hero-media",{cache:"no-store"}).then(r=>r.json()).then((p:{items?:HeroMedia[]})=>setHeroMedia(Array.isArray(p.items)?p.items:[])).catch(()=>{});
 },[]);

 useEffect(()=>{
  let cancelled=false;
  void import("leaflet").then(L=>{
    if(cancelled||!mapHost.current||mapRef.current)return;
    const map=L.map(mapHost.current,{zoomControl:false,attributionControl:true,minZoom:5,maxZoom:19}).setView([38.35,23.45],6);
    L.control.zoom({position:"bottomright"}).addTo(map);
    mapRef.current=map;
    const cfg=tileConfig[baseMode];
    tileRef.current=L.tileLayer(cfg.url,{attribution:cfg.attribution,maxZoom:cfg.maxZoom}).addTo(map);
    setMapReady(true);
  });
  return()=>{cancelled=true;mapRef.current?.remove();mapRef.current=null};
 },[]);

 useEffect(()=>{
  if(!mapReady||!mapRef.current)return;
  void import("leaflet").then(L=>{
    tileRef.current?.remove();
    const cfg=tileConfig[baseMode];
    tileRef.current=L.tileLayer(cfg.url,{attribution:cfg.attribution,maxZoom:cfg.maxZoom}).addTo(mapRef.current!);
  });
 },[baseMode,mapReady]);

 useEffect(()=>{
  if(!mapReady||!mapRef.current)return;
  let cancelled=false;
  void import("leaflet").then(L=>{
    if(cancelled||!mapRef.current)return;
    markerLayer.current?.remove();
    const group=L.layerGroup().addTo(mapRef.current);
    markerLayer.current=group;
    if(showAll){
      for(const p of inventory){
        if(topIds.has(p.productId))continue;
        const icon=L.divIcon({className:"v50StayStarHost",html:'<div class="v50StayStar" aria-hidden="true">★</div>',iconSize:[18,18],iconAnchor:[9,9]});
        const m=L.marker([p.latitude,p.longitude],{icon,zIndexOffset:50}).addTo(group);
        m.on("mouseover",()=>{setHoverPin(p);void ensureRating(p.productId,p.name,p.destinationSlug,p.location||p.address||"Ελλάδα",p.latitude,p.longitude)});
        m.on("click",()=>{setHoverPin(p);setSelectedPin(p);void challengeStay(p)});
      }
    }
    solutions.forEach((s,index)=>{
      const isActive=index===active;
      const html='<div class="v50TopStar '+(isActive?"is-active":"")+'"><span class="v50StarGlyph">★</span><span class="v50StarRank">'+(index+1)+'</span><span class="v50StarScore">'+Math.round(s.score)+'%</span></div>';
      const icon=L.divIcon({className:"v50PinHost",html,iconSize:[72,72],iconAnchor:[36,36]});
      const m=L.marker([s.stay.latitude,s.stay.longitude],{icon,zIndexOffset:1200-index*10}).addTo(group);
      m.on("mouseover",()=>{setActive(index);setHoverPin(null);void ensureRating(s.stay.productId,s.stay.name,s.destination.slug,s.destination.name,s.stay.latitude,s.stay.longitude)});
      m.on("click",()=>{setActive(index);setSelectedPin(null);setHoverPin(null);mapRef.current?.flyTo([s.stay.latitude,s.stay.longitude],12,{duration:.75})});
    });
  });
  return()=>{cancelled=true};
 },[inventory,solutions,active,showAll,mapReady]);

 useEffect(()=>{
  if(activeSolution&&mapRef.current){
    mapRef.current.flyTo([activeSolution.stay.latitude,activeSolution.stay.longitude],11,{duration:.8});
  }
  if(activeSolution){void ensureRating(activeSolution.stay.productId,activeSolution.stay.name,activeSolution.destination.slug,activeSolution.destination.name,activeSolution.stay.latitude,activeSolution.stay.longitude)}
 },[activeSolution?.stay.productId]);

 async function fetchAgentPayload(body:Record<string,unknown>){
  let lastError:unknown=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch("/api/v50/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const payload=await response.json() as AgentPayload;
      if(response.ok||payload?.agentMessage)return payload;
      lastError=new Error("agent_response_unavailable");
    }catch(error){lastError=error}
    if(attempt===0)await new Promise(resolve=>setTimeout(resolve,450));
  }
  throw lastError instanceof Error?lastError:new Error("agent_unavailable");
 }

 async function callAgent(text:string,nextAnswers=answers,selected?:StayPin){
  const clean=text.trim();
  if(!clean&&!selected)return;
  setBusy(true);
  if(clean)setMessages(v=>[...v,{id:id(),role:"user",text:clean}]);
  try{
    const payload=await fetchAgentPayload({
      userText:clean||"Θέλω να συγκρίνεις αυτή την επιλογή.",
      priorUserText:userHistory,
      origin,budget,filters,answers:nextAnswers,
      lastQuestionId:question?.id,
      currentTopIds:solutions.map(x=>x.stay.productId),
      selectedStay:selected?{productId:selected.productId,name:selected.name,location:selected.location,price:selected.price}:null
    });
    setMessages(v=>[...v,{id:id(),role:"agent",text:payload.agentMessage||"Θέλω ακόμη ένα στοιχείο για να συνεχίσω σωστά."}]);
    setQuestion(payload.question??null);
    if(payload.state==="results"&&payload.solutions){
      setSolutions(payload.solutions);
      setLastTrip(payload.trip??null);
      setActive(0);
      setSelectedPin(null);
      requestAnimationFrame(()=>resultsRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));
    }
  }catch{
    setQuestion(null);
    setMessages(v=>[...v,{id:id(),role:"agent",text:"Έχω ήδη αρκετά για να συνεχίσουμε χωρίς να ξαναρχίσουμε από την αρχή. Το brief σου παραμένει ενεργό — πες μου τώρα τι θέλεις να βελτιστοποιήσω περισσότερο: διαδρομή, διαμονή ή εμπειρίες."}]);
  }finally{
    setBusy(false);setDraft("");
  }
 }

 async function replyQuick(label:string,value:string){
  if(!question)return;
  const next={...answers,[question.id]:value};
  setAnswers(next);
  setMessages(v=>[...v,{id:id(),role:"user",text:label}]);
  setBusy(true);
  try{
    const payload=await fetchAgentPayload({
      userText:label,priorUserText:userHistory,origin,budget,filters,answers:next,lastQuestionId:question?.id
    });
    setMessages(v=>[...v,{id:id(),role:"agent",text:payload.agentMessage}]);
    setQuestion(payload.question??null);
    if(payload.state==="results"&&payload.solutions){setSolutions(payload.solutions);setLastTrip(payload.trip??null);setActive(0);requestAnimationFrame(()=>resultsRef.current?.scrollIntoView({behavior:"smooth",block:"start"}))}
  }catch{
    setQuestion(null);
    setMessages(v=>[...v,{id:id(),role:"agent",text:"Ωραία — το brief είναι αρκετά καθαρό και δεν χρειάζεται να σε ξαναρωτήσω τα ίδια. Συνέχισε με αυτό που σε νοιάζει περισσότερο και θα χτίσω πάνω στις επιλογές σου."}]);
  }finally{setBusy(false)}
 }

 async function challengeStay(p:StayPin){
  if(!solutions.length)return;
  await callAgent("",answers,p);
 }

 function focus(index:number){
  setActive(index);setSelectedPin(null);
  const s=solutions[index];
  if(s)mapRef.current?.flyTo([s.stay.latitude,s.stay.longitude],12,{duration:.75});
 }

 function openCinematicSolution(solution:Solution){
  const href=landingUrl(solution.destination.slug,solution.stay.productId);
  if(!href)return;
  setActive(Math.max(0,solutions.findIndex(x=>x.stay.productId===solution.stay.productId)));
  setBaseMode("satellite");
  setCinematicTarget(solution.stay.productId);
  mapRef.current?.flyTo([solution.stay.latitude,solution.stay.longitude],14,{duration:1.15});
  window.setTimeout(()=>{window.location.assign(href)},1100);
 }

 function showAllSolutions(){
  if(!mapRef.current||!solutions.length)return;
  void import("leaflet").then(L=>{
   const bounds=L.latLngBounds(solutions.map(s=>[s.stay.latitude,s.stay.longitude] as [number,number]));
   mapRef.current?.fitBounds(bounds,{padding:[70,70],maxZoom:9});
  });
 }

 return <main className={styles.shell}>
  <header className={styles.topbar}>
    <a href="/" className={styles.brand}>TRAVEL<b>AI</b></a>
    <div className={styles.live}><i/> AGENT ONLINE · LIVE INVENTORY</div>
    <div className={styles.topMeta}><span>{mapMeta.count?mapMeta.count.toLocaleString("el-GR"):"…"} stays</span><span>{mapMeta.locationCount?mapMeta.locationCount.toLocaleString("el-GR"):"…"} areas</span></div>
  </header>

  <section className={styles.stage}>
    <div className={styles.story}>
      <div className={styles.heroMedia} style={hero?{backgroundImage:"url("+hero+")"}:undefined}>
        <div className={styles.heroVeil}/>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><Sparkle weight="fill"/> AI ESCAPE INTELLIGENCE</p>
          <h1>Δεν ψάχνεις<br/><em>προορισμό.</em><br/>Ψάχνεις το σωστό <span>feeling.</span></h1>
          <p>Μίλα φυσικά. Ο agent ρωτά μόνο ό,τι χρειάζεται, συγκρίνει πραγματικές επιλογές και σε σταματά όταν η επιλογή σου δεν ταιριάζει σε αυτό που ζήτησες.</p>
        </div>
        {detail?<div className={styles.droneCircle} style={{backgroundImage:"url("+detail+")"}}><span>LIVE<br/>DETAIL</span></div>:null}
        <div className={styles.heroIndex}><span>01</span><b>UNDERSTAND</b><i/></div>
      </div>

      <section className={styles.agentPanel}>
        <div className={styles.agentHeader}>
          <div><Brain weight="fill"/><span><b>Travel Agent</b><small>travel profile · live inventory</small></span></div>
          <span className={styles.confidence}>{busy?"thinking…":"ready"}</span>
        </div>

        <div className={styles.thread}>
          {messages.slice(-6).map(m=><div key={m.id} className={m.role==="agent"?styles.agentBubble:styles.userBubble}>
            {m.role==="agent"?<ChatCircleDots weight="fill"/>:null}
            <p>{m.text}</p>
          </div>)}
          {busy?<div className={styles.typing}><i/><i/><i/></div>:null}
        </div>

        {question?<div className={styles.quickReplies}>
          {question.quickReplies.map(x=><button key={x.value} onClick={()=>void replyQuick(x.label,x.value)} disabled={busy}>{x.label}</button>)}
        </div>:null}

        <div className={styles.composer}>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="π.χ. Θέλω ένα μοναδικό ΣΚ βουνό μετά τις 01/10/2026…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void callAgent(draft)}}}/>
          <button onClick={()=>void callAgent(draft)} disabled={busy||!draft.trim()} aria-label="Στείλε στον AI agent"><PaperPlaneTilt weight="fill"/></button>
        </div>
        <div className={styles.practical}>
          <label><span>ΑΦΕΤΗΡΙΑ</span><input value={origin} onChange={e=>setOrigin(e.target.value)}/></label>
          <label><span>BUDGET</span><input type="number" value={budget} onChange={e=>setBudget(Number(e.target.value)||800)}/></label>
        </div>
      </section>

      <section className={styles.dnaPanel}>
        <div className={styles.sectionTitle}><div><span>02</span><h2>Travel DNA</h2></div><p>Τα φίλτρα μιλούν στον ίδιο agent. Δεν είναι διακόσμηση.</p></div>
        <div className={styles.dnaGrid}>
          {filterMeta.map(item=><label key={item.key} className={styles.dnaItem}>
            <div className={styles.gauge} style={{"--p":filters[item.key]} as React.CSSProperties}><strong>{filters[item.key]}</strong><small>{item.caption}</small></div>
            <span>{item.label}</span>
            <input type="range" min="0" max="100" value={filters[item.key]} onChange={e=>setFilters(v=>({...v,[item.key]:Number(e.target.value)}))}/>
          </label>)}
        </div>
      </section>

      {solutions.length?<section ref={resultsRef} className={styles.resultsPanel}>
        <div className={styles.sectionTitle}><div><span>03</span><h2>Οι καλύτερες επιλογές τώρα</h2></div><p>Πραγματικά stays που πέρασαν το τρέχον brief και τα διαθέσιμα travel-fit checks.</p></div>
        <div className={styles.solutionRail}>
          {solutions.map((s,index)=><article key={s.stay.productId} className={index===active?styles.solutionActive:""} onMouseEnter={()=>focus(index)}>
            <div className={styles.solutionImage} style={s.stay.imageUrl?{backgroundImage:"url("+s.stay.imageUrl+")"}:undefined}>
              <span className={styles.solutionRank}>0{index+1}</span>
              <span className={styles.solutionScore}>{Math.round(s.score)}%</span>
            </div>
            <div className={styles.solutionBody}>
              <small>{s.destination.explorationRole.replaceAll("_"," ")}</small>
              <h3>{s.destination.name}</h3>
              <p>{s.stay.name}</p>
              <div><span>{money(s.stay.price,s.stay.currency)}</span><span>{s.destination.effortLabel}</span></div>
              <button onClick={()=>focus(index)}>ΔΕΣ ΣΤΟΝ ΧΑΡΤΗ <ArrowRight/></button>
            </div>
          </article>)}
        </div>
      </section>:null}
    </div>

    <section className={`${styles.mapStage} ${cinematicTarget?styles.cinematicLaunch:""}`}>
      <div ref={mapHost} className={styles.map}/>
      <div className={styles.mapShade}/>
      <div className={styles.mapModes}>
        {(["map","satellite","terrain"] as BaseMode[]).map(mode=><button key={mode} className={baseMode===mode?styles.modeActive:""} onClick={()=>setBaseMode(mode)}>{mode.toUpperCase()}</button>)}
      </div>
      <button className={styles.inventoryToggle} onClick={()=>setShowAll(v=>!v)}><MapPin weight="fill"/>{showAll?"ALL STAYS":"TOP 5 ONLY"}</button>
      <div className={styles.mapNarrative}>
        <span>LIVE TRAVEL UNIVERSE</span>
        <b>{solutions.length?solutions.length+" AI solutions":mapMeta.count?mapMeta.count.toLocaleString("el-GR")+" real stays":"loading inventory…"}</b>
        <small>zoom · hover · select · challenge the agent</small>{solutions.length?<button className={styles.showAllSolutions} onClick={showAllSolutions}>SHOW ALL {solutions.length} ★</button>:null}
      </div>

      {activeSolution?<aside className={styles.intelCard}>
        <div className={styles.intelImage} style={activeSolution.stay.imageUrl?{backgroundImage:"url("+activeSolution.stay.imageUrl+")"}:undefined}>
          <div className={styles.intelDrone} style={activeSolution.stay.imageUrl?{backgroundImage:"url("+activeSolution.stay.imageUrl+")"}:undefined}/>
        </div>
        <div className={styles.intelBody}>
          <small>#{active+1} · {activeSolution.destination.explorationRole.replaceAll("_"," ")}</small>
          <h2>{activeSolution.destination.name}</h2>
          <p>{activeSolution.destination.why}</p>
          <div className={styles.intelStats}>
            <span><b>{Math.round(activeSolution.score)}%</b>match</span>
            <span><b>{activeSolution.liveOfferCount}</b>offers</span>
            <span><b>{money(activeSolution.stay.price,activeSolution.stay.currency)}</b>stay</span><span><b>{ratings[activeSolution.stay.productId]?.label??"—"}</b>{ratings[activeSolution.stay.productId]?.provider??"verified rating"}</span>
          </div>
          <div className={styles.intelActions}>
            <a href={landingUrl(activeSolution.destination.slug,activeSolution.stay.productId)??"#"}>ΔΕΣ ΤΟ ΚΑΤΑΛΥΜΑ <ArrowRight/></a>
            <button onClick={()=>openCinematicSolution(activeSolution)}>ΡΩΤΑ ΤΟΝ AGENT</button>
          </div>
        </div>
      </aside>:null}

      {hoverPin?<aside className={styles.hoverStayCard}>
        <div className={styles.hoverStayImage} style={hoverPin.imageUrl?{backgroundImage:"url("+hoverPin.imageUrl+")"}:undefined}>
          <span>★</span>
        </div>
        <div className={styles.hoverStayBody}>
          <small>LIVE STAY · {hoverPin.location||hoverPin.address||"Ελλάδα"}</small>
          <h3>{hoverPin.name}</h3>
          <p>{hoverPin.onSale?"Ενεργή προσφορά · ":""}{hoverPin.category||"Κατάλυμα"} · {money(hoverPin.price,hoverPin.currency)}</p>
          <div className={styles.hoverStayFacts}>
            <span><b>{ratings[hoverPin.productId]?.label??"—"}</b>{ratings[hoverPin.productId]?.provider??"verified rating"}</span>
            <span><b>{hoverPin.location||"—"}</b>περιοχή</span>
          </div>
          {hoverPin.destinationSlug?<a href={landingUrl(hoverPin.destinationSlug,hoverPin.productId)??"#"}>ΔΕΣ LANDING & FUNNEL <ArrowRight/></a>:<button onClick={()=>void challengeStay(hoverPin)}>ΡΩΤΑ ΤΟΝ AGENT ΓΙ' ΑΥΤΟ</button>}
        </div>
      </aside>:null}

      {selectedPin&&solutions.length&&!topIds.has(selectedPin.productId)?<div className={styles.challengeToast}>
        <Brain weight="fill"/>
        <div><small>AI CHALLENGE</small><b>{selectedPin.name}</b><p>Το επέλεξες από τον χάρτη, αλλά δεν είναι στο τρέχον Top 5. Ο agent το σύγκρινε χωρίς να σου πει απλώς «ναι».</p></div>
      </div>:null}

      <div className={styles.mapCorner}><Crosshair/><span>Ο χάρτης παραμένει ο ίδιος εγκέφαλος με τη συνομιλία και τα φίλτρα.</span></div>{cinematicTarget?<div className={styles.cinematicOverlay}><span>CINEMATIC ROUTE</span><b>Κλειδώνω stay · περιοχή · καιρό · 360° dossier</b></div>:null}
    </section>
  </section>
 </main>;
}
