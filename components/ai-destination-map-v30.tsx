"use client";

import "leaflet/dist/leaflet.css";
import { useEffect,useMemo,useRef,useState } from "react";
import { ArrowSquareOut,Buildings,Compass,MapPin,ShieldCheck,Sparkle,Star,TrendUp } from "@phosphor-icons/react";
import type { CityMapRankV30 } from "@/lib/ai/city-map-ranking-v30";

type Lang="el"|"en";
type MapPayload={version:number;generatedAt:string;month:number;cities:CityMapRankV30[];sources:Record<string,string>;rankingModel:Record<string,string>};
type TripadvisorPlace={locationId:string;name:string;rating:number|null;reviewCount:number|null;ranking:number|null;rankingLabel:string|null;webUrl:string|null};
type DetailPayload={
 destination:{slug:string;nameEl:string;nameEn:string;tags:string[]};
 tripadvisorSignal:{status:string;rating5:number|null;reviewCount:number;bestRanking:number|null;sampleSize:number;sourceMonth:string};
 tripadvisor:{status:string;places:TripadvisorPlace[];restaurants:TripadvisorPlace[];beaches:TripadvisorPlace[];museums:TripadvisorPlace[];nightlife:TripadvisorPlace[];note:string};
 booking:{status:string;reviewScore10:number|null;reviewCount:number;accommodationCount:number;sourceDate:string};
 stayWindow:{startDate:string;endDate:string;offers:Array<{propertyName:string;price:number|null;currency:string|null;trackingUrl:string;validTo:string|null}>};
 trustPolicy:string;
};

const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;
const months=["Ιαν","Φεβ","Μαρ","Απρ","Μάι","Ιούν","Ιούλ","Αύγ","Σεπ","Οκτ","Νοέ","Δεκ"];
const monthsEn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const stars=(score100:number)=>Math.max(0,Math.min(5,score100/20));
const escapeHtml=(value:string)=>value.replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]??char));

