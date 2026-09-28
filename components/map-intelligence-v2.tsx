"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {LayerGroup,Map as LeafletMap,TileLayer} from "leaflet";
import {Brain,CalendarBlank,Compass,Crosshair,MapPin,Sparkle,TrendUp,Users,Wallet,X} from "@phosphor-icons/react";
import styles from "./map-intelligence-v2.module.css";

type Stay={
 productId:string;placeId?:string;name:string;location:string;address?:string;
 latitude:number;longitude:number;imageUrl:string|null;price:number|null;currency:string;
 intelligenceScore?:number;seasonalScore?:number;priceScore?:number;demandSignal?:number;
 mapSignal?:"ai"|"discovery"|"demand"|"seasonal"|"value"|"explore";destinationSlug?:string|null;
};
type Rating={provider:string;rating:number;scale:number;reviewCount:number|null;confidence:"HIGH"|"MEDIUM"|"LOW"};
type RatingPayload={primary?:Rating|null;ratings?:Rating[]}|null;
type NearbyPlace={id:string;name:string;category:"food"|"drink"|"activity";subtype:string;latitude:number;longitude:number;distanceKm:number;website:string|null;openingHours:string|null;cuisine:string|null;rating?:number|null;reviewCount?:number|null;provider?:"Google Places"|"Foursquare"|"OpenStreetMap";confidence?:"HIGH"|"MEDIUM"|"LOW"};
type NearbyDetails={
 ok:boolean;radiusKm:number;
 weather:{status:"trip-window"|"nearest-forecast"|"unavailable";summary:{label:string;maxC:number|null;minC:number|null;rainPct:number|null;windKmh:number|null}|null;days:Array<{date:string;icon:string;label:string;maxC:number;minC:number;rainPct:number;windKmh:number}>};
 nearby:{food:NearbyPlace[];drink:NearbyPlace[];activities:NearbyPlace[]};
};

const clamp=(n:number,a=0,b=100)=>Math.max(a,Math.min(b,n));
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Athens",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const addDays=(iso:string,d:number)=>{const x=new Date(iso+"T00:00:00Z");x.setUTCDate(x.getUTCDate()+d);return x.toISOString().slice(0,10)};
const money=(n:number|null,c="EUR")=>n!=null&&n>=5?new Intl.NumberFormat("el-GR",{style:"currency",currency:c,maximumFractionDigits:0}).format(n):"τιμή στον πάροχο";
const haversine=(a:{lat:number;lon:number},b:{lat:number;lon:number})=>{
 const R=6371,rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
 const q=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
 return 2*R*Math.asin(Math.sqrt(q));
};
const repScore=(r:RatingPayload)=>{
 const best=r?.ratings?.filter(x=>x.provider!=="AI Guest Signal").sort((a,b)=>(b.reviewCount??0)-(a.reviewCount??0))[0];
 if(!best)return null;
 const normalized=best.rating/best.scale*100;
 const volume=Math.min(1,Math.log10((best.reviewCount??0)+10)/4);
 return clamp(normalized*.82+volume*18);
};
const repLabel=(r:RatingPayload)=>{
 const best=r?.ratings?.filter(x=>x.provider!=="AI Guest Signal").sort((a,b)=>(b.reviewCount??0)-(a.reviewCount??0))[0];
 return best?{text:`${best.rating.toFixed(1)}/${best.scale}`,sub:`${best.provider}${best.reviewCount!=null?` · ${best.reviewCount.toLocaleString("el-GR")} reviews`:""}`}:null;
};

type Scored=Stay&{match:number;spatial:number;reputation:number|null;confidence:number;dominant:"match"|"reviews"|"season"|"value"|"demand"|"explore"};

