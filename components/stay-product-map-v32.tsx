"use client";

import "leaflet/dist/leaflet.css";
import { useEffect,useMemo,useRef,useState } from "react";
import type { StayMapProductV32,StayProductMapPayloadV32 } from "@/lib/data/stay-product-map-v32";

type Lang="el"|"en";
type Engine="google"|"osm";
const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;
const money=(value:number|null,currency:string,lang:Lang)=>value==null?say(lang,"Δες τιμή","See price"):new Intl.NumberFormat(lang==="el"?"el-GR":"en-GB",{style:"currency",currency:currency||"EUR",maximumFractionDigits:0}).format(value);

async function loadGoogleMaps(key:string){
 const w=window as typeof window&{google?:any};if(w.google?.maps)return w.google;
 const existing=document.querySelector<HTMLScriptElement>('script[data-stay-google-maps]');
 if(existing)await new Promise<void>((resolve,reject)=>{if(w.google?.maps)return resolve();existing.addEventListener("load",()=>resolve(),{once:true});existing.addEventListener("error",()=>reject(new Error("google maps")),{once:true})});
 else await new Promise<void>((resolve,reject)=>{const script=document.createElement("script");script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;script.async=true;script.defer=true;script.dataset.stayGoogleMaps="1";script.onload=()=>resolve();script.onerror=()=>reject(new Error("google maps"));document.head.appendChild(script)});
 if(!w.google?.maps)throw new Error("google maps unavailable");return w.google;
}

