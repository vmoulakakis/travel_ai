"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import type { LayerGroup,Map as LeafletMap,TileLayer } from "leaflet";
import {
  ArrowRight,Brain,CalendarBlank,CheckCircle,Compass,Heart,Lightning,MapPin,
  PaperPlaneTilt,ShieldCheck,Sparkle,Star,Users,Wallet,MagnifyingGlass,UserCircle,PlayCircle,Globe,AirplaneTilt,Images
} from "@phosphor-icons/react";
import styles from "./v54-final-home.module.css";

type FilterKey="calm"|"food"|"nature"|"discovery"|"nightlife"|"value";
type Filters=Record<FilterKey,number>;
type Stay={productId:string;placeId:string;name:string;location:string;address:string;latitude:number;longitude:number;category:string;imageUrl:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;onSale:boolean;availability:string;validTo:string|null;demandScore:number|null;trackingUrl:string;destinationSlug:string|null;intelligenceScore?:number;seasonalScore?:number;priceScore?:number;demandSignal?:number;mapSignal?:"ai"|"discovery"|"demand"|"seasonal"|"value"|"explore";starTier?:"gold"|"green"|"blue"};
type Hero={id:string;location:string;imageUrl:string;propertyCount:number;minPrice:number|null;currency:string;latitude:number|null;longitude:number|null};
type Solution={rank:number;score:number;destination:{slug:string;name:string;regionGroup:string;latitude:number;longitude:number;explorationRole:string;explorationReason:string;why:string;seasonNote:string;effortLabel:string;budgetLabel:string;tags:string[]};stay:{productId:string;name:string;description:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;latitude:number;longitude:number;imageUrl:string|null;trackingUrl:string;availability:string;availabilityConfidence:string;distanceKm:number|null;seasonalFit?:{score:number;band:string;reason:string}};liveOfferCount:number};
type AgentResponse={ok:boolean;state:"clarify"|"results"|"challenge"|"error";agentMessage:string;question?:{id:string;text:string;quickReplies:{label:string;value:string}[]};solutions?:Solution[];trip?:{startDate:string;endDate:string;travelerType:string;moods:string[];budget:number;origin:string};agentRuntime?:{today?:string;timezone?:string;dateRecovery?:{tier?:string;label?:string}|null}};
type DisplayStay={id:string;name:string;location:string;image:string|null;price:number|null;currency:string;lat:number;lon:number;slug:string|null;tracking:string;score:number|null;why:string;availability:string;intelligence:number|null;seasonal:number|null;priceFit:number|null;demand:number|null;mapSignal:"ai"|"discovery"|"demand"|"seasonal"|"value"|"explore"|null;starTier:"gold"|"green"|"blue"|null};
type RatingSignal={provider:"Google Places"|"Tripadvisor"|"Foursquare"|"AI Guest Signal";rating:number;scale:number;reviewCount:number|null;confidence:"HIGH"|"MEDIUM"|"LOW"};
type QuickRating={status:"live"|"unavailable";primary:RatingSignal|null;ratings:RatingSignal[];photoUrl?:string|null;photoProvider?:string|null;matchedName?:string|null};
type MapIntelligence={focus:{latitude:number;longitude:number;zoom:number;label:string;score:number;demand:number;seasonality:number;value:number;reason:string}|null;weights:{demand:number;seasonality:number;priceValue:number};ratingUpgrade:string;targetMonth?:number;demandIsDiscriminating?:boolean};

const defaults:Filters={calm:78,food:72,nature:74,discovery:68,nightlife:28,value:70};
const money=(n:number|null,c="EUR")=>n!=null&&n>=5?new Intl.NumberFormat("el-GR",{style:"currency",currency:c,maximumFractionDigits:0}).format(n):"Τιμή στον πάροχο";
const todayIso=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Athens",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const addDays=(iso:string,days:number)=>{const d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
const html=(v:string)=>v.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]??ch));
const primaryVerifiedRating=(r:QuickRating|null|undefined)=>r?.ratings?.find(x=>x.provider!=="AI Guest Signal")??null;

