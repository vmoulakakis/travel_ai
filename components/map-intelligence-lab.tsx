"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import { Brain, Compass, Crosshair, MapPin, Sparkle, Star, Waves, Wind } from "@phosphor-icons/react";
import styles from "./map-intelligence-lab.module.css";

type Stay = {
  productId: string;
  name: string;
  location: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  intelligenceScore?: number;
  seasonalScore?: number;
  priceScore?: number;
  demandSignal?: number;
  mapSignal?: "ai" | "discovery" | "demand" | "seasonal" | "value" | "explore";
  destinationSlug?: string | null;
};

type RatingSignal = {
  provider: string;
  rating: number;
  scale: number;
  reviewCount: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

type QuickRating = {
  status: "live" | "unavailable";
  primary: RatingSignal | null;
  ratings: RatingSignal[];
};

type Mode = "best" | "nearby";

const money = (n:number|null,c="EUR") =>
  n == null ? "Live price" : new Intl.NumberFormat("el-GR",{style:"currency",currency:c,maximumFractionDigits:0}).format(n);

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const html=(v:string)=>v.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]??ch));

function reputationScore(r:QuickRating|null|undefined){
  const usable=r?.ratings?.filter(x=>x.provider!=="AI Guest Signal")??[];
  if(!usable.length)return 58;
  const weighted=usable.map(x=>{
    const normalized=(x.rating/x.scale)*100;
    const volume=Math.log10(Math.max(10,x.reviewCount??10))/4;
    const confidence=x.confidence==="HIGH"?1:x.confidence==="MEDIUM"?.92:.84;
    return normalized*(.82+.18*Math.min(1,volume))*confidence;
  });
  return clamp(weighted.reduce((a,b)=>a+b,0)/weighted.length);
}

function spatialScore(p:Stay, center:{lat:number;lon:number}, mode:Mode){
  if(mode==="best")return clamp(70 + ((p.intelligenceScore??65)-65)*.35);
  const dx=(p.latitude-center.lat)*111;
  const dy=(p.longitude-center.lon)*90;
  const km=Math.sqrt(dx*dx+dy*dy);
  return clamp(100-km*1.4);
}

function matchScore(p:Stay, rep:number, spatial:number){
  const intent=clamp((p.intelligenceScore??65)+8);
  const season=clamp(p.seasonalScore??62);
  const value=clamp(p.priceScore??58);
  const demand=clamp(p.demandSignal??50);
  const friction=clamp(68 + spatial*.22);
  const evidence=clamp(rep*.65 + season*.35);
  return clamp(
    intent*.28 + rep*.17 + season*.15 + spatial*.14 + value*.10 + friction*.07 + demand*.05 + evidence*.04
  );
}

function dominantSignal(p:Stay){
  const set=[
    {key:"seasonal",v:p.seasonalScore??0},
    {key:"value",v:p.priceScore??0},
    {key:"demand",v:p.demandSignal??0},
    {key:"ai",v:p.intelligenceScore??0}
  ] as const;
  return [...set].sort((a,b)=>b.v-a.v)[0].key;
}