export function StayProductMapV32({lang="el"}:{lang?:Lang}){
 const[products,setProducts]=useState<StayMapProductV32[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[query,setQuery]=useState(""),[location,setLocation]=useState("all"),[maxPrice,setMaxPrice]=useState("all"),[saleOnly,setSaleOnly]=useState(false),[selectedId,setSelectedId]=useState<string|null>(null),[engine,setEngine]=useState<Engine>(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?"google":"osm");
 const mapHost=useRef<HTMLDivElement|null>(null),mapCleanup=useRef<(()=>void)|null>(null);

 useEffect(()=>{const controller=new AbortController();setLoading(true);fetch("/api/stay-map?limit=240",{signal:controller.signal,headers:{accept:"application/json"}}).then(async response=>{if(!response.ok)throw new Error(`map ${response.status}`);return await response.json() as StayProductMapPayloadV32}).then(payload=>{setProducts(payload.products);setSelectedId(payload.products[0]?.productId??null)}).catch(err=>{if(err?.name!=="AbortError")setError(say(lang,"Δεν φορτώθηκαν τα live προϊόντα διαμονής.","Live stay products could not be loaded."))}).finally(()=>setLoading(false));return()=>controller.abort()},[lang]);

 const locations=useMemo(()=>Array.from(new Set(products.map(item=>item.location).filter(Boolean))).sort((a,b)=>a.localeCompare(b,lang==="el"?"el":"en")).slice(0,80),[products,lang]);
 const visible=useMemo(()=>{
  const needle=query.trim().toLocaleLowerCase(lang==="el"?"el":"en"),cap=maxPrice==="all"?null:Number(maxPrice);
  return products.filter(item=>(!needle||`${item.name} ${item.location} ${item.address} ${item.category}`.toLocaleLowerCase().includes(needle))&&(location==="all"||item.location===location)&&(cap==null||item.price==null||item.price<=cap)&&(!saleOnly||item.onSale)).slice(0,180);
 },[products,query,location,maxPrice,saleOnly,lang]);
 const selected=useMemo(()=>visible.find(item=>item.productId===selectedId)??visible[0]??null,[visible,selectedId]);

 useEffect(()=>{
  if(!mapHost.current||!visible.length)return;let cancelled=false;mapCleanup.current?.();mapCleanup.current=null;
  async function mount(){
   const host=mapHost.current;if(!host)return;
   if(engine==="google"&&process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY){
    try{
     const g=await loadGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);if(cancelled||!host)return;
     const map=new g.maps.Map(host,{center:{lat:38.4,lng:23.7},zoom:6,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,gestureHandling:"greedy",styles:[{featureType:"poi",stylers:[{visibility:"off"}]}]}),bounds=new g.maps.LatLngBounds(),markers:any[]=[];
     for(const item of visible){const position={lat:item.latitude,lng:item.longitude},marker=new g.maps.Marker({position,map,title:item.name,label:item.price!=null?{text:money(item.price,item.currency,lang).replace(/\s/g,""),color:"#ffffff",fontWeight:"800",fontSize:"10px"}:undefined,icon:{path:g.maps.SymbolPath.CIRCLE,scale:item.productId===selected?.productId?22:18,fillColor:item.productId===selected?.productId?"#e87358":"#123d3a",fillOpacity:1,strokeColor:"#ffffff",strokeWeight:3}});marker.addListener("click",()=>setSelectedId(item.productId));markers.push(marker);bounds.extend(position)}
     if(visible.length===1)map.setCenter({lat:visible[0].latitude,lng:visible[0].longitude}),map.setZoom(11);else map.fitBounds(bounds,40);
     if(selected)map.panTo({lat:selected.latitude,lng:selected.longitude});mapCleanup.current=()=>{markers.forEach(marker=>marker.setMap(null));host.replaceChildren()};return;
    }catch{if(!cancelled)setEngine("osm");return}
   }
   const L=await import("leaflet");if(cancelled||!host)return;const map=L.map(host,{zoomControl:true,scrollWheelZoom:true,minZoom:5}).setView([38.4,23.7],6),markers:import("leaflet").Marker[]=[];L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL||"https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,minZoom:5,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);const bounds:L.LatLngExpression[]=[];
   visible.forEach(item=>{const active=item.productId===selected?.productId,label=item.price!=null?money(item.price,item.currency,lang):"•",icon=L.divIcon({className:"stay-marker-shell",html:`<span class="stay-price-marker${active?" active":""}">${label}</span>`,iconSize:[74,36],iconAnchor:[37,18]}),marker=L.marker([item.latitude,item.longitude],{icon,title:item.name,keyboard:true}).addTo(map).bindTooltip(item.name,{direction:"top",offset:[0,-18]});marker.on("click",()=>setSelectedId(item.productId));markers.push(marker);bounds.push([item.latitude,item.longitude])});if(bounds.length>1)map.fitBounds(L.latLngBounds(bounds),{padding:[38,38],maxZoom:9});else if(bounds.length===1)map.setView(bounds[0],11);if(selected)map.panTo([selected.latitude,selected.longitude]);window.setTimeout(()=>map.invalidateSize(),80);mapCleanup.current=()=>{markers.forEach(marker=>marker.remove());map.remove()};
  }
  void mount();return()=>{cancelled=true;mapCleanup.current?.();mapCleanup.current=null};
 },[visible,engine,lang,selected?.productId,selected?.latitude,selected?.longitude]);

 const googleConfigured=Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
 return <section className="stay-map-app">
  <div className="stay-map-toolbar">
   <div><span className="wf-kicker">LIVE PRODUCT MAP · V32</span><h1>{say(lang,"Βρες διαμονή πάνω στον χάρτη.","Find stays directly on the map.")}</h1><p>{say(lang,"Κάθε marker είναι πραγματικό προϊόν/offer από το inventory — όχι demo pin.","Every marker is a real inventory product/offer — not a demo pin.")}</p></div>
   <div className="stay-map-engine"><span className={engine==="google"?"active":""}>Google Maps</span><span className={engine==="osm"?"active":""}>OpenStreetMap</span>{googleConfigured&&<button type="button" onClick={()=>setEngine(current=>current==="google"?"osm":"google")}>{say(lang,"Αλλαγή χάρτη","Switch map")}</button>}</div>
  </div>
  <div className="stay-map-filters">
   <label><span>{say(lang,"Αναζήτηση","Search")}</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={say(lang,"Ξενοδοχείο, πόλη, περιοχή…","Hotel, city, area…")}/></label>
   <label><span>{say(lang,"Περιοχή","Location")}</span><select value={location} onChange={event=>setLocation(event.target.value)}><option value="all">{say(lang,"Όλη η Ελλάδα","All Greece")}</option>{locations.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
   <label><span>{say(lang,"Μέγιστη τιμή","Max price")}</span><select value={maxPrice} onChange={event=>setMaxPrice(event.target.value)}><option value="all">{say(lang,"Χωρίς όριο","Any")}</option><option value="100">€100</option><option value="150">€150</option><option value="250">€250</option><option value="400">€400</option></select></label>
   <label className="stay-map-check"><input type="checkbox" checked={saleOnly} onChange={event=>setSaleOnly(event.target.checked)}/><span>{say(lang,"Μόνο προσφορές","Deals only")}</span></label>
  </div>
  {error&&<div className="stay-map-error">{error}</div>}
  <div className="stay-map-workspace">
   <aside className="stay-map-list">
    <header><strong>{loading?say(lang,"Φόρτωση προϊόντων…","Loading products…"):say(lang,`${visible.length} προϊόντα στον χάρτη`,`${visible.length} products on map`)}</strong><small>{say(lang,"Επίλεξε κάρτα ή marker","Select a card or marker")}</small></header>
    <div className="stay-map-list-scroll">{visible.slice(0,80).map(item=><button type="button" key={item.productId} className={item.productId===selected?.productId?"active":""} onClick={()=>setSelectedId(item.productId)}>{item.imageUrl?<img src={item.imageUrl} alt="" loading="lazy"/>:<span className="stay-map-placeholder">A</span>}<span className="stay-map-list-copy"><strong>{item.name}</strong><small>{item.location||item.address}</small><b>{money(item.price,item.currency,lang)}{item.onSale?` · ${say(lang,"Προσφορά","Deal")}`:""}</b></span></button>)}</div>
   </aside>
   <div className="stay-map-stage">
    <div ref={mapHost} className="stay-map-canvas" aria-label={say(lang,"Χάρτης πραγματικών προϊόντων διαμονής","Map of real stay products")}/>
    <div className="stay-map-map-status">{engine==="google"?"Google Maps":say(lang,"OpenStreetMap fallback","OpenStreetMap fallback")}</div>
    {selected&&<article className="stay-map-product-card">{selected.imageUrl&&<img src={selected.imageUrl} alt=""/>}<div><span className="wf-kicker">{selected.category||say(lang,"Διαμονή","Stay")}</span><h2>{selected.name}</h2><p>{selected.location}{selected.address&&selected.address!==selected.location?` · ${selected.address}`:""}</p><div className="stay-map-price"><strong>{money(selected.price,selected.currency,lang)}</strong>{selected.fullPrice!=null&&selected.price!=null&&selected.fullPrice>selected.price&&<del>{money(selected.fullPrice,selected.currency,lang)}</del>}{selected.onSale&&<span>{say(lang,"Προσφορά","Deal")}</span>}</div><a href={selected.trackingUrl} target="_blank" rel="nofollow sponsored noreferrer" className="wf-btn wf-btn--primary">{say(lang,"Δες το κατάλυμα →","View stay →")}</a><small>{say(lang,"Η τιμή και η διαθεσιμότητα επιβεβαιώνονται στον συνεργάτη πριν την κράτηση.","Price and availability are confirmed with the partner before booking.")}</small></div></article>}
   </div>
  </div>
 </section>
}