export function AiDestinationMapV30({lang="el"}:{lang?:Lang}){
 const nowMonth=Number(new Intl.DateTimeFormat("en",{month:"numeric",timeZone:"Europe/Athens"}).format(new Date()));
 const[month,setMonth]=useState(nowMonth),[payload,setPayload]=useState<MapPayload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[selectedSlug,setSelectedSlug]=useState<string|null>(null),[detail,setDetail]=useState<DetailPayload|null>(null),[detailLoading,setDetailLoading]=useState(false);
 const hostRef=useRef<HTMLDivElement|null>(null),mapRef=useRef<import("leaflet").Map|null>(null),markerRef=useRef(new Map<string,import("leaflet").Marker>()),selectedRef=useRef<string|null>(null);
 selectedRef.current=selectedSlug;

 useEffect(()=>{const controller=new AbortController();setLoading(true);setError(null);fetch(`/api/ai-map?lang=${lang}&month=${month}`,{signal:controller.signal,headers:{accept:"application/json"}}).then(async response=>{if(!response.ok)throw new Error(`map ${response.status}`);return await response.json() as MapPayload}).then(data=>{setPayload(data);setSelectedSlug(current=>current&&data.cities.some(city=>city.slug===current)?current:data.cities[0]?.slug??null)}).catch(err=>{if(err?.name!=="AbortError")setError(say(lang,"Ο ημερήσιος AI χάρτης δεν είναι διαθέσιμος αυτή τη στιγμή.","The daily AI map is temporarily unavailable."))}).finally(()=>setLoading(false));return()=>controller.abort()},[lang,month]);

 useEffect(()=>{if(!selectedSlug){setDetail(null);return}const controller=new AbortController();setDetailLoading(true);setDetail(null);fetch(`/api/ai-map/${encodeURIComponent(selectedSlug)}?lang=${lang}`,{signal:controller.signal,headers:{accept:"application/json"}}).then(async response=>{if(!response.ok)throw new Error(`detail ${response.status}`);return await response.json() as DetailPayload}).then(setDetail).catch(()=>setDetail(null)).finally(()=>setDetailLoading(false));return()=>controller.abort()},[selectedSlug,lang]);

 const cities=payload?.cities??[],selected=useMemo(()=>cities.find(city=>city.slug===selectedSlug)??null,[cities,selectedSlug]);

 useEffect(()=>{let cancelled=false;async function mount(){if(!hostRef.current||mapRef.current||!cities.length)return;const L=await import("leaflet");if(cancelled||!hostRef.current)return;const map=L.map(hostRef.current,{zoomControl:true,scrollWheelZoom:true,attributionControl:false,minZoom:5}).setView([38.45,23.4],6);mapRef.current=map;L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL||"https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,minZoom:5}).addTo(map);const bounds:Array<[number,number]>=[];for(const city of cities){const active=city.slug===selectedRef.current,icon=L.divIcon({className:"ai-map-marker-shell",html:`<span class="ai-map-marker${active?" active":""}"><b>${city.rank}</b><small>${city.aiScore}</small></span>`,iconSize:[48,56],iconAnchor:[24,52],tooltipAnchor:[0,-46]});const marker=L.marker([city.latitude,city.longitude],{icon,keyboard:true,title:lang==="el"?city.nameEl:city.nameEn}).addTo(map).bindTooltip(`<strong>${escapeHtml(lang==="el"?city.nameEl:city.nameEn)}</strong><br/>AI ${city.aiScore}/100`,{direction:"top",offset:[0,-42]});marker.on("click",()=>setSelectedSlug(city.slug));markerRef.current.set(city.slug,marker);bounds.push([city.latitude,city.longitude])}if(bounds.length)map.fitBounds(bounds,{padding:[42,42],maxZoom:7});window.setTimeout(()=>map.invalidateSize(),100)}void mount();return()=>{cancelled=true;markerRef.current.clear();mapRef.current?.remove();mapRef.current=null}},[cities,lang]);

 useEffect(()=>{markerRef.current.forEach((marker,slug)=>{const el=marker.getElement()?.querySelector(".ai-map-marker");el?.classList.toggle("active",slug===selectedSlug);if(slug===selectedSlug){marker.openTooltip();const point=marker.getLatLng();mapRef.current?.panTo(point,{animate:true,duration:.35})}})},[selectedSlug]);

 function pick(slug:string){setSelectedSlug(slug)}
 const taPlaces=detail?[...(detail.tripadvisor.places??[]),...(detail.tripadvisor.restaurants??[]),...(detail.tripadvisor.beaches??[])].filter((item,index,array)=>array.findIndex(other=>other.locationId===item.locationId)===index).sort((a,b)=>(b.rating??0)-(a.rating??0)||(b.reviewCount??0)-(a.reviewCount??0)).slice(0,4):[];

 return <main className="ai-map-v30">
  <section className="ai-map-hero">
   <div><span><Sparkle size={16} weight="fill"/> AI DESTINATION RADAR · V30</span><h1>{say(lang,"Ο χάρτης που κατατάσσει την Ελλάδα κάθε μέρα.","The map that ranks Greece every day.")}</h1><p>{say(lang,"Εποχικότητα, πραγματικό inventory, πρόσβαση και — όταν είναι διαθέσιμα — Tripadvisor και Booking.com evidence. Κανένα rating δεν επινοείται.","Seasonality, real inventory, access and — when available — Tripadvisor and Booking.com evidence. No rating is invented.")}</p></div>
   <a href={lang==="el"?"/":"/en"}><Compass size={18}/>{say(lang,"Πίσω στο AI planner","Back to AI planner")}</a>
  </section>
  <section className="ai-map-months" aria-label={say(lang,"Μήνας ταξιδιού","Travel month")}>{Array.from({length:12},(_,index)=>index+1).map(value=><button key={value} className={month===value?"active":""} onClick={()=>setMonth(value)}>{lang==="el"?months[value-1]:monthsEn[value-1]}</button>)}</section>
  {error&&<div className="ai-map-error">{error}</div>}
  <section className="ai-map-workspace">
   <aside className="ai-map-ranking">
    <div className="ai-map-ranking-head"><span>{say(lang,"ΗΜΕΡΗΣΙΑ ΚΑΤΑΤΑΞΗ","DAILY RANKING")}</span><strong>{loading?say(lang,"Ανανεώνεται…","Refreshing…"):say(lang,`${cities.length} κορυφαίοι προορισμοί`,`${cities.length} top destinations`)}</strong></div>
    <div className="ai-map-list">{cities.map(city=><button key={city.slug} className={city.slug===selectedSlug?"active":""} onClick={()=>pick(city.slug)}><span className="rank">#{city.rank}</span><span className="city"><strong>{lang==="el"?city.nameEl:city.nameEn}</strong><small>{city.regionGroup} · {city.propertyCount} {say(lang,"stays","stays")}</small></span><span className="score"><strong>{city.aiScore}</strong><small>AI /100</small></span></button>)}</div>
   </aside>
   <div className="ai-map-stage">
    <div ref={hostRef} className="ai-map-canvas" aria-label={say(lang,"Διαδραστικός χάρτης κορυφαίων προορισμών","Interactive map of top destinations")}/><small className="ai-map-attribution">© OpenStreetMap contributors · ODbL</small>
    {selected&&<article className="ai-map-summary">
      <div className="ai-map-summary-top"><span>#{selected.rank}</span><div><small>{selected.regionGroup}</small><h2>{lang==="el"?selected.nameEl:selected.nameEn}</h2></div><div className="ai-overall"><strong>{selected.aiScore}</strong><small>AI / 100</small></div></div>
      <div className="ai-starline"><Star size={18} weight="fill"/><strong>{stars(selected.aiScore).toFixed(1)}/5</strong><span>{say(lang,"AI composite — όχι review stars","AI composite — not review stars")}</span></div>
      <div className="ai-map-metrics"><span><TrendUp size={17}/><b>{selected.seasonScore}</b>{say(lang,"Εποχή","Season")}</span><span><Buildings size={17}/><b>{selected.supplyScore}</b>{say(lang,"Inventory","Inventory")}</span><span><MapPin size={17}/><b>{selected.routeScore}</b>{say(lang,"Πρόσβαση","Access")}</span></div>
      <div className="ai-map-evidence">
       <section><header><strong>Tripadvisor</strong>{selected.tripadvisor?.status==="live"&&selected.tripadvisor.rating5!=null?<span><Star size={15} weight="fill"/>{selected.tripadvisor.rating5.toFixed(1)}/5</span>:<span>{say(lang,"χωρίς live data","no live data")}</span>}</header>{selected.tripadvisor?.status==="live"?<p>{selected.tripadvisor.reviewCount.toLocaleString(lang==="el"?"el-GR":"en-GB")} reviews · {selected.tripadvisor.sampleSize} verified POIs</p>:<p>{say(lang,"Εμφανίζεται μόνο όταν απαντά το επίσημο API.","Shown only when the official API returns evidence.")}</p>}</section>
       <section><header><strong>Booking.com</strong>{selected.booking?.status==="live"&&selected.booking.reviewScore10!=null?<span>{selected.booking.reviewScore10.toFixed(1)}/10</span>:<span>{selected.booking?.status==="not-configured"?say(lang,"API αναμένεται","API pending"):say(lang,"χωρίς score","no score")}</span>}</header><p>{selected.booking?.status==="live"?`${selected.booking.accommodationCount} ${say(lang,"διαθέσιμα accommodations στο daily check","accommodations in the daily check")}`:say(lang,"Δεν χρησιμοποιείται εκτιμώμενο Booking score.","No estimated Booking score is used.")}</p></section>
      </div>
      <div className="ai-map-detail"><h3>{say(lang,"Trusted evidence για την πόλη","Trusted evidence for this destination")}</h3>{detailLoading?<p>{say(lang,"Φορτώνω reviews και πηγές…","Loading reviews and sources…")}</p>:detail?<><div className="ai-map-pois">{taPlaces.map(place=><a key={place.locationId} href={place.webUrl??"#"} target={place.webUrl?"_blank":undefined} rel="noreferrer"><span><strong>{place.name}</strong><small>{place.rankingLabel??say(lang,"Tripadvisor place","Tripadvisor place")}</small></span><span>{place.rating!=null?`${place.rating.toFixed(1)} ★`:"—"}<small>{place.reviewCount!=null?`${place.reviewCount.toLocaleString()} reviews`:""}</small></span>{place.webUrl&&<ArrowSquareOut size={15}/>}</a>)}</div><div className="ai-map-offers">{detail.stayWindow.offers.slice(0,3).map(offer=><a key={`${offer.propertyName}-${offer.trackingUrl}`} href={offer.trackingUrl} target="_blank" rel="nofollow sponsored noreferrer"><Buildings size={16}/><span><strong>{offer.propertyName}</strong><small>{offer.price!=null?`${offer.price.toFixed(0)} ${offer.currency??"EUR"}`:say(lang,"Δες τιμή","See price")}</small></span><ArrowSquareOut size={15}/></a>)}</div><p className="trust"><ShieldCheck size={16}/>{detail.trustPolicy}</p></>:<p>{say(lang,"Δεν υπάρχουν πρόσθετα verified details αυτή τη στιγμή.","No additional verified details are available right now.")}</p>}</div>
    </article>}
   </div>
  </section>
 </main>
}