export function MapIntelligenceV2(){
 const [inventory,setInventory]=useState<Stay[]>([]);
 const [ratings,setRatings]=useState<Record<string,RatingPayload>>({});
 const [selected,setSelected]=useState<Scored|null>(null);
 const [mode,setMode]=useState<"global"|"local">("global");
 const [satellite,setSatellite]=useState(true);
 const [intent,setIntent]=useState("Χαλάρωση");
 const [start,setStart]=useState(()=>addDays(today(),14));
 const [end,setEnd]=useState(()=>addDays(today(),17));
 const [budget,setBudget]=useState(800);
 const [traveler,setTraveler]=useState("couple");
 const [view,setView]=useState({lat:38.2,lon:23.7,zoom:6});
 const [ready,setReady]=useState(false);
 const [loading,setLoading]=useState(true);
 const [detailsOpen,setDetailsOpen]=useState(false);
 const [detailsLoading,setDetailsLoading]=useState(false);
 const [details,setDetails]=useState<NearbyDetails|null>(null);
 const [detailsError,setDetailsError]=useState<string|null>(null);
 const [venueRatings,setVenueRatings]=useState<Record<string,RatingPayload>>({});
 const mapHost=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<LeafletMap|null>(null);
 const layerRef=useRef<LayerGroup|null>(null);
 const tileRef=useRef<TileLayer|null>(null);
 const ratingPending=useRef(new Set<string>());

 useEffect(()=>{
  let dead=false;setLoading(true);
  fetch(`/api/v50/map-stays?limit=2000&start=${encodeURIComponent(start)}`,{cache:"no-store"})
   .then(r=>r.json()).then(x=>{if(!dead)setInventory(Array.isArray(x.products)?x.products:[])}).catch(()=>{})
   .finally(()=>{if(!dead)setLoading(false)});
  return()=>{dead=true};
 },[start]);

 useEffect(()=>{
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapHost.current||mapRef.current)return;
   const map=L.map(mapHost.current,{zoomControl:false,attributionControl:false,minZoom:5,maxZoom:18,worldCopyJump:true}).setView([38.2,23.7],6);
   L.control.zoom({position:"bottomright"}).addTo(map);
   tileRef.current=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18}).addTo(map);
   mapRef.current=map;
   const sync=()=>{const c=map.getCenter();setView({lat:c.lat,lon:c.lng,zoom:map.getZoom()})};
   map.on("moveend",sync);sync();window.setTimeout(()=>{map.invalidateSize();setReady(true)},80);
  });
  return()=>{dead=true;mapRef.current?.remove();mapRef.current=null};
 },[]);

 useEffect(()=>{
  if(!mapRef.current)return;
  void import("leaflet").then(L=>{
   if(!mapRef.current)return;
   tileRef.current?.remove();
   tileRef.current=L.tileLayer(satellite
    ?"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    :"https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18}).addTo(mapRef.current);
  });
 },[satellite]);

 const scored=useMemo<Scored[]>(()=>{
  const center={lat:view.lat,lon:view.lon};
  const moodBoost=intent==="Χαλάρωση"?3:intent==="Ρομαντικό"?2:intent==="Γαστρονομία"?1:0;
  return inventory.filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)).map(p=>{
   const ai=clamp((p.intelligenceScore??58)+moodBoost);
   const season=clamp(p.seasonalScore??60);
   const value=clamp(p.priceScore??55);
   const demand=clamp(p.demandSignal??50);
   const distance=haversine(center,{lat:p.latitude,lon:p.longitude});
   const spatial=mode==="local"?clamp(100-distance/4):72;
   const reputation=repScore(ratings[p.productId]);
   const confidence=clamp(48+
     (p.intelligenceScore!=null?14:0)+(p.seasonalScore!=null?10:0)+(p.priceScore!=null?8:0)+(reputation!=null?20:0));
   const rep=reputation??72;
   const match=clamp(ai*.30+rep*.17+season*.16+spatial*.14+value*.10+demand*.05+72*.04+confidence*.04);
   const signals=[
    ["reviews",rep] as const,["season",season] as const,["value",value] as const,["demand",demand] as const
   ].sort((a,b)=>b[1]-a[1]);
   const dominant:Scored["dominant"]=match>=88?"match":signals[0]?.[0]??"explore";
   return {...p,match,spatial,reputation,confidence,dominant};
  }).sort((a,b)=>b.match-a.match);
 },[inventory,ratings,mode,view.lat,view.lon,intent]);

 const top=scored.slice(0,12);

 useEffect(()=>{
  for(const p of top.slice(0,8)){
   if(ratings[p.productId]!==undefined||ratingPending.current.has(p.productId))continue;
   ratingPending.current.add(p.productId);
   fetch("/api/v50/stay-rating",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    propertyName:p.name,sourceProductId:p.productId,destinationSlug:p.destinationSlug,destinationName:p.location,latitude:p.latitude,longitude:p.longitude
   })}).then(r=>r.json()).then(x=>setRatings(v=>({...v,[p.productId]:x?.ok?x.result??null:null})))
    .catch(()=>setRatings(v=>({...v,[p.productId]:null}))).finally(()=>ratingPending.current.delete(p.productId));
  }
 },[top.map(x=>x.productId).join("|")]);

 useEffect(()=>{
  if(!mapRef.current||!ready)return;
  let dead=false;
  void import("leaflet").then(L=>{
   if(dead||!mapRef.current)return;
   layerRef.current?.remove();
   const layer=L.layerGroup().addTo(mapRef.current);layerRef.current=layer;
   const rank=new Map(top.map((x,i)=>[x.productId,i+1]));
   const items=scored.slice(0,Math.min(420,scored.length));
   for(const p of items){
    const r=rank.get(p.productId);
    const size=Math.round(22+Math.pow(p.match/100,2.15)*48+(r&&r<=3?8:0));
    const cls=`mi2Star mi2-${p.dominant}`;
    const marker=L.marker([p.latitude,p.longitude],{
     icon:L.divIcon({
      className:cls,
      html:`<span style="--s:${size}px;--confidence:${Math.round(p.confidence)}"><i>★</i>${r&&r<=5?`<b>#${r}</b>`:""}<em></em></span>`,
      iconSize:[size,size],iconAnchor:[size/2,size/2]
     }),
     zIndexOffset:r?2000-r*20:Math.round(p.match*8)
    });
    marker.on("mouseover",()=>{setSelected(p)});
    marker.on("click",()=>{setSelected(p);const map=mapRef.current;if(map)map.flyTo([p.latitude,p.longitude],Math.max(10,map.getZoom()),{duration:.65})});
    marker.addTo(layer);
   }
  });
  return()=>{dead=true};
 },[scored,top.map(x=>x.productId).join("|"),ready]);

 const active=selected??top[0]??null;
 const rating=active?repLabel(ratings[active.productId]):null;
 const signalLabel=active?.dominant==="match"?"AI Best Match":active?.dominant==="reviews"?"Strong Reviews":active?.dominant==="season"?"Best Now":active?.dominant==="value"?"Best Value":active?.dominant==="demand"?"High Demand":"Explore";

 useEffect(()=>{
  setDetailsOpen(false);setDetails(null);setDetailsError(null);setVenueRatings({});
 },[active?.productId]);

 useEffect(()=>{
  if(!active||ratings[active.productId]!==undefined||ratingPending.current.has(active.productId))return;
  ratingPending.current.add(active.productId);
  fetch("/api/v50/stay-rating",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   propertyName:active.name,sourceProductId:active.productId,destinationSlug:active.destinationSlug,destinationName:active.location,latitude:active.latitude,longitude:active.longitude
  })}).then(r=>r.json()).then(x=>setRatings(v=>({...v,[active.productId]:x?.ok?x.result??null:null})))
   .catch(()=>setRatings(v=>({...v,[active.productId]:null}))).finally(()=>ratingPending.current.delete(active.productId));
 },[active?.productId]);

 async function open360Reasoning(){
  if(!active)return;
  setDetailsOpen(true);setDetailsLoading(true);setDetailsError(null);
  try{
   const q=new URLSearchParams({lat:String(active.latitude),lon:String(active.longitude),start,end});
   const r=await fetch(`/api/v50/nearby-intelligence?${q.toString()}`,{cache:"no-store"});
   const j=await r.json() as NearbyDetails;
   if(!r.ok||!j?.ok)throw new Error("nearby");
   setDetails(j);
  }catch{
   setDetailsError("Δεν επέστρεψαν τώρα live nearby δεδομένα. Κράτησα το verified rating και τα TravelAI scores χωρίς να εφεύρω πληροφορίες.");
  }finally{setDetailsLoading(false)}
 }

 const flyNearby=(p:NearbyPlace)=>{
  const map=mapRef.current;if(map)map.flyTo([p.latitude,p.longitude],15,{duration:.65});
 };

 useEffect(()=>{
  if(!details||!active)return;
  const candidates=[
   ...details.nearby.food.slice(0,3),
   ...details.nearby.drink.slice(0,3),
   ...details.nearby.activities.slice(0,3)
  ];
  for(const p of candidates){
   if(venueRatings[p.id]!==undefined)continue;
   const sourceId=p.id.replace(/[^a-zA-Z0-9:_-]/g,"-").slice(0,170)||"nearby";
   fetch("/api/v50/stay-rating",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    propertyName:p.name,sourceProductId:sourceId,destinationSlug:active.destinationSlug||"nearby",
    destinationName:active.location,latitude:p.latitude,longitude:p.longitude
   })}).then(r=>r.json()).then(x=>setVenueRatings(v=>({...v,[p.id]:x?.ok?x.result??null:null})))
    .catch(()=>setVenueRatings(v=>({...v,[p.id]:null})));
  }
 },[details,active?.productId]);

 return <main className={styles.page}>
  <header className={styles.topbar}>
   <a href="/" className={styles.brand}>TRAVEL<span>AI</span><small>MAP INTELLIGENCE LAB</small></a>
   <div className={styles.modeSwitch}>
    <button className={mode==="global"?styles.active:""} onClick={()=>setMode("global")}><Brain weight="fill"/> Best for me</button>
    <button className={mode==="local"?styles.active:""} onClick={()=>setMode("local")}><Crosshair weight="fill"/> Best around here</button>
   </div>
   <a href="/" className={styles.back}>← production</a>
  </header>

  <section className={styles.stage}>
   <div ref={mapHost} className={styles.map}/>
   {!ready||loading?<div className={styles.loading}><Sparkle weight="fill"/><b>TravelAI is reasoning over the map…</b><span>{inventory.length?inventory.length.toLocaleString("el-GR")+" live stays":"loading live inventory"}</span></div>:null}

   <div className={styles.glow}/>
   <aside className={styles.control}>
    <div className={styles.eyebrow}><Sparkle weight="fill"/> AI 360° TRAVEL DECISION ENGINE</div>
    <h1>Ο χάρτης δεν δείχνει απλώς μέρη.<br/><em>Σου δείχνει τι αξίζει περισσότερο τώρα.</em></h1>
    <p>Το μέγεθος κάθε ⭐ είναι το συνολικό personal match. Το χρώμα εξηγεί <b>γιατί</b> ανεβαίνει.</p>

    <div className={styles.form}>
     <label><CalendarBlank/><span>Από</span><input type="date" value={start} min={today()} onChange={e=>setStart(e.target.value)}/></label>
     <label><CalendarBlank/><span>Έως</span><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label>
     <label><Users/><span>Παρέα</span><select value={traveler} onChange={e=>setTraveler(e.target.value)}><option value="couple">Ζευγάρι</option><option value="solo">Solo</option><option value="family">Οικογένεια</option><option value="friends">Φίλοι</option></select></label>
     <label><Wallet/><span>Budget</span><select value={budget} onChange={e=>setBudget(Number(e.target.value))}><option value={500}>≤ €500</option><option value={800}>€500–800</option><option value={1200}>€800–1.200</option><option value={2000}>Premium</option></select></label>
    </div>

    <div className={styles.vibes}>{["Χαλάρωση","Ρομαντικό","Περιπέτεια","Γαστρονομία"].map(x=><button key={x} className={intent===x?styles.vibeActive:""} onClick={()=>setIntent(x)}>{x}</button>)}</div>

    <div className={styles.legend}>
     <span><i className={styles.gold}>★</i> AI match</span>
     <span><i className={styles.purple}>★</i> Reviews</span>
     <span><i className={styles.cyan}>★</i> Season</span>
     <span><i className={styles.green}>★</i> Value</span>
     <span><i className={styles.coral}>★</i> Demand</span>
    </div>

    <div className={styles.topPicks}>
     {top.slice(0,3).map((p,i)=><button key={p.productId} onClick={()=>{setSelected(p);const map=mapRef.current;if(map)map.flyTo([p.latitude,p.longitude],11,{duration:.8})}}>
      <b>#{i+1}</b><span><strong>{p.location}</strong><small>{Math.round(p.match)}% match · {money(p.price,p.currency)}</small></span><em>→</em>
     </button>)}
    </div>
   </aside>

   <div className={styles.mapTools}>
    <button className={!satellite?styles.toolActive:""} onClick={()=>setSatellite(false)}>Map</button>
    <button className={satellite?styles.toolActive:""} onClick={()=>setSatellite(true)}>Satellite</button>
   </div>

   {active?<aside className={styles.reason}>
    <button className={styles.close} onClick={()=>setSelected(null)} aria-label="Κλείσιμο"><X/></button>
    <div className={styles.reasonHero} style={active.imageUrl?{backgroundImage:`linear-gradient(180deg,rgba(8,21,18,.04),rgba(8,21,18,.82)),url(${active.imageUrl})`}:undefined}>
     <span>{signalLabel}</span>
     <div><small><MapPin weight="fill"/> {active.location}</small><h2>{active.name}</h2></div>
     <strong>{Math.round(active.match)}<small>/100</small></strong>
    </div>
    <div className={styles.reasonBody}>
     <div className={styles.metrics}>
      <span><b>{Math.round(active.intelligenceScore??58)}</b><small>Needs match</small></span>
      <span><b>{rating?.text??(active.reputation!=null?Math.round(active.reputation):"—")}</b><small>{rating?.sub??"Reputation"}</small></span>
      <span><b>{Math.round(active.seasonalScore??60)}</b><small>Season now</small></span>
      <span><b>{Math.round(active.spatial)}</b><small>Spatial fit</small></span>
      <span><b>{Math.round(active.priceScore??55)}</b><small>Value</small></span>
      <span><b>{Math.round(active.confidence)}%</b><small>Confidence</small></span>
     </div>
     <div className={styles.why}>
      <h3><Brain weight="fill"/> Why TravelAI ranks it here</h3>
      <p><b>{Math.round(active.match)}% συνολικό match.</b> Συνδυάζει needs-fit, seasonality, value, spatial relevance και reputation signal όπου υπάρχει verified evidence.</p>
      <div><span><TrendUp/> Best signal</span><b>{signalLabel}</b></div>
      <div><span><Compass/> Trade-off</span><b>{active.spatial<65?"Πιο μακριά από το viewport που εξερευνάς":"Δεν φαίνεται ισχυρό spatial penalty"}</b></div>
     </div>
     <button className={styles.cta} onClick={()=>void open360Reasoning()}>Άνοιξε 360° reasoning <Sparkle weight="fill"/></button>
    </div>
   </aside>:null}

   {active&&detailsOpen?<aside className={styles.deepReason}>
    <div className={styles.deepHead}>
     <div><span>TRAVELAI · 360° AROUND THIS PLACE</span><h2>{active.location}</h2><p>{active.name}</p></div>
     <button onClick={()=>setDetailsOpen(false)} aria-label="Κλείσιμο 360 reasoning"><X/></button>
    </div>

    <div className={styles.deepSummary}>
     <div className={styles.ratingBig}><small>VERIFIED RATING</small><b>{rating?.text??"—"}</b><span>{rating?.sub??"Δεν έχει επιστρέψει verified external rating ακόμη"}</span></div>
     <div><small>PERSONAL MATCH</small><b>{Math.round(active.match)}/100</b><span>{signalLabel}</span></div>
     <div><small>SEASON NOW</small><b>{Math.round(active.seasonalScore??60)}/100</b><span>{start} → {end}</span></div>
    </div>

    {detailsLoading?<div className={styles.deepLoading}><Sparkle weight="fill"/><b>Scanning weather + nearby life…</b><span>φαγητό · ποτό · δραστηριότητες · spatial context</span></div>:null}
    {detailsError?<div className={styles.deepError}>{detailsError}</div>:null}

    {details?.weather?.summary?<section className={styles.weatherBlock}>
     <div className={styles.deepSectionTitle}><span>WEATHER</span><b>{details.weather.status==="trip-window"?"στις ημερομηνίες σου":"nearest available forecast"}</b></div>
     <div className={styles.weatherHero}><strong>{details.weather.days[0]?.icon??"🌤️"}</strong><div><b>{details.weather.summary.label}</b><span>{Math.round(details.weather.summary.minC??0)}°–{Math.round(details.weather.summary.maxC??0)}°C · rain {Math.round(details.weather.summary.rainPct??0)}% · wind {Math.round(details.weather.summary.windKmh??0)} km/h</span></div></div>
     <div className={styles.weatherDays}>{details.weather.days.slice(0,5).map(d=><div key={d.date}><small>{new Date(d.date+"T00:00:00").toLocaleDateString("el-GR",{weekday:"short",day:"numeric"})}</small><b>{d.icon} {Math.round(d.maxC)}°</b><span>{d.label} · {Math.round(d.rainPct)}%</span></div>)}</div>
    </section>:null}

    {details?<div className={styles.nearbyGrid}>
     <NearbySection title="🍽️ FOOD NEARBY" items={details.nearby.food} ratings={venueRatings} onPick={flyNearby}/>
     <NearbySection title="🍸 DRINK NEARBY" items={details.nearby.drink} ratings={venueRatings} onPick={flyNearby}/>
     <NearbySection title="🧭 THINGS TO DO" items={details.nearby.activities} ratings={venueRatings} onPick={flyNearby}/>
    </div>:null}

    <div className={styles.deepFoot}>
     <div><b>There + nearby intelligence</b><span>Verified stay rating + Open-Meteo + Google Places / Foursquare / OpenStreetMap cascade. Κάθε venue rating εμφανίζεται μόνο όταν επιστρέφεται από provider.</span></div>
     <button onClick={()=>{const slug=active.destinationSlug;if(slug)window.location.href=`/escape/${encodeURIComponent(slug)}/stay/${encodeURIComponent(active.productId)}?start=${start}&end=${end}&budget=${budget}&travelerType=${traveler}&dn=${encodeURIComponent(active.location)}`;}}>Δες τη διαμονή →</button>
    </div>
   </aside>:null}

   <div className={styles.status}>
    <span><i/> LIVE</span>
    <b>{inventory.length.toLocaleString("el-GR")} stays</b>
    <span>viewport {view.zoom.toFixed(0)}x</span>
    <span>{mode==="local"?"spatial-aware ranking":"global personal ranking"}</span>
   </div>
  </section>
 </main>
}