export function MapIntelligenceLab(){
  const [inventory,setInventory]=useState<Stay[]>([]);
  const [ratings,setRatings]=useState<Record<string,QuickRating|null>>({});
  const [mode,setMode]=useState<Mode>("best");
  const [selected,setSelected]=useState<string|null>(null);
  const [satellite,setSatellite]=useState(true);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState({lat:38.3,lon:23.5,zoom:6});
  const mapHost=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<LeafletMap|null>(null);
  const layerRef=useRef<LayerGroup|null>(null);
  const tileRef=useRef<TileLayer|null>(null);

  useEffect(()=>{
    let dead=false;
    fetch("/api/v50/map-stays?limit=420",{cache:"no-store"})
      .then(r=>r.json())
      .then(j=>{ if(!dead && Array.isArray(j.products)) setInventory(j.products); })
      .finally(()=>!dead&&setLoading(false));
    return()=>{dead=true};
  },[]);

  useEffect(()=>{
    let dead=false;
    void import("leaflet").then(L=>{
      if(dead||!mapHost.current||mapRef.current)return;
      const map=L.map(mapHost.current,{zoomControl:false,attributionControl:false,minZoom:5,maxZoom:18}).setView([38.25,23.55],6);
      L.control.zoom({position:"bottomright"}).addTo(map);
      tileRef.current=L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {maxZoom:18}
      ).addTo(map);
      const sync=()=>{const c=map.getCenter();setView({lat:c.lat,lon:c.lng,zoom:map.getZoom()})};
      map.on("moveend",sync); sync();
      mapRef.current=map;
      setTimeout(()=>map.invalidateSize(),60);
    });
    return()=>{dead=true;mapRef.current?.remove();mapRef.current=null};
  },[]);

  useEffect(()=>{
    if(!mapRef.current)return;
    void import("leaflet").then(L=>{
      if(!mapRef.current)return;
      tileRef.current?.remove();
      tileRef.current=L.tileLayer(
        satellite
          ?"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          :"https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {maxZoom:18}
      ).addTo(mapRef.current);
    });
  },[satellite]);

  const ranked=useMemo(()=>{
    return inventory
      .filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude))
      .map(p=>{
        const rep=reputationScore(ratings[p.productId]);
        const spatial=spatialScore(p,view,mode);
        const match=matchScore(p,rep,spatial);
        return {...p,rep,spatial,match,signal:dominantSignal(p)};
      })
      .sort((a,b)=>b.match-a.match);
  },[inventory,ratings,view.lat,view.lon,mode]);

  useEffect(()=>{
    const top=ranked.slice(0,8).filter(p=>p.destinationSlug && ratings[p.productId]===undefined);
    top.forEach(p=>{
      fetch("/api/v50/stay-rating",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          propertyName:p.name,
          sourceProductId:p.productId,
          destinationSlug:p.destinationSlug,
          destinationName:p.location||p.address,
          latitude:p.latitude,
          longitude:p.longitude
        })
      }).then(r=>r.json()).then(j=>setRatings(v=>({...v,[p.productId]:j?.ok?j.result??null:null}))).catch(()=>{});
    });
  },[ranked.slice(0,8).map(x=>x.productId).join("|")]);

  useEffect(()=>{
    if(!mapRef.current)return;
    let dead=false;
    void import("leaflet").then(L=>{
      if(dead||!mapRef.current)return;
      layerRef.current?.remove();
      const g=L.layerGroup().addTo(mapRef.current);
      layerRef.current=g;

      ranked.slice(0,260).forEach((p,index)=>{
        const topRank=index<5;
        const size=Math.round(24 + Math.pow(p.match/100,2.15)*50);
        const ring=Math.round(p.rep);
        const opacity=.46 + Math.min(.54,p.match/100*.54);
        const signal=p.signal;
        const tooltip=`
          <div class="tMapTip">
            <div class="tMapTipBadge">AI MATCH · #${index+1}</div>
            <div class="tMapTipTitle">${html(p.location||p.name)}</div>
            <div class="tMapTipMeta"><b>${Math.round(p.match)}%</b> personal match · ${html(money(p.price,p.currency))}</div>
            <div class="tMapMiniGrid">
              <span><b>${Math.round(p.rep)}</b><small>Reputation</small></span>
              <span><b>${Math.round(p.seasonalScore??0)}</b><small>Season</small></span>
              <span><b>${Math.round(p.spatial)}</b><small>Spatial</small></span>
              <span><b>${Math.round(p.priceScore??0)}</b><small>Value</small></span>
            </div>
            <small>Click for 360° reasoning</small>
          </div>`;

        const icon=L.divIcon({
          className:`tStar tStar-${signal} ${topRank?"tStar-top":""}`,
          html:`<span style="--s:${size}px;--ring:${ring}%;--o:${opacity}"><i>★</i>${topRank?`<b>#${index+1}</b>`:""}</span>`,
          iconSize:[size,size],
          iconAnchor:[size/2,size/2]
        });
        const marker=L.marker([p.latitude,p.longitude],{icon,zIndexOffset:topRank?1800-index:Math.round(p.match*8)}).addTo(g);
        marker.bindTooltip(tooltip,{direction:"top",offset:[0,-14],opacity:1,className:"tTooltip"});
        marker.on("click",()=>setSelected(p.productId));
      });
    });
    return()=>{dead=true};
  },[ranked,mode]);

  const active=ranked.find(x=>x.productId===selected)??ranked[0]??null;
  const zoomLabel=view.zoom<7?"Greece intelligence":view.zoom<10?"Region intelligence":view.zoom<13?"Destination intelligence":"Local stay intelligence";

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <div className={styles.brand}>TRAVEL<span>AI</span><small>MAP INTELLIGENCE LAB</small></div>
      <div className={styles.status}><i/> Live decision graph <b>{ranked.length||"—"}</b> signals</div>
      <a href="/">← Back to TravelAI</a>
    </header>

    <section className={styles.hero}>
      <div>
        <small>360° SPATIAL DECISION ENGINE · EXPERIMENTAL</small>
        <h1>Your trip,<br/><em>ranked in space.</em></h1>
        <p>Το μέγεθος δείχνει πόσο ισχυρό είναι το προσωπικό match. Το χρώμα εξηγεί <b>γιατί</b> το AI προτείνει το σημείο. Ο χάρτης αλλάζει intelligence καθώς αλλάζει το viewport.</p>
      </div>
      <div className={styles.heroStats}>
        <div><strong>{active?Math.round(active.match):"—"}%</strong><span>Top personal match</span></div>
        <div><strong>{active?Math.round(active.rep):"—"}</strong><span>Reputation confidence</span></div>
        <div><strong>{zoomLabel}</strong><span>Semantic zoom layer</span></div>
      </div>
    </section>

    <section className={styles.shell}>
      <aside className={styles.controlRail}>
        <div className={styles.railHead}><Brain weight="fill"/><div><b>AI Lens</b><span>What should matter now?</span></div></div>

        <div className={styles.modeSwitch}>
          <button className={mode==="best"?styles.active:""} onClick={()=>setMode("best")}><Sparkle/> Best for me</button>
          <button className={mode==="nearby"?styles.active:""} onClick={()=>setMode("nearby")}><Crosshair/> Best around here</button>
        </div>

        <div className={styles.legend}>
          <span><i className={styles.gold}>★</i><b>AI Match</b><small>overall fit</small></span>
          <span><i className={styles.orange}>★</i><b>Season</b><small>right now</small></span>
          <span><i className={styles.green}>★</i><b>Value</b><small>price/value</small></span>
          <span><i className={styles.pink}>★</i><b>Demand</b><small>social proof</small></span>
          <span><i className={styles.blue}>★</i><b>Explore</b><small>discovery</small></span>
        </div>

        <div className={styles.scaleCard}>
          <b>Star size = personal match</b>
          <div className={styles.scaleStars}><span>★</span><span>★</span><span>★</span></div>
          <small>24px → 74px · nonlinear confidence scale</small>
        </div>

        <div className={styles.layerCard}>
          <span>Semantic layer</span>
          <b>{zoomLabel}</b>
          <small>Zoom {view.zoom} · {view.lat.toFixed(2)}, {view.lon.toFixed(2)}</small>
        </div>
      </aside>

      <div className={styles.mapStage}>
        <div className={styles.mapToolbar}>
          <div><Compass weight="fill"/><span>{mode==="best"?"Global personal ranking":"Viewport-aware reranking"}</span></div>
          <div>
            <button className={!satellite?styles.on:""} onClick={()=>setSatellite(false)}>Map</button>
            <button className={satellite?styles.on:""} onClick={()=>setSatellite(true)}>Satellite</button>
          </div>
        </div>
        <div ref={mapHost} className={styles.map}/>
        {loading&&<div className={styles.loading}>AI is building the travel graph…</div>}
        <div className={styles.mapCaption}><MapPin weight="fill"/> Move the map: <b>Best around here</b> recalculates spatial relevance.</div>
      </div>

      <aside className={styles.reasonPanel}>
        {active ? <>
          <div className={styles.reasonHero} style={active.imageUrl?{backgroundImage:`linear-gradient(180deg,transparent,rgba(3,17,14,.92)),url("${active.imageUrl}")`}:undefined}>
            <span>#1 AI DECISION</span>
            <div><small>{active.location}</small><h2>{Math.round(active.match)}% match</h2></div>
          </div>

          <div className={styles.reasonBody}>
            <div className={styles.confidenceLine}><span>AI confidence</span><b>{active.match>85?"HIGH":"MEDIUM-HIGH"}</b></div>
            <h3>Why this rises for you</h3>
            <p>Ισχυρός συνδυασμός προσωπικού fit, εποχικότητας, spatial convenience και value. Δεν είναι απλώς δημοφιλές· ανεβαίνει επειδή το συνολικό context είναι ισχυρότερο.</p>

            <div className={styles.metricGrid}>
              <Metric label="Intent" value={active.intelligenceScore??0}/>
              <Metric label="Reputation" value={active.rep}/>
              <Metric label="Season now" value={active.seasonalScore??0}/>
              <Metric label="Spatial" value={active.spatial}/>
              <Metric label="Value" value={active.priceScore??0}/>
              <Metric label="Demand" value={active.demandSignal??0}/>
            </div>

            <div className={styles.insight}>
              <Wind/><div><b>Why now</b><span>Το seasonal context ενσωματώνεται στο match αντί να είναι απλό badge.</span></div>
            </div>
            <div className={styles.insight}>
              <Waves/><div><b>Spatial advantage</b><span>{mode==="nearby"?"Το score προσαρμόστηκε στη ζώνη που εξερευνάς.":"Το global ranking δεν επηρεάζεται από τυχαίο pan του χάρτη."}</span></div>
            </div>

            <button className={styles.compare}>Why this instead of #2? <span>→</span></button>
            <button className={styles.primary}>Choose destination <span>→</span></button>
          </div>
        </>:<div className={styles.empty}>Move around the map to start.</div>}
      </aside>
    </section>

    <section className={styles.bottom}>
      <div><small>DESIGN PRINCIPLE 01</small><b>Color explains why.</b><p>Το χρώμα δεν είναι score. Είναι η αιτία που το σημείο αναδεικνύεται.</p></div>
      <div><small>DESIGN PRINCIPLE 02</small><b>Size shows strength.</b><p>Μεγάλο αστέρι = ισχυρότερο συνολικό match για το συγκεκριμένο ταξίδι.</p></div>
      <div><small>DESIGN PRINCIPLE 03</small><b>Map is context.</b><p>Το viewport είναι input στο AI, όχι απλώς τρόπος πλοήγησης.</p></div>
    </section>
  </main>
}

function Metric({label,value}:{label:string;value:number}){
  return <div className={styles.metric}><div><span>{label}</span><b>{Math.round(value)}</b></div><i><em style={{width:`${clamp(value)}%`}}/></i></div>
}
