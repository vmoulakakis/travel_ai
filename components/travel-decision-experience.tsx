"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { GuruRecommendation, GuruRecommendationResponse, AffiliateOffer } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

type View = "ready" | "processing" | "results";
type Editor = "origin" | "month" | "nights" | "budget" | "moods" | "traveler" | null;
type Featured = { destinationId: string; locationLabel: string; imageUrl: string };

const defaultRequest: TripRequest = { origin: "Athens", month: "october", nights: 3, budget: 500, moods: ["romantic", "food"], travelerType: "couple" };
const months = ["september", "october", "november", "flexible"] as const;
const travelers = ["solo", "couple", "family", "friends"] as const;
const moodOptions: Array<{ value: TripRequest["moods"][number]; label: string; note: string }> = [
  { value: "relax", label: "Slow", note: "quiet & easy" }, { value: "romantic", label: "Romantic", note: "time for two" },
  { value: "food", label: "Food", note: "eat well" }, { value: "warmth", label: "Warm", note: "sea & sun vibe" },
  { value: "city", label: "City", note: "urban energy" }, { value: "culture", label: "Culture", note: "history & character" },
  { value: "nature", label: "Nature", note: "outside more" }, { value: "adventure", label: "Adventure", note: "less predictable" }
];

const titleCase=(value:string)=>value ? value[0].toUpperCase()+value.slice(1) : value;
const monthLabel=(m:TripRequest["month"])=>m==="flexible"?"Sep–Nov, flexible":`${titleCase(m)} 2026`;
const moodsLabel=(m:TripRequest["moods"])=>m.map(x=>moodOptions.find(o=>o.value===x)?.label??x).join(" + ");
const formatValidity=(value?:string|null)=>{ if(!value)return"current feed"; const d=new Date(value); return Number.isNaN(d.getTime())?"current feed":`valid to ${new Intl.DateTimeFormat("en",{day:"numeric",month:"short"}).format(d)}`; };
const offerPrice=(o:AffiliateOffer)=>o.price==null?"Price not supplied":o.currency?`${o.currency} ${Math.round(o.price)}`:`feed price ${Math.round(o.price)}`;

function PreferenceDial({value,label,note}:{value:number;label:string;note:string}){
  return <div className="pref-dial" style={{"--dial":`${Math.max(8,Math.min(100,value))}%`} as CSSProperties}><div><strong>{label}</strong><small>{note}</small></div></div>;
}
function Metric({label,value}:{label:string;value:number}){return <div className="guru-metric"><span>{label}</span><i><b style={{width:`${value}%`}}/></i><strong>{value}</strong></div>}

function OfferCard({offer}:{offer:AffiliateOffer}){
  const image=offer.imageUrl||offer.thumbUrl;
  return <article className="affiliate-offer">
    <div className="offer-image" style={image?{backgroundImage:`linear-gradient(180deg,transparent,rgba(13,24,18,.42)),url(${image})`}:undefined}><span>{offer.discount&&offer.discount>0?`-${Math.round(offer.discount)}% feed discount`:"tracked offer"}</span></div>
    <div className="offer-copy"><div><small>{offer.category??"stay"}</small><h4>{offer.propertyName}</h4></div><div className="offer-facts"><b>{offerPrice(offer)}</b><span>{offer.demandSignal!=null?`demand ${Math.round(offer.demandSignal)}`:"feed active"}</span><span>{formatValidity(offer.validTo)}</span></div>
    <a className="offer-cta" href={offer.trackingUrl} target="_blank" rel="sponsored nofollow">See affiliate offer <span>↗</span></a></div>
  </article>
}