function NearbySection({title,items,ratings,onPick}:{title:string;items:NearbyPlace[];ratings:Record<string,RatingPayload>;onPick:(p:NearbyPlace)=>void}){
 return <section className={styles.nearbySection}>
  <div className={styles.deepSectionTitle}><span>{title}</span><b>{items.length?items.length+" επιλογές":"χωρίς live results"}</b></div>
  <div className={styles.placeList}>
   {items.length?items.slice(0,6).map(p=>{
    const vr=repLabel(ratings[p.id]);
    const direct=p.rating!=null?{text:p.rating.toFixed(1)+"/5",sub:`${p.provider??"provider"}${p.reviewCount!=null?` · ${p.reviewCount.toLocaleString("el-GR")} reviews`:""}`}:null;
    const shown=direct??vr;
    return <button key={p.id} onClick={()=>onPick(p)}>
     <span><b>{p.name}</b><small>{p.cuisine??p.subtype}{shown?.sub?` · ${shown.sub}`:p.openingHours?` · ${p.openingHours}`:""}</small></span>
     <em>{shown?<>★ {shown.text} · {p.distanceKm.toFixed(1)} km</>:<>{p.distanceKm.toFixed(1)} km · {p.provider??"verified map"} ↗</>}</em>
    </button>
   }):<p>Οι live providers δεν επέστρεψαν αρκετά αξιόπιστα σημεία στην περιοχή. Δεν δημιουργούμε filler αποτελέσματα.</p>}
  </div>
 </section>
}