export function V54FinalHome(){
 const [inventory,setInventory]=useState<Stay[]>([]);
 const [heroMedia,setHeroMedia]=useState<Hero[]>([]);
 const [solutions,setSolutions]=useState<Solution[]>([]);
 const [active,setActive]=useState(0);
 const [origin]=useState("Αθήνα");
 const [destination,setDestination]=useState("");
 const [plannerTab,setPlannerTab]=useState<"trip"|"inspire"|"ask">("trip");
 const [start,setStart]=useState(()=>addDays(todayIso(),14));
 const [end,setEnd]=useState(()=>addDays(todayIso(),17));
 const [traveler,setTraveler]=useState("couple");
 const [budget,setBudget]=useState(800);
 const [intent,setIntent]=useState("Χαλάρωση");
 const [freeText,setFreeText]=useState("");
 const [filters,setFilters]=useState<Filters>(defaults);
 const [agentMessage,setAgentMessage]=useState("Πες μου τι χρειάζεσαι και θα περιορίσω τις επιλογές σε όσες αξίζουν πραγματικά.");
 const [agentRuntime,setAgentRuntime]=useState<AgentResponse["agentRuntime"]|null>(null);
 const [question,setQuestion]=useState<AgentResponse["question"]|null>(null);
 const [busy,setBusy]=useState(false);
 const [lastTrip,setLastTrip]=useState<AgentResponse["trip"]|null>(null);
 const [showSatellite,setShowSatellite]=useState(true);
 const [selectedMapStay,setSelectedMapStay]=useState<DisplayStay|null>(null);
 const [mapReady,setMapReady]=useState(false);
 const [mapView,setMapView]=useState({lat:36.3932,lon:25.4615,zoom:11});
 const [mobilePlannerOpen,setMobilePlannerOpen]=useState(false);
 const [verifiedRatings,setVerifiedRatings]=useState<Record<string,QuickRating|null>>({});
 const [verifiedPhotos,setVerifiedPhotos]=useState<Record<string,string>>({});
 const [mapIntelligence,setMapIntelligence]=useState<MapIntelligence|null>(null);
 const [aiFocusLabel,setAiFocusLabel]=useState("AI seasonal focus");
 const hoveredStayRef=useRef<DisplayStay|null>(null);
 const mapHost=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<LeafletMap|null>(null);
 const layerRef=useRef<LayerGroup|null>(null);
 const tileRef=useRef<TileLayer|null>(null);
 const ratingCache=useRef<Map<string,QuickRating|null>>(new Map());
 const ratingPending=useRef<Set<string>>(new Set());
 const initialAiFocusDone=useRef(false);

 useEffect(()=>{
  let cancelled=false;
  fetch(`/api/v50/map-stays?mode=quick&limit=24&start=${encodeURIComponent(start)}`,{cache:"no-store"}).then(r=>r.json()).then(m=>{
   if(!cancelled&&Array.isArray(m.products)&&m.products.length){setInventory(m.products);if(m.mapIntelligence)setMapIntelligence(m.mapIntelligence)}
  }).catch(()=>{});
  fetch("/api/v50/hero-media",{cache:"no-store"}).then(r=>r.json()).then(h=>{
   if(!cancelled)setHeroMedia(Array.isArray(h.items)?h.items:[]);
  }).catch(()=>{});
  fetch(`/api/v50/map-stays?limit=2000&start=${encodeURIComponent(start)}`,{cache:"no-store"}).then(r=>r.json()).then(m=>{
   if(!cancelled&&Array.isArray(m.products)&&m.products.length){setInventory(m.products);if(m.mapIntelligence)setMapIntelligence(m.mapIntelligence)}
  }).catch(()=>{});
  return()=>{cancelled=true};
 },[]);

 useEffect(()=>{
  let cancelled=false;
  fetch(`/api/v50/map-stays?mode=quick&limit=24&start=${encodeURIComponent(start)}`,{cache:"no-store"})
   .then(r=>r.json()).then(m=>{
    if(cancelled)return;
    if(m.mapIntelligence){
     initialAiFocusDone.current=false;
     setMapIntelligence(m.mapIntelligence);
     const f=m.mapIntelligence.focus;
     if(f)setAiFocusLabel(`AI focus · ${f.label} · ${f.score}/100`);
    }
   }).catch(()=>{});
  return()=>{cancelled=true};
 },[start]);

 useEffect(()=>{
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapHost.current||mapRef.current)return;
   const map=L.map(mapHost.current,{zoomControl:false,attributionControl:false,minZoom:5,maxZoom:18}).setView([36.3932,25.4615],11);
   L.control.zoom({position:"bottomright"}).addTo(map);
   tileRef.current=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18}).addTo(map);
   mapRef.current=map;
   const syncView=()=>{const center=map.getCenter();setMapView({lat:center.lat,lon:center.lng,zoom:map.getZoom()})};
   map.on("moveend",syncView);syncView();
   window.setTimeout(()=>{map.invalidateSize();setMapReady(true)},80);
  });
  return()=>{dead=true;mapRef.current?.remove();mapRef.current=null};
 },[]);

 useEffect(()=>{
  if(!mapRef.current)return;
  void import("leaflet").then(L=>{
   if(!mapRef.current)return;
   tileRef.current?.remove();
   tileRef.current=L.tileLayer(
    showSatellite
     ?"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
     :"https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {maxZoom:18,attribution:showSatellite?"Tiles © Esri":"© OpenStreetMap contributors"}
   ).addTo(mapRef.current);
  });
 },[showSatellite]);

 const cards=useMemo<DisplayStay[]>(()=>{
  if(solutions.length)return solutions.map(s=>({
   id:s.stay.productId,name:s.stay.name,location:s.destination.name,image:verifiedPhotos[s.stay.productId]??s.stay.imageUrl,
   price:s.stay.price,currency:s.stay.currency,lat:s.stay.latitude,lon:s.stay.longitude,
   slug:s.destination.slug,tracking:s.stay.trackingUrl,score:Math.round(s.score),why:s.destination.why,availability:s.stay.availability,intelligence:Math.round(s.score),seasonal:s.stay.seasonalFit?.score??null,priceFit:null,demand:null,mapSignal:"ai",starTier:s.rank<=3?"gold":"green"
  }));
  return inventory.slice(0,12).map((p,i)=>({
   id:p.productId,name:p.name,location:p.location||p.address||"Ελλάδα",image:verifiedPhotos[p.productId]??p.imageUrl,price:p.price,currency:p.currency,
   lat:p.latitude,lon:p.longitude,slug:p.destinationSlug,tracking:p.trackingUrl,score:null,
   why:i===0?"Ισχυρό seasonal / price-value fit από το live inventory.":"Πραγματικό stay από το ενεργό inventory.",availability:p.availability,intelligence:p.intelligenceScore??null,seasonal:p.seasonalScore??null,priceFit:p.priceScore??null,demand:p.demandSignal??null,mapSignal:p.mapSignal??"explore",starTier:p.starTier??null
  }));
 },[solutions,inventory,verifiedPhotos]);

 const activeStay=selectedMapStay??cards[active]??cards[0]??null;
 const destinationHero=heroMedia.find(h=>destination.toLocaleLowerCase("el-GR").includes(h.location.toLocaleLowerCase("el-GR"))||h.location.toLocaleLowerCase("el-GR").includes(destination.split(",")[0].trim().toLocaleLowerCase("el-GR")))?.imageUrl??heroMedia[0]?.imageUrl??null;
 const hero=(solutions.length||selectedMapStay)?(activeStay?.image??destinationHero):(destinationHero??activeStay?.image??inventory.find(x=>x.imageUrl)?.imageUrl??null);
 const gallery=useMemo(()=>{
  const urls=[activeStay?.image,...heroMedia.map(x=>x.imageUrl),...inventory.slice(0,20).map(x=>x.imageUrl)].filter((x):x is string=>Boolean(x));
  return [...new Set(urls)].slice(0,8);
 },[activeStay?.image,heroMedia,inventory]);

 useEffect(()=>{
  let cancelled=false;
  const top=cards.slice(0,3).filter(s=>s.slug&&!ratingCache.current.has(s.id));
  void Promise.all(top.map(async s=>{
   const requestBody={propertyName:s.name,sourceProductId:s.id,destinationSlug:s.slug,destinationName:s.location,latitude:s.lat,longitude:s.lon};
   void fetch("/api/v50/stay-media",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(requestBody)})
    .then(r=>r.json()).then(p=>{const url=p?.ok?p?.result?.photoUrl:null;if(!cancelled&&url)setVerifiedPhotos(v=>({...v,[s.id]:url}))}).catch(()=>{});
   try{
    const response=await fetch("/api/v50/stay-rating",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(requestBody)});
    const payload=await response.json() as {ok?:boolean;result?:QuickRating|null};
    const result=payload?.ok?payload.result??null:null;
    ratingCache.current.set(s.id,result);
    if(cancelled)return;
    setVerifiedRatings(v=>({...v,[s.id]:result}));
   }catch{if(!cancelled)setVerifiedRatings(v=>({...v,[s.id]:null}))}
  }));
  return()=>{cancelled=true};
 },[cards.length,solutions.length]);


 useEffect(()=>{
  if(initialAiFocusDone.current||!mapRef.current||!mapReady||!mapIntelligence?.focus)return;
  initialAiFocusDone.current=true;
  const f=mapIntelligence.focus,map=mapRef.current;
  setAiFocusLabel(`AI focus · ${f.label} · ${f.score}/100`);
  map.setView([38.35,23.45],6,{animate:false});
  const timer=window.setTimeout(()=>map.flyTo([f.latitude,f.longitude],f.zoom,{duration:1.65,easeLinearity:.18}),260);
  return()=>window.clearTimeout(timer);
 },[mapIntelligence,mapReady]);

 useEffect(()=>{
  if(!mapRef.current)return;
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapRef.current)return;
   layerRef.current?.remove();
   const g=L.layerGroup().addTo(mapRef.current);layerRef.current=g;
   const displayFromInventory=(p:Stay):DisplayStay=>({
    id:p.productId,name:p.name,location:p.location||p.address||"Ελλάδα",image:verifiedPhotos[p.productId]??p.imageUrl,price:p.price,currency:p.currency,
    lat:p.latitude,lon:p.longitude,slug:p.destinationSlug,tracking:p.trackingUrl,score:null,
    why:"Πραγματικό stay από το ενεργό inventory.",availability:p.availability,intelligence:p.intelligenceScore??null,seasonal:p.seasonalScore??null,priceFit:p.priceScore??null,demand:p.demandSignal??null,mapSignal:p.mapSignal??"explore",starTier:p.starTier??null
   });
   const aiRanks=new Map(solutions.map((s,i)=>[s.stay.productId,i+1]));
   const ratingMarkup=(rating:QuickRating|null|undefined)=>{
    if(rating===undefined)return `<div class="v56RatingLoading">✦ Scanning verified ratings…</div>`;
    if(!rating?.ratings?.length)return `<div class="v56RatingEmpty">Verified rating not returned yet · click opens full verification funnel</div>`;
    return `<div class="v56RatingRow">${rating.ratings.filter(x=>x.provider!=="AI Guest Signal").slice(0,3).map(x=>`<span><b>${html(x.provider)}</b> ${x.rating.toFixed(1)}/${x.scale}${x.reviewCount!=null?` · ${x.reviewCount.toLocaleString("el-GR")} reviews`:""}</span>`).join("")}</div>`;
   };
   const tooltipFor=(p:Stay,rank:number|null,rating:QuickRating|null|undefined)=>{
    const signal=rank?"AI SPOTLIGHT":p.mapSignal==="discovery"?"TRAVELAI DISCOVERY":p.mapSignal==="demand"?"HIGH DEMAND":p.mapSignal==="seasonal"?"SEASONAL FIT":p.mapSignal==="value"?"BEST VALUE":"EXPLORE";
    const propertyPhoto=rating?.photoUrl??p.imageUrl;
    return `
     <div class="v56MapTip">
      ${propertyPhoto?`<img class="v56MapTipPhoto" src="${html(propertyPhoto)}" alt=""/>`:""}
      <div class="v56MapTipTop"><span class="v56AiBadge">${html(signal)}${rank?` · #${rank}`:""}</span><strong>${html(money(p.price,p.currency))}</strong></div>
      <b class="v56MapTipName">${html(p.name)}</b>
      <span class="v56MapTipLoc">⌖ ${html(p.location||p.address||"Ελλάδα")}</span>
      <div class="v65SignalGrid">
       <span><b>${Math.round(p.intelligenceScore??0)}</b><small>AI score</small></span>
       <span><b>${Math.round(p.demandSignal??0)}</b><small>Demand</small></span>
       <span><b>${Math.round(p.seasonalScore??0)}</b><small>Season</small></span>
       <span><b>${Math.round(p.priceScore??0)}</b><small>Value</small></span>
      </div>
      ${ratingMarkup(rating)}
      <small>Click to continue to the stay funnel</small>
     </div>`;
   };
   const loadRating=async(p:Stay,marker:any,rank:number|null)=>{
    if(ratingCache.current.has(p.productId)){marker.setTooltipContent(tooltipFor(p,rank,ratingCache.current.get(p.productId)));return}
    if(ratingPending.current.has(p.productId)||!p.destinationSlug)return;
    ratingPending.current.add(p.productId);
    marker.setTooltipContent(tooltipFor(p,rank,undefined));
    const mediaBody={propertyName:p.name,sourceProductId:p.productId,destinationSlug:p.destinationSlug,destinationName:p.location||p.address||destination,latitude:p.latitude,longitude:p.longitude};
    void fetch("/api/v50/stay-media",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(mediaBody)})
     .then(r=>r.json()).then(j=>{const url=j?.ok?j?.result?.photoUrl:null;if(url)setVerifiedPhotos(v=>({...v,[p.productId]:url}))}).catch(()=>{});
    try{
     const r=await fetch("/api/v50/stay-rating",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      propertyName:p.name,sourceProductId:p.productId,destinationSlug:p.destinationSlug,destinationName:p.location||p.address||destination,latitude:p.latitude,longitude:p.longitude
     })});
     const j=await r.json() as {ok?:boolean;result?:QuickRating|null};
     const result=j?.ok?j.result??null:null;
     ratingCache.current.set(p.productId,result);
     setVerifiedRatings(v=>({...v,[p.productId]:result}));
     marker.setTooltipContent(tooltipFor(p,rank,result));
    }catch{ratingCache.current.set(p.productId,null);marker.setTooltipContent(tooltipFor(p,rank,null))}
    finally{ratingPending.current.delete(p.productId)}
   };
   if(mapIntelligence?.focus){
    const f=mapIntelligence.focus;
    L.marker([f.latitude,f.longitude],{interactive:false,icon:L.divIcon({className:"v65FocusHalo",html:"<span></span><i></i>",iconSize:[120,120],iconAnchor:[60,60]}),zIndexOffset:50}).addTo(g);
   }
   for(const p of inventory){
    if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))continue;
    const rank=aiRanks.get(p.productId)??null;
    const score=Math.max(0,Math.min(100,p.intelligenceScore??50));
    const isDiscovery=!rank&&score>=82&&(p.seasonalScore??0)>=70&&(p.priceScore??0)>=68;
    const signal=rank&&rank<=5?"ai":isDiscovery?"discovery":p.mapSignal??"explore";
    const size=signal==="discovery"?58:score>=86?48:score>=76?41:score>=64?34:27;
    const className=signal==="ai"?"v65StarAi":signal==="discovery"?"v66StarDiscovery":signal==="demand"?"v65StarDemand":signal==="seasonal"?"v65StarSeasonal":signal==="value"?"v65StarValue":"v65StarExplore";
    const marker=L.marker([p.latitude,p.longitude],{
      icon:L.divIcon({
       className,
       html:rank&&rank<=5?`<span style="--pin-size:${size}px">★<small>#${rank}</small></span>`:`<span style="--pin-size:${size}px">★</span>`,
       iconSize:[size,size],iconAnchor:[Math.round(size/2),Math.round(size/2)]
      }),
      zIndexOffset:signal==="ai"?1900-(rank??20):signal==="discovery"?1650:signal==="demand"?1200:signal==="seasonal"?950:signal==="value"?800:300
    });
    marker.bindTooltip(tooltipFor(p,rank,ratingCache.current.get(p.productId)),{direction:"top",offset:[0,-14],opacity:1,className:"v56Tooltip"});
    marker.on("mouseover",()=>{marker.setTooltipContent(tooltipFor(p,rank,ratingCache.current.get(p.productId)));void loadRating(p,marker,rank)});
    marker.on("click",()=>{
      const stay=displayFromInventory(p);
      setSelectedMapStay(stay);hoveredStayRef.current=stay;
      const idx=cards.findIndex(c=>c.id===p.productId);if(idx>=0)setActive(idx);
      openStay(stay);
    });
    marker.addTo(g);
   }
  });
  return()=>{dead=true};
 },[inventory,cards,solutions,destination,verifiedRatings]);

 async function runAgent(extra?:string){
  const destinationBrief=destination.trim()?destination.trim()+". ":"";
  const prompt=(extra??freeText).trim()||`${destinationBrief}${intent}, ${traveler==="couple"?"με σύντροφο":traveler}, ${start} έως ${end}. Θέλω τις καλύτερες πραγματικές επιλογές.`;
  setBusy(true);setAgentMessage("Αναλύω ημερομηνίες, profile, inventory και πραγματικές επιλογές…");
  try{
   const body={
    userText:prompt,
    conversationContext:`USER PROFILE: origin=${origin}, destination=${destination||"open"}, dates=${start}..${end}, traveler=${traveler}, budget=${budget}, intent=${intent}. TODAY_LOCAL=${todayIso()} Europe/Athens. MAP_CENTER=${mapView.lat.toFixed(5)},${mapView.lon.toFixed(5)} zoom=${mapView.zoom}. CURRENT_STAY=${(selectedMapStay??hoveredStayRef.current)?.name??"none"}`,
    priorUserText:freeText,
    origin,destination:destination.trim()||undefined,budget,filters,
    currentTopIds:cards.slice(0,10).map(x=>x.id),
    selectedStay:(selectedMapStay??hoveredStayRef.current)?{productId:(selectedMapStay??hoveredStayRef.current)!.id,name:(selectedMapStay??hoveredStayRef.current)!.name,location:(selectedMapStay??hoveredStayRef.current)!.location,price:(selectedMapStay??hoveredStayRef.current)!.price}:null,
    mapContext:{centerLat:mapView.lat,centerLon:mapView.lon,zoom:mapView.zoom,visibleDestination:destination||null,hoveredStayId:hoveredStayRef.current?.id??null,hoveredStayName:hoveredStayRef.current?.name??null},
    answers:{dates:start+" – "+end,companions:traveler}
   };
   const r=await fetch("/api/v50/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   const p=await r.json() as AgentResponse;
   setAgentMessage(p.agentMessage||"Έχω το brief σου και συνεχίζω με τις καλύτερες διαθέσιμες επιλογές.");
   setQuestion(p.question??null);setAgentRuntime(p.agentRuntime??null);
   if(p.solutions?.length){
    setSelectedMapStay(null);setSolutions(p.solutions);setActive(0);setLastTrip(p.trip??null);
    const top=p.solutions[0];
    requestAnimationFrame(()=>{
     document.getElementById("map")?.scrollIntoView({behavior:"smooth",block:"start"});
     if(top)window.setTimeout(()=>mapRef.current?.flyTo([top.stay.latitude,top.stay.longitude],12,{duration:1.35,easeLinearity:.18}),180);
    });
   }
  }catch{setAgentMessage("Το live reasoning δεν απάντησε έγκαιρα. Κρατάω το brief σου και εμφανίζω το ενεργό inventory χωρίς να εφεύρω δεδομένα.");}
  finally{setBusy(false)}
 }

 function stayHref(stay:DisplayStay){
  const q=new URLSearchParams({start,end,budget:String(budget),origin,travelerType:traveler,dn:stay.location});
  return stay.slug
   ? `/escape/${encodeURIComponent(stay.slug)}/stay/${encodeURIComponent(stay.id)}?${q}`
   : `/stay/${encodeURIComponent(stay.id)}?${q}`;
 }
 function openStay(stay:DisplayStay){
  window.location.assign(stayHref(stay));
 }

 const destinationTiles=heroMedia.slice(0,6);
 const runtimeLabel=agentRuntime?.dateRecovery?.label?agentRuntime.dateRecovery.label:"AI + live inventory";

 return <main className={styles.page}>
  <div className={styles.mobileTopBar}>
   <a className={styles.mobileBrand} href="/">TRAVEL<span>AI</span></a>
   <button className={styles.mobileLocation} onClick={()=>document.getElementById("map")?.scrollIntoView({behavior:"smooth"})}><MapPin weight="fill"/><span><b>{destination||"Όλη η Ελλάδα"}</b><small>{aiFocusLabel}</small></span></button>
   <button className={styles.mobileAiButton} onClick={()=>setMobilePlannerOpen(true)}><Brain weight="fill"/></button>
  </div>
  <header className={styles.nav}>
   <a className={styles.logo} href="/">TRAVEL<span>AI</span><small>AI ESCAPE INTELLIGENCE</small></a>
   <nav><a href="#destinations">Προορισμοί</a><a href="#stays">Διαμονή</a><a href="#featured">Εμπειρίες</a><a href="#planner">AI Planner</a><a href="#how">Πώς λειτουργεί</a><a href="#about">Σχετικά</a></nav>
   <div className={styles.navActions}><button aria-label="Αναζήτηση"><MagnifyingGlass/></button><button className={styles.login}><UserCircle/> Σύνδεση</button><button className={styles.navCta} onClick={()=>document.getElementById("map")?.scrollIntoView({behavior:"smooth"})}>Ξεκίνα το ταξίδι σου <ArrowRight/></button></div>
  </header>

  <div className={styles.focusBar}>
   <div className={styles.focusWhere}><MapPin weight="fill"/><span>Πεδίο αναζήτησης:</span><b>{destination||"Όλη η Ελλάδα"}</b></div>
   <div className={styles.focusSteps}>
    <span className={styles.focusStepActive}>1 · Επίλεξε</span><i>→</i>
    <span className={activeStay?styles.focusStepActive:""}>2 · Δες το funnel</span><i>→</i>
    <span>3 · Ξεκίνα το ταξίδι σου</span>
   </div>
   <div className={styles.pinLegend}><span className={styles.discoveryLegend}><i className={styles.legendDiscovery}>★</i> Discovery</span><span><i className={styles.legendGold}>★</i> AI</span><span><i className={styles.legendDemand}>★</i> Demand</span><span><i className={styles.legendSeasonal}>★</i> Seasonal</span><span><i className={styles.legendGreen}>★</i> Value</span><span><i className={styles.legendBlue}>★</i> Explore</span></div>
  </div>

  <section id="map" className={styles.mapFirst}>
   <div className={styles.mapFirstTop}>
    <div>
     <small>AI MAP · DEFAULT INTELLIGENCE VIEW</small>
     <h1>Η AI ξεκινά από την <em>καλύτερη περιοχή τώρα.</em></h1>
     <p>Το πρώτο focus παράγεται από live demand signal, seasonality και local best value. Τα μεγάλα ⭐ Discovery αναδεικνύουν μέρη με υψηλή εμπειρία, καλό seasonal fit και value — χωρίς να κρύβουν κανένα από τα 1.700+ stays.</p>
    </div>
    <div className={styles.mapAiFlow}>
     <span>{mapIntelligence?.focus?.label??"AI scanning"}</span><i>→</i><span>Demand {mapIntelligence?.focus?.demand??"–"}</span><i>→</i><span>Season {mapIntelligence?.focus?.seasonality??"–"}</span><i>→</i><b>Value {mapIntelligence?.focus?.value??"–"}</b>
    </div>
   </div>
   <div className={styles.mapStage}>
    {mapIntelligence?.focus?<div className={styles.mapFocusCard}><span>AI AREA FOCUS</span><b>{mapIntelligence.focus.label}</b><div><i>Demand <strong>{mapIntelligence.focus.demand}</strong></i><i>Season <strong>{mapIntelligence.focus.seasonality}</strong></i><i>Value <strong>{mapIntelligence.focus.value}</strong></i></div><small>{mapIntelligence.focus.reason}</small></div>:null}
    <div className={styles.mapAiDock}>
     <div className={styles.mapAiDockHead}><Brain weight="fill"/><div><b>AI Stay Finder</b><span>{busy?"Σκανάρω inventory…":"Διάλεξε vibe — τα υπόλοιπα τα κάνει η AI"}</span></div></div>
     <div className={styles.mapFunChips}>
      {["Χαλάρωση","Ρομαντικό","Περιπέτεια","Γαστρονομία"].map(x=><button key={x} className={intent===x?styles.mapFunChipActive:""} onClick={()=>{setIntent(x);const where=destination.trim()?destination.trim()+". ":"";void runAgent(`${where}Θέλω ${x.toLowerCase()} ταξίδι. Διάλεξε τις καλύτερες πραγματικές επιλογές από όλο το inventory.`)}}>{x}</button>)}
     </div>
     <button className={styles.discoveryTrigger} onClick={()=>{window.location.href="https://travelaigreece.vercel.app";}}>🧭 Θέλω αποκλειστικά άγνωστα μέρη · Greece Unseen</button>\n     <button className={styles.surpriseBtn} disabled={busy} onClick={()=>void runAgent("Surprise me. Διάλεξε εσύ την καλύτερη απόδραση από όλο το πραγματικό inventory με βάση ημερομηνίες, budget και profile.")}>🎲 {busy?"Η AI ψάχνει…":"Surprise me"}</button>
     <p><Sparkle weight="fill"/> {agentMessage}</p>
    </div>
    <div className={styles.mapModesTop}><button className={!showSatellite?styles.mapModeActive:""} onClick={()=>setShowSatellite(false)}>Χάρτης</button><button className={showSatellite?styles.mapModeActive:""} onClick={()=>setShowSatellite(true)}>Δορυφόρος</button></div>
    <div className={styles.mapCanvasWrapTop}><div ref={mapHost} className={styles.map}/>{!mapReady?<div className={styles.mapLoading}>Φορτώνω {inventory.length?inventory.length.toLocaleString("el-GR"):"1.700+"} stays…</div>:null}</div>
    {activeStay?<div className={styles.mapCard}><div style={activeStay.image?{backgroundImage:`url(${activeStay.image})`}:undefined}/><span><small>{activeStay.location}</small><b>{activeStay.name}</b><strong>{money(activeStay.price,activeStay.currency)}</strong></span><button aria-label="Άνοιξε το ενιαίο funnel" onClick={()=>openStay(activeStay)}>Ξεκίνα <ArrowRight/></button></div>:null}
   </div>
  </section>

  <section className={`${styles.hero} ${mobilePlannerOpen?styles.mobilePlannerOpen:""}`}>
   <aside id="planner" className={styles.planner}>
    <div className={styles.plannerTitle}><Brain weight="fill"/><div><b>AI Travel Planner</b><span>Σήμερα {new Intl.DateTimeFormat("el-GR",{timeZone:"Europe/Athens",day:"numeric",month:"short"}).format(new Date())} · βλέπω και τον χάρτη που εξερευνάς.</span></div><i className={busy?styles.busy:styles.ready}/><button className={styles.mobileSheetClose} onClick={()=>setMobilePlannerOpen(false)}>×</button></div>
    <div className={styles.tabs}>
      <button className={plannerTab==="trip"?styles.tabActive:""} onClick={()=>setPlannerTab("trip")}>Ταξίδι</button>
      <button className={plannerTab==="inspire"?styles.tabActive:""} onClick={()=>setPlannerTab("inspire")}>Έμπνευση</button>
      <button className={plannerTab==="ask"?styles.tabActive:""} onClick={()=>setPlannerTab("ask")}>Ρώτα την AI</button>
    </div>

    <label className={styles.fieldCard}><span><MapPin/> Πού θέλεις να πας;</span><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="π.χ. Σαντορίνη, Κρήτη ή βρες εσύ"/></label>

    <div className={styles.dateCard}>
      <span><CalendarBlank/> Πότε;</span>
      <div><input aria-label="Ημερομηνία αναχώρησης" type="date" value={start} min={todayIso()} onChange={e=>setStart(e.target.value)}/><i>→</i><input aria-label="Ημερομηνία επιστροφής" type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></div>
    </div>

    <div className={styles.double}>
     <label className={styles.fieldCard}><span><Users/> Ταξιδιώτες</span><select value={traveler} onChange={e=>setTraveler(e.target.value)}><option value="couple">2 ενήλικες</option><option value="solo">Μόνος/η</option><option value="family">Οικογένεια</option><option value="friends">Φίλοι</option></select></label>
     <label className={styles.fieldCard}><span><Wallet/> Budget</span><select value={budget} onChange={e=>setBudget(Number(e.target.value))}><option value={500}>Έως €500</option><option value={800}>Μεσαίο</option><option value={1200}>Premium</option><option value={2000}>Luxury</option></select></label>
    </div>

    <p className={styles.chipTitle}>Τι ταξίδι σε εκφράζει;</p>
    <div className={styles.chips}>{["Χαλάρωση","Ρομαντικό","Περιπέτεια","Πολιτισμός","Γαστρονομία","Οικογένεια"].map(x=><button type="button" key={x} className={intent===x?styles.chipActive:""} onClick={()=>setIntent(x)}>{x}</button>)}</div>

    {plannerTab==="ask"?<textarea autoFocus value={freeText} onChange={e=>setFreeText(e.target.value)} placeholder="Ρώτα φυσικά: «βρες εσύ ένα ήσυχο 3ήμερο μετά τις 10…»"/>:null}

    <button type="button" className={styles.primary} disabled={busy} onClick={()=>{
      if(plannerTab==="inspire") void runAgent("Βρες εσύ την καλύτερη απόδραση με βάση το profile, τις ημερομηνίες και το budget μου.");
      else void runAgent();
    }}>{busy?"Η AI αναλύει…":plannerTab==="inspire"?"Εμπνευσέ με με AI":"Δημιούργησε το δικό μου ταξίδι"} <Sparkle weight="fill"/></button>

    <div className={styles.reasonBox}><Sparkle weight="fill"/><div><b>{runtimeLabel}</b><p>{agentMessage}</p>{question?.quickReplies?.length?<div className={styles.inlineReplies}>{question.quickReplies.slice(0,4).map(q=><button type="button" key={q.value} onClick={()=>void runAgent(q.label)}>{q.label}</button>)}</div>:null}</div></div>
   </aside>
  </section>

  <section id="destinations" className={styles.destinations}>
   <div className={styles.sectionHead}><div><small>ΠΡΟΑΙΡΕΤΙΚΑ · ΕΜΠΝΕΥΣΗ</small><h2>Ή διάλεξε έναν προορισμό</h2></div><span>{heroMedia.length?heroMedia.length:"Live"} περιοχές από το inventory</span></div>
   <div className={styles.destinationRail}>{destinationTiles.map(d=><article role="button" tabIndex={0} key={d.id} style={{backgroundImage:`url(${d.imageUrl})`}} onClick={()=>{
      setDestination(d.location);
      if(d.latitude!=null&&d.longitude!=null){mapRef.current?.flyTo([d.latitude,d.longitude],10,{duration:.8});document.getElementById("map")?.scrollIntoView({behavior:"smooth",block:"center"})}
    }} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.click()}}><div/><b>{d.location}</b><span>{d.propertyCount?d.propertyCount+" stays":"Live supply"}</span></article>)}</div>
  </section>

  <section id="stays" className={styles.discovery}>
   <div className={styles.stayColumn}>
    <div className={styles.sectionHead}><div><small>ΒΗΜΑ 3 · ΕΠΙΛΕΞΕ</small><h2>Διάλεξε κατάλυμα και συνέχισε στο ίδιο funnel</h2></div><button onClick={()=>void runAgent("Βελτιστοποίησε ξανά τις επιλογές με βάση το τρέχον brief.")}>Ανανέωση AI <Sparkle/></button></div>
    <div className={styles.cardGrid}>{cards.slice(0,3).map((s,i)=><article key={s.id}
      onMouseEnter={()=>{hoveredStayRef.current=s}}
      onMouseLeave={()=>{if(hoveredStayRef.current?.id===s.id)hoveredStayRef.current=null}}
      onClick={()=>{hoveredStayRef.current=s;setSelectedMapStay(null);setActive(i);openStay(s)}}
      className={i===active&&!selectedMapStay?styles.cardActive:""}>
      <div className={styles.cardPhoto} style={s.image?{backgroundImage:`url(${s.image})`}:undefined}><span>{s.score?Math.round(s.score)+"% MATCH":"LIVE STAY"}</span></div>
      <div className={styles.cardBody}>
       <div className={styles.cardEyebrow}><small>{s.location}</small><span>{s.score?"AI PICK":"LIVE STAY"}</span></div>
       <h3>{s.name}</h3>
       <div className={styles.cardTrustRow}>
        {primaryVerifiedRating(verifiedRatings[s.id])?<span className={styles.verifiedRating}><Star weight="fill"/><b>{primaryVerifiedRating(verifiedRatings[s.id])!.rating.toFixed(1)}</b><small>{primaryVerifiedRating(verifiedRatings[s.id])!.provider}{primaryVerifiedRating(verifiedRatings[s.id])!.reviewCount!=null?` · ${primaryVerifiedRating(verifiedRatings[s.id])!.reviewCount!.toLocaleString("el-GR")} reviews`:""}</small></span>:<span><ShieldCheck weight="fill"/><b>{s.intelligence!=null?s.intelligence+"/100":"Live inventory"}</b><small>{s.intelligence!=null?"map intelligence":"verified offer source"}</small></span>}
        {s.score?<span><Sparkle weight="fill"/><b>{Math.round(s.score)}%</b><small>AI match</small></span>:s.seasonal!=null?<span><CalendarBlank weight="fill"/><b>{Math.round(s.seasonal)}</b><small>seasonality</small></span>:null}
        {s.priceFit!=null?<span><Wallet weight="fill"/><b>{Math.round(s.priceFit)}</b><small>price / value</small></span>:null}
       </div>
       <p><b>Γιατί το προτείνει η AI:</b> {s.why}</p>
       <div className={styles.tags}><span><CheckCircle/> {s.availability.includes("confirmed")?"Active":"Provider check"}</span><span><MapPin/> {s.location}</span></div>
       <div className={styles.cardFoot}><b>{money(s.price,s.currency)}<small>/ διαμονή</small></b><button onClick={e=>{e.stopPropagation();openStay(s)}}>Δες γιατί αξίζει <ArrowRight/></button></div>
      </div>
      <div className={styles.cardHoverPanel} aria-hidden="true">
       <div className={styles.cardHoverPhoto} style={s.image?{backgroundImage:`linear-gradient(180deg,rgba(7,28,22,.04),rgba(7,28,22,.72)),url(${s.image})`}:undefined}>
        <div className={styles.cardHoverTop}><span>{s.score?Math.round(s.score)+"% AI MATCH":"LIVE INVENTORY"}</span><b>{money(s.price,s.currency)}</b></div>
        <div className={styles.cardHoverTitle}><small><MapPin weight="fill"/> {s.location}</small><h3>{s.name}</h3></div>
       </div>
       <div className={styles.cardHoverBody}>
        <p>{s.why}</p>
        <div className={styles.cardHoverFacts}>
         <span><CheckCircle weight="fill"/><b>{s.availability.includes("confirmed")?"Active":"Provider check"}</b><small>availability</small></span>
         <span><Star weight="fill"/><b>{s.score?Math.round(s.score)+"%":"AI fit"}</b><small>match signal</small></span>
         <span><ShieldCheck weight="fill"/><b>Grounded</b><small>live inventory</small></span>
        </div>
        <div className={styles.cardHoverFooter}>
         <div><small>Από</small><strong>{money(s.price,s.currency)}</strong></div>
         <button onClick={e=>{e.stopPropagation();openStay(s)}}>Δες λεπτομέρειες <ArrowRight/></button>
        </div>
       </div>
      </div>
    </article>)}</div>
   </div>

  </section>

  {activeStay?<section id="featured" className={styles.featured}>
   <div className={styles.featureCopy}><small>FEATURED STAY · AI PICK</small><h2>{activeStay.name}</h2><h3>{activeStay.location}</h3><p>{activeStay.why} Η σύνθεση παρακάτω χρησιμοποιεί πραγματικές εικόνες από το ενεργό travel inventory για να σου δώσει γρήγορα το mood πριν μπεις στις λεπτομέρειες.</p><div className={styles.featureStats}><span><Star weight="fill"/> {activeStay.score?activeStay.score+"% match":"Live inventory"}</span><span><MapPin/> {activeStay.location}</span><span><ShieldCheck/> Grounded stay</span></div><button onClick={()=>openStay(activeStay)}>Δες το funnel <ArrowRight/></button></div>
   <div className={styles.gallery}>{gallery.slice(0,5).map((src,i)=><div key={src} className={i===0?styles.galleryMain:""} style={{backgroundImage:`url(${src})`}}>{i===4?<span>+{Math.max(0,gallery.length-4)} εικόνες</span>:null}</div>)}</div>
  </section>:null}

  <section id="how" className={styles.socialProof}>
    <div className={styles.whyTitle}><small>ΓΙΑΤΙ ΝΑ ΚΛΕΙΣΕΙΣ ΑΠΟ ΕΔΩ</small><h2>Όχι άλλα 40 tabs. Κράτα τις πιο τεκμηριωμένες επιλογές μπροστά σου.</h2></div>
    <div className={styles.truthStats}>
      <div><AirplaneTilt weight="fill"/><b>{inventory.length.toLocaleString("el-GR")}+</b><span>live stays στο ενεργό inventory</span></div>
      <div><Globe weight="fill"/><b>{heroMedia.length||"Live"}</b><span>περιοχές με διαθέσιμο visual inventory</span></div>
      <div><Images weight="fill"/><b>{gallery.length}</b><span>εικόνες στην ενεργή featured σύνθεση</span></div>
    </div>
  </section>

  <section className={styles.why}>
   <div><Brain weight="fill"/><span><b>AI που καταλαβαίνει</b><p>Context, ημερομηνίες, budget και travel DNA στο ίδιο reasoning loop.</p></span></div>
   <div><Lightning weight="fill"/><span><b>Λιγότερη αναζήτηση</b><p>Από χιλιάδες επιλογές σε λίγες πραγματικές προτάσεις που αξίζουν.</p></span></div>
   <div><Compass weight="fill"/><span><b>Πραγματικό inventory</b><p>Ο χάρτης και τα cards προέρχονται από το ενεργό supply layer.</p></span></div>
   <div><ShieldCheck weight="fill"/><span><b>Truth-first</b><p>Δεν εφευρίσκουμε availability, ratings ή weather όταν δεν υπάρχουν στοιχεία.</p></span></div>
  </section>

  <nav className={styles.mobileDock} aria-label="Mobile navigation">
   <button onClick={()=>{setMobilePlannerOpen(false);document.getElementById("map")?.scrollIntoView({behavior:"smooth"})}}><MapPin weight="fill"/><span>Χάρτης</span></button>
   <button onClick={()=>setMobilePlannerOpen(true)}><Brain weight="fill"/><span>AI</span></button>
   <button onClick={()=>{setMobilePlannerOpen(false);document.getElementById("stays")?.scrollIntoView({behavior:"smooth"})}}><Star weight="fill"/><span>Stays</span></button>
   <button onClick={()=>{setMobilePlannerOpen(false);document.getElementById("destinations")?.scrollIntoView({behavior:"smooth"})}}><Compass weight="fill"/><span>Explore</span></button>
  </nav>

  <section className={styles.footerCta} style={gallery[1]?{backgroundImage:`linear-gradient(90deg,rgba(2,18,15,.94),rgba(2,18,15,.45)),url(${gallery[1]})`}:undefined}>
   <div><small>TRAVELAI · AI ESCAPE INTELLIGENCE</small><h2>Καλύτερα ταξίδια.<br/>Λιγότερος θόρυβος.</h2><p>Ξεκίνα από το feeling. Η AI θα κάνει το δύσκολο μέρος.</p></div><button onClick={()=>document.getElementById("planner")?.scrollIntoView({behavior:"smooth"})}>Ξεκίνα τώρα <ArrowRight/></button>
  </section>
 </main>
}