function GuruPick({trip,index}:{trip:GuruRecommendation;index:number}){
  return <article className={`guru-pick ${index===0?"guru-pick-featured":""}`}>
    <div className="pick-photo" style={trip.imageUrl?{backgroundImage:`linear-gradient(180deg,rgba(10,20,15,.02),rgba(10,20,15,.72)),url(${trip.imageUrl})`}:undefined}>
      <div className="pick-top"><span>{trip.role}</span><span>#{index+1}</span></div>
      <div className="pick-title"><small>{trip.country}</small><h3>{trip.destination}</h3><div><b>{trip.score}</b> guru score · {trip.confidence.toLowerCase()} confidence</div></div>
    </div>
    <div className="pick-story">
      <div className="pick-verdict"><span>Guru verdict</span><p>{trip.whyThisPlace}</p></div>
      <div className="why-now"><span>Why now</span><p>{trip.whyNow}</p></div>
      <div className="feed-strip"><div><small>active offers</small><b>{trip.activeOfferCount}</b></div><div><small>properties</small><b>{trip.propertyCount}</b></div><div><small>price signal</small><b>{trip.feedPriceLabel}</b></div><div><small>discount</small><b>{trip.maxDiscount&&trip.maxDiscount>0?`up to ${Math.round(trip.maxDiscount)}%`:"—"}</b></div></div>
      <div className="guru-tags">{trip.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
      <div className="metric-grid"><Metric label="supply" value={trip.breakdown.supply}/><Metric label="value" value={trip.breakdown.value}/><Metric label="intent" value={trip.breakdown.intent}/><Metric label="effort" value={trip.breakdown.effort}/><Metric label="demand" value={trip.breakdown.demand}/><Metric label="deal" value={trip.breakdown.deal}/></div>
      <div className="offers-heading"><div><span>Best tracked stays</span><small>Only links from your Linkwise JSON feed</small></div><b>{trip.distanceKm!=null?`≈ ${trip.distanceKm} km proxy`:"distance not scored"}</b></div>
      <div className="offer-grid">{trip.offers.slice(0,3).map(offer=><OfferCard key={offer.sourceProductId} offer={offer}/>)}</div>
    </div>
  </article>
}

export function TravelDecisionExperience(){
  const [view,setView]=useState<View>("ready"); const [editor,setEditor]=useState<Editor>(null); const [draft,setDraft]=useState<TripRequest>(defaultRequest);
  const [result,setResult]=useState<GuruRecommendationResponse|null>(null); const [featured,setFeatured]=useState<Featured[]>([]); const [error,setError]=useState<string|null>(null);

  useEffect(()=>{fetch("/api/featured").then(r=>r.ok?r.json():{destinations:[]}).then((d:{destinations?:Featured[]})=>setFeatured(d.destinations??[])).catch(()=>setFeatured([]));},[]);
  const dna=useMemo(()=>({pace:draft.nights<=3?92:76,value:draft.budget<=400?94:draft.budget<=700?82:70,feel:Math.min(96,65+draft.moods.length*10),range:draft.month==="flexible"?96:76}),[draft]);
  const heroStyle=(i:number)=>featured[i]?.imageUrl?{backgroundImage:`linear-gradient(180deg,rgba(10,20,15,.02),rgba(10,20,15,.55)),url(${featured[i].imageUrl})`}:undefined;

  function toggleMood(mood:TripRequest["moods"][number]){const active=draft.moods.includes(mood);const next=active?draft.moods.filter(x=>x!==mood):[...draft.moods,mood].slice(-3);if(next.length)setDraft({...draft,moods:next});}
  async function askGuru(request:TripRequest){setError(null);setEditor(null);setView("processing");try{const response=await fetch("/api/recommend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});const data=await response.json();if(!response.ok)throw new Error(data?.error||"Travel Guru failed");setResult(data as GuruRecommendationResponse);setDraft((data as GuruRecommendationResponse).request);setView("results");}catch(e){setError(e instanceof Error?e.message:"Could not read the affiliate universe.");setView("ready");}}
  function refine(refinement:TripRequest["refinement"]){const next={...draft,refinement};setDraft(next);void askGuru(next);}

  const editorPanel=<div className={`micro-editor ${editor?"micro-editor-open":""}`}>
    {editor==="origin"&&<div className="origin-editor"><input autoFocus value={draft.origin} onChange={e=>setDraft({...draft,origin:e.target.value})}/><div>{["Athens","Thessaloniki","Patra","Heraklion"].map(x=><button type="button" key={x} onClick={()=>{setDraft({...draft,origin:x});setEditor(null)}}>{x}</button>)}</div></div>}
    {editor==="month"&&<div className="editor-pills">{months.map(x=><button type="button" className={draft.month===x?"active":""} key={x} onClick={()=>{setDraft({...draft,month:x});setEditor(null)}}>{monthLabel(x)}</button>)}</div>}
    {editor==="nights"&&<div className="editor-pills">{[2,3,4,5,7].map(x=><button type="button" className={draft.nights===x?"active":""} key={x} onClick={()=>{setDraft({...draft,nights:x});setEditor(null)}}>{x} nights</button>)}</div>}
    {editor==="budget"&&<div className="editor-pills">{[250,350,500,700,1000].map(x=><button type="button" className={draft.budget===x?"active":""} key={x} onClick={()=>{setDraft({...draft,budget:x});setEditor(null)}}>budget {x}</button>)}</div>}
    {editor==="traveler"&&<div className="editor-pills">{travelers.map(x=><button type="button" className={draft.travelerType===x?"active":""} key={x} onClick={()=>{setDraft({...draft,travelerType:x});setEditor(null)}}>{x}</button>)}</div>}
    {editor==="moods"&&<div className="mood-editor">{moodOptions.map(x=><button type="button" className={draft.moods.includes(x.value)?"active":""} key={x.value} onClick={()=>toggleMood(x.value)}><strong>{x.label}</strong><small>{x.note}</small></button>)}</div>}
  </div>;

  return <div className="guru-site">
    <header className="guru-nav"><a className="guru-brand" href="#top">TRAVEL <em>GURU</em><span>by Travel AI</span></a><div className="nav-proof">Feed-only recommendations · affiliate universe live</div><a href="/admin" className="nav-system">system</a></header>
    <main id="top">
      <section className="guru-hero"><div className="hero-copy"><div className="eyebrow">Affiliate travel decision agent</div><h1>Tell me the escape.<br/><em>I’ll find the three.</em></h1><p>No endless hotel grid. No invented destinations. The Guru reads your live Linkwise inventory and narrows it to three places that fit you now.</p><div className="hero-facts"><span>JSON destinations only</span><span>exact tracking URLs</span><span>AI + deterministic guardrails</span></div></div><div className="feed-mosaic"><div className="mosaic-main" style={heroStyle(0)}><span>{featured[0]?.locationLabel??"live feed"}</span></div><div className="mosaic-small" style={heroStyle(1)}><span>{featured[1]?.locationLabel??"tracked"}</span></div><div className="mosaic-small" style={heroStyle(2)}><span>{featured[2]?.locationLabel??"current"}</span></div><div className="mosaic-stamp"><b>AI</b><span>reads the feed</span></div></div></section>

      <section className="guru-canvas"><div className="canvas-head"><div><span>Your travel fingerprint</span><small>One surface. Change only what matters.</small></div><b>LIVE JSON → GURU → 3</b></div>
        <div className="travel-sentence"><span>Take me from</span><button type="button" onClick={()=>setEditor(editor==="origin"?null:"origin")}>{draft.origin}</button><span>in</span><button type="button" onClick={()=>setEditor(editor==="month"?null:"month")}>{monthLabel(draft.month)}</button><span>for</span><button type="button" onClick={()=>setEditor(editor==="nights"?null:"nights")}>{draft.nights} nights</button><span>with a</span><button type="button" onClick={()=>setEditor(editor==="budget"?null:"budget")}>{draft.budget} budget signal</button><span>. I want</span><button type="button" onClick={()=>setEditor(editor==="moods"?null:"moods")}>{moodsLabel(draft.moods)}</button><span>as a</span><button type="button" onClick={()=>setEditor(editor==="traveler"?null:"traveler")}>{draft.travelerType}</button><span>.</span></div>
        {editorPanel}
        <div className="canvas-foot"><div className="preference-dials"><PreferenceDial value={dna.pace} label="Pace" note={draft.nights<=3?"short escape":"more time"}/><PreferenceDial value={dna.value} label="Value" note={draft.budget<=400?"price-led":"balanced"}/><PreferenceDial value={dna.feel} label="Vibe" note={moodsLabel(draft.moods)}/><PreferenceDial value={dna.range} label="Range" note={draft.month==="flexible"?"open dates":"fixed month"}/></div><button className="ask-guru" type="button" onClick={()=>void askGuru(draft)}><span>Ask the Guru</span><b>→</b></button></div>
        {error&&<p className="guru-error">{error}</p>}
      </section>

      {view==="processing"&&<section className="guru-processing"><div className="processing-map"><i/><i/><i/><i/><b>3</b></div><div><div className="eyebrow">Reading your affiliate universe</div><h2>Filtering tracked inventory before the AI decides.</h2><p>Validity → supply → price signal → demand → deal → intent → effort → three distinct picks.</p></div></section>}

      {view==="results"&&result&&<section className="guru-results"><div className="results-intro"><div><div className="eyebrow">The Guru shortlist</div><h2>Three places. Every one exists in your JSON.</h2></div><div className="result-meta"><span>{result.candidateCount} eligible candidates checked</span><span>{result.mode==="travel-guru-deepseek"?"AI Guru active":"deterministic fallback"}</span></div></div>
        <div className="guru-picks">{result.recommendations.map((trip,index)=><GuruPick key={trip.destinationId} trip={trip} index={index}/>)}</div>
        <div className="refine-bar"><span>Tell the Guru what to optimize:</span>{(["cheaper","closer","shorter","warmer","romantic","adventurous"] as const).map(x=><button type="button" key={x} onClick={()=>refine(x)}>{x}</button>)}</div>
        <div className="affiliate-disclosure"><b>Affiliate disclosure</b><p>All outbound buttons use the exact Linkwise <code>tracking_url</code> supplied by your current JSON feed. Feed prices are shown without a currency symbol when the feed does not provide currency. Destination vibe is AI judgement; inventory, validity, price, discount and demand signals come from the feed.</p></div>
      </section>}
    </main>
    <footer className="guru-footer"><span>Travel Guru · affiliate-first, feed-bound</span><span>JSON facts → deterministic shortlist → AI judgement → exact tracked links</span></footer>
  </div>;
}
