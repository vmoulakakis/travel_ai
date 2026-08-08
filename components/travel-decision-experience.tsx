"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { AffiliateDestinationDetailResponse, AffiliateOffer, DestinationInsightsResponse, GuruRecommendation, GuruRecommendationResponse } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

type Lang = "el" | "en";
type View = "home" | "thinking" | "choices" | "destination";
type GuideSection = "origin" | "distance" | "mood" | "stay" | "people" | "style" | null;
type Featured = { destinationId: string; locationLabel: string; imageUrl: string };
type StreamEvent = { type: string; candidateCount?: number; fiveStarRich?: number; shortlistCount?: number; mode?: string; preview?: Array<{ destination: string; score: number; fiveStar: number }>; result?: GuruRecommendationResponse; message?: string };

const defaultRequest: TripRequest = {
  origin: "Athens", month: "october", nights: 3, budget: 500, moods: ["romantic", "food"], travelerType: "couple",
  language: "el", distancePreference: "easy-hop", pace: "balanced", hotelStyle: "luxury", avoid: "long-travel"
};
const months = ["september", "october", "november", "flexible"] as const;
const moodOptions = [
  { value: "relax", el: "Να αδειάσει το μυαλό", en: "Switch off", icon: "◌" },
  { value: "romantic", el: "Να ξανασυνδεθούμε", en: "Reconnect", icon: "♡" },
  { value: "food", el: "Να φάω πραγματικά καλά", en: "Eat really well", icon: "✦" },
  { value: "culture", el: "Να νιώσω τον τόπο", en: "Feel the place", icon: "◇" },
  { value: "nature", el: "Να βγω έξω", en: "Get outside", icon: "⌁" },
  { value: "adventure", el: "Να ξεφύγω από τα συνηθισμένα", en: "Break routine", icon: "↗" },
  { value: "warmth", el: "Ήλιο & θάλασσα", en: "Sun & sea", icon: "☀" },
  { value: "city", el: "Πόλη & ενέργεια", en: "City energy", icon: "▦" }
] as const;
const distanceOptions = [
  { value: "nearby", el: "Κοντά μου", en: "Nearby", noteEl: "λίγη μετακίνηση", noteEn: "minimal travel" },
  { value: "easy-hop", el: "Εύκολη απόδραση", en: "Easy hop", noteEl: "να μη με κουράσει", noteEn: "keep it easy" },
  { value: "island", el: "Νησιωτική αίσθηση", en: "Island feel", noteEl: "θάλασσα πρώτα", noteEn: "sea first" },
  { value: "any", el: "Έκπληξέ με", en: "Surprise me", noteEl: "όπου αξίζει", noteEn: "where it fits" }
] as const;
const hotelOptions = [
  { value: "luxury", el: "5★ / luxury", en: "5★ / luxury" }, { value: "boutique", el: "Boutique", en: "Boutique" },
  { value: "resort", el: "Resort", en: "Resort" }, { value: "value", el: "Καλύτερη αξία", en: "Best value" }, { value: "any", el: "Χωρίς προτίμηση", en: "No preference" }
] as const;
const avoidOptions = [
  { value: "long-travel", el: "πολλή ταλαιπωρία", en: "too much travel" }, { value: "high-cost", el: "να ξεφύγει το κόστος", en: "cost getting away" },
  { value: "crowds", el: "πολύ κόσμο", en: "too crowded" }, { value: "none", el: "τίποτα συγκεκριμένο", en: "nothing specific" }
] as const;
const travelerOptions = [
  { value: "solo", el: "μόνος/η", en: "solo" }, { value: "couple", el: "ζευγάρι", en: "couple" },
  { value: "family", el: "οικογένεια", en: "family" }, { value: "friends", el: "παρέα", en: "friends" }
] as const;

const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;
const title=(s:string)=>s?s[0].toUpperCase()+s.slice(1):s;
const monthLabel=(m:TripRequest["month"],lang:Lang)=>m==="flexible"?say(lang,"Σεπ–Νοέ, ευέλικτα","Sep–Nov, flexible"):lang==="el"?({september:"Σεπτέμβριος",october:"Οκτώβριος",november:"Νοέμβριος"} as const)[m]+" 2026":`${title(m)} 2026`;
const moodLabel=(m:TripRequest["moods"],lang:Lang)=>m.map(x=>{const o=moodOptions.find(v=>v.value===x);return o?(lang==="el"?o.el:o.en):x}).join(" + ");
const priceLabel=(o:AffiliateOffer,lang:Lang)=>o.price==null?say(lang,"Δεν δόθηκε τιμή","Price not supplied"):o.currency?`${o.currency} ${Math.round(o.price)}`:`${say(lang,"τιμή feed","feed price")} ${Math.round(o.price)}`;
const dateLabel=(v:string|null|undefined,lang:Lang)=>{if(!v)return say(lang,"τρέχον feed","current feed");const d=new Date(v);if(Number.isNaN(d.getTime()))return say(lang,"τρέχον feed","current feed");return new Intl.DateTimeFormat(lang==="el"?"el-GR":"en-GB",{day:"numeric",month:"short"}).format(d)};
const roleLabel=(role:string,lang:Lang)=>{const map:Record<string,[string,string]>={"GURU PICK":["ΚΟΡΥΦΑΙΑ ΕΠΙΛΟΓΗ","GURU PICK"],"LUXURY DEPTH":["ΒΑΘΟΣ 5★","LUXURY DEPTH"],"BEST VALUE":["ΚΑΛΥΤΕΡΗ ΑΞΙΑ","BEST VALUE"],"EASY ESCAPE":["ΕΥΚΟΛΗ ΑΠΟΔΡΑΣΗ","EASY ESCAPE"],"ROMANTIC FIT":["ΡΟΜΑΝΤΙΚΟ FIT","ROMANTIC FIT"],"STRONG DEAL SIGNAL":["ΔΥΝΑΤΟ DEAL","STRONG DEAL"],"SMART ALTERNATIVE":["ΕΞΥΠΝΗ ΕΝΑΛΛΑΚΤΙΚΗ","SMART ALTERNATIVE"],"WILDCARD":["WILDCARD","WILDCARD"]};return map[role]?.[lang==="el"?0:1]??role};
const confidenceLabel=(v:GuruRecommendation["confidence"],lang:Lang)=>v==="HIGH"?say(lang,"Υψηλή","High"):v==="MEDIUM"?say(lang,"Μεσαία","Medium"):say(lang,"Χαμηλή","Low");
function Metric({label,value}:{label:string;value:number}){return <div className="v5-metric"><span>{label}</span><i><b style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></i><strong>{value}</strong></div>}
function Dial({label,value,note}:{label:string;value:number;note:string}){return <div className="v5-dial" style={{"--value":`${value}%`} as CSSProperties}><div><b>{value}</b><span>{label}</span><small>{note}</small></div></div>}

export function TravelDecisionExperience(){
  const[lang,setLang]=useState<Lang>("el");
  const[draft,setDraft]=useState<TripRequest>(defaultRequest);
  const[view,setView]=useState<View>("home");
  const[open,setOpen]=useState<GuideSection>(null);
  const[featured,setFeatured]=useState<Featured[]>([]);
  const[result,setResult]=useState<GuruRecommendationResponse|null>(null);
  const[selected,setSelected]=useState<GuruRecommendation|null>(null);
  const[detail,setDetail]=useState<AffiliateDestinationDetailResponse|null>(null);
  const[insights,setInsights]=useState<DestinationInsightsResponse|null>(null);
  const[thinking,setThinking]=useState<StreamEvent[]>([]);
  const[thinkingError,setThinkingError]=useState<string|null>(null);
  const[selectedOffer,setSelectedOffer]=useState<AffiliateOffer|null>(null);
  const[offerUnlocked,setOfferUnlocked]=useState(false);
  const[now,setNow]=useState(()=>Date.now());

  useEffect(()=>{fetch("/api/featured").then(r=>r.ok?r.json():{destinations:[]}).then((d:{destinations?:Featured[]})=>setFeatured(d.destinations??[])).catch(()=>setFeatured([]))},[]);
  useEffect(()=>{setDraft(d=>({...d,language:lang}))},[lang]);
  useEffect(()=>{if(view!=="destination")return;const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id)},[view]);

  const profile=useMemo(()=>({
    fit:Math.min(98,72+draft.moods.length*7),
    effort:draft.distancePreference==="nearby"?95:draft.distancePreference==="easy-hop"?88:draft.distancePreference==="island"?76:82,
    luxury:draft.hotelStyle==="luxury"?96:draft.hotelStyle==="boutique"?84:draft.hotelStyle==="value"?62:78,
    value:draft.avoid==="high-cost"?96:draft.budget<=500?88:78
  }),[draft]);
  const premiumDisplay=useMemo(()=>detail?[...detail.premiumOffers,...detail.premiumFill.filter(x=>!detail.premiumOffers.some(p=>p.sourceProductId===x.sourceProductId))].slice(0,5):[],[detail]);
  const premiumIds=useMemo(()=>new Set(premiumDisplay.map(x=>x.sourceProductId)),[premiumDisplay]);
  const alternativeDisplay=useMemo(()=>detail?detail.alternatives.filter(x=>!premiumIds.has(x.sourceProductId)).slice(0,5):[],[detail,premiumIds]);
  const allShownOffers=useMemo(()=>[...premiumDisplay,...alternativeDisplay],[premiumDisplay,alternativeDisplay]);
  const nearestExpiry=useMemo(()=>{const times=allShownOffers.map(x=>x.validTo?new Date(x.validTo).getTime():NaN).filter(x=>Number.isFinite(x)&&x>now);return times.length?Math.min(...times):null},[allShownOffers,now]);
  const countdown=useMemo(()=>{if(!nearestExpiry)return null;let s=Math.max(0,Math.floor((nearestExpiry-now)/1000));const days=Math.floor(s/86400);s%=86400;const hours=Math.floor(s/3600);s%=3600;const minutes=Math.floor(s/60);const seconds=s%60;return{days,hours,minutes,seconds}},[nearestExpiry,now]);

  function changeLanguage(next:Lang){setLang(next);}
  function toggleMood(value:TripRequest["moods"][number]){const active=draft.moods.includes(value);const next=active?draft.moods.filter(x=>x!==value):[...draft.moods,value].slice(-3);if(next.length)setDraft({...draft,moods:next});}
  function update<K extends keyof TripRequest>(key:K,value:TripRequest[K]){setDraft(d=>({...d,[key]:value}));}
  function stageLabel(type:string){const labels:Record<string,[string,string]>={"source:start":["Συνδέομαι με το live affiliate universe","Connecting to live affiliate universe"],"source:ready":["Βρήκα τους πραγματικά διαθέσιμους προορισμούς","Found currently eligible destinations"],"rank:start":["Εφαρμόζω τις προσωπικές σου προτεραιότητες","Applying your personal priorities"],"rank:ready":["Έφτιαξα διαφορετικό shortlist χωρίς διπλές πόλεις","Built a diverse shortlist without duplicate cities"],"guru:start":["Ο Travel Guru συγκρίνει τις καλύτερες λύσεις","Travel Guru is comparing the strongest solutions"],"guru:ready":["Οι 5 επιλογές κλείδωσαν","Five choices locked"]};return labels[type]?.[lang==="el"?0:1]??type;}

  async function askGuru(){
    setThinking([]);setThinkingError(null);setSelected(null);setDetail(null);setInsights(null);setSelectedOffer(null);setView("thinking");
    try{
      const response=await fetch("/api/recommend/stream",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...draft,language:lang})});
      if(!response.ok||!response.body)throw new Error(say(lang,"Δεν μπόρεσα να ξεκινήσω την ανάλυση.","Could not start the analysis."));
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";
      while(true){const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()??"";for(const line of lines){if(!line.trim())continue;const event=JSON.parse(line) as StreamEvent;setThinking(prev=>[...prev,event].slice(-8));if(event.type==="error")throw new Error(event.message||say(lang,"Η ανάλυση σταμάτησε.","Analysis stopped."));if(event.type==="final"&&event.result){setResult(event.result);setDraft(event.result.request);setView("choices");}}}
    }catch(e){setThinkingError(e instanceof Error?e.message:say(lang,"Κάτι πήγε στραβά.","Something went wrong."));setView("home")}
  }

  async function chooseDestination(trip:GuruRecommendation){
    setSelected(trip);setDetail(null);setInsights(null);setSelectedOffer(null);setOfferUnlocked(false);setView("destination");window.scrollTo({top:0,behavior:"smooth"});
    const detailUrl=`/api/destination-detail?destination_id=${encodeURIComponent(trip.destinationId)}&month=${encodeURIComponent(draft.month)}`;
    const insightParams=new URLSearchParams({destination:trip.destination,lang,traveler:draft.travelerType,moods:draft.moods.join(","),nights:String(draft.nights)});
    if(trip.latitude!=null)insightParams.set("lat",String(trip.latitude));
    if(trip.longitude!=null)insightParams.set("lon",String(trip.longitude));
    const insightUrl=`/api/destination-insights?${insightParams.toString()}`;
    const [d,i]=await Promise.all([
      fetch(detailUrl).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(insightUrl).then(r=>r.ok?r.json():null).catch(()=>null)
    ]);
    setDetail(d as AffiliateDestinationDetailResponse|null);setInsights(i as DestinationInsightsResponse|null);
  }
  function reviewOffer(offer:AffiliateOffer){setSelectedOffer(offer);setOfferUnlocked(false);window.setTimeout(()=>document.getElementById("offer-review")?.scrollIntoView({behavior:"smooth",block:"center"}),50)}
  function rerunWith(key:keyof TripRequest,value:unknown){setDraft(d=>({...d,[key]:value} as TripRequest));setView("home");window.setTimeout(()=>document.getElementById("guide")?.scrollIntoView({behavior:"smooth"}),60)}

  const hero=(i:number)=>featured[i]?.imageUrl?{backgroundImage:`linear-gradient(180deg,rgba(1,18,40,.08),rgba(1,18,40,.56)),url(${featured[i].imageUrl})`}:undefined;
  const topThinking=thinking[thinking.length-1];
  const thinkingProgress=Math.min(100,Math.max(12,thinking.length*17));
  const comparisons=result?.recommendations??[];

  if(view==="destination"&&selected){
    const researchReady=insights?.source==="openai-web-research";
    return <div className="v5-app v5-destination-page">
      <header className="v5-nav"><button className="v5-back" type="button" onClick={()=>setView("choices")}>← {say(lang,"πίσω στις 5 επιλογές","back to 5 choices")}</button><a className="v5-logo" href="#">✦ <b>Travel Guru</b></a><nav><span>{say(lang,"Η επιλογή σου","Your AI-picked destination")}</span></nav><div className="v5-lang"><button className={lang==="el"?"active":""} onClick={()=>changeLanguage("el")}>EL</button><button className={lang==="en"?"active":""} onClick={()=>changeLanguage("en")}>EN</button></div></header>
      <main>
        <section className="destination-hero" style={selected.imageUrl?{backgroundImage:`linear-gradient(90deg,rgba(3,17,40,.88) 0%,rgba(3,17,40,.58) 48%,rgba(3,17,40,.22) 100%),url(${selected.imageUrl})`}:undefined}>
          <div className="destination-story"><span className="v5-kicker">{say(lang,"Ο AI βρήκε το καλύτερο match","The AI found your strongest match")}</span><h1>{selected.destination}</h1><p>{selected.whyThisPlace}</p><div className="destination-chips"><span>◎ {selected.distanceKm!=null?`≈ ${selected.distanceKm} km`:say(lang,"απόσταση μη επιβεβαιωμένη","distance unverified")}</span><span>★ {selected.fiveStarOfferCount} {say(lang,"πραγματικές 5★ επιλογές","verified 5★ offers")}</span><span>⌁ {selected.activeOfferCount} {say(lang,"ενεργές προσφορές","active offers")}</span></div><div className="why-card"><b>{say(lang,"Γιατί αυτή η επιλογή;","Why this destination?")}</b><p>{selected.whyNow}</p></div></div>
          <div className="match-card"><div className="score-ring" style={{"--score":`${selected.score}%`} as CSSProperties}><div><strong>{selected.score}%</strong><span>AI match</span></div></div><h3>{say(lang,"Δυνατό ταίριασμα","Strong match")}</h3><ul><li>{say(lang,"Ταιριάζει στο travel style σου","Matches your travel style")}</li><li>{say(lang,"Έχει ουσιαστικό ξενοδοχειακό βάθος","Useful hotel depth")}</li><li>{say(lang,"Η απόσταση μπήκε στο ranking","Distance was ranked")}</li><li>{say(lang,"Δεν υπάρχει duplicate πόλη στις επιλογές","No duplicate city in the set")}</li></ul></div>
          <aside className="live-eval"><div className="live-title"><span className="live-dot"/>AI {say(lang,"αξιολόγηση","evaluation")}<em>Live</em></div><Metric label={say(lang,"ταίριασμα","fit")} value={selected.score}/><Metric label={say(lang,"απόσταση","distance")} value={selected.breakdown.effort}/><Metric label={say(lang,"5★ βάθος","5★ depth")} value={selected.breakdown.luxury}/><Metric label={say(lang,"πρόθεση","intent")} value={selected.breakdown.intent}/><Metric label={say(lang,"αξία","value")} value={selected.breakdown.value}/><Metric label={say(lang,"deals","deals")} value={selected.breakdown.deal}/></aside>
          <aside className="compare-card"><b>{say(lang,"Πώς συγκρίνεται","How it compares")}</b><small>{say(lang,"με τις άλλες 4 επιλογές σου","with your other 4 choices")}</small>{comparisons.map((x,i)=><button type="button" key={x.destinationId} className={x.destinationId===selected.destinationId?"active":""} onClick={()=>chooseDestination(x)}><span>{i+1}. {x.destination}</span><b>{x.score}%</b></button>)}</aside>
        </section>

        <section className="destination-controls"><label>{say(lang,"Πόσο μακριά;","How far?")}<select value={draft.distancePreference??"any"} onChange={e=>rerunWith("distancePreference",e.target.value)}><option value="nearby">{say(lang,"Κοντά","Nearby")}</option><option value="easy-hop">{say(lang,"Εύκολη απόδραση","Easy hop")}</option><option value="island">{say(lang,"Νησιωτικά","Island feel")}</option><option value="any">{say(lang,"Οπουδήποτε","Any")}</option></select></label><label>{say(lang,"Ρυθμός","Pace")}<select value={draft.pace??"balanced"} onChange={e=>rerunWith("pace",e.target.value)}><option value="slow">{say(lang,"Χαλαρά","Slow")}</option><option value="balanced">{say(lang,"Ισορροπημένα","Balanced")}</option><option value="full">{say(lang,"Γεμάτα","Full")}</option></select></label><label>{say(lang,"Ξενοδοχείο","Hotel style")}<select value={draft.hotelStyle??"any"} onChange={e=>rerunWith("hotelStyle",e.target.value)}>{hotelOptions.map(x=><option key={x.value} value={x.value}>{lang==="el"?x.el:x.en}</option>)}</select></label><label>{say(lang,"Τι να αποφύγω","Avoid")}<select value={draft.avoid??"none"} onChange={e=>rerunWith("avoid",e.target.value)}>{avoidOptions.map(x=><option key={x.value} value={x.value}>{lang==="el"?x.el:x.en}</option>)}</select></label></section>

        <section className="destination-body">
          <div className="offers-column">
            <div className="urgency-bar"><div><span>{say(lang,"Πραγματική λήξη feed","Verified feed expiry")}</span><b>{countdown?say(lang,"Η πιο κοντινή tracked προσφορά λήγει σε:","Nearest tracked offer expires in:"):say(lang,"Δεν υπάρχει επιβεβαιωμένη κοντινή λήξη","No verified near-term expiry")}</b></div>{countdown&&<div className="countdown"><span><b>{String(countdown.days).padStart(2,"0")}</b><small>{say(lang,"ΜΕΡ","DAYS")}</small></span><i>:</i><span><b>{String(countdown.hours).padStart(2,"0")}</b><small>{say(lang,"ΩΡ","HRS")}</small></span><i>:</i><span><b>{String(countdown.minutes).padStart(2,"0")}</b><small>{say(lang,"ΛΕΠ","MIN")}</small></span><i>:</i><span><b>{String(countdown.seconds).padStart(2,"0")}</b><small>{say(lang,"ΔΕΥ","SEC")}</small></span></div>}</div>
            <div className="offer-section-head"><div><span>♛ {say(lang,"5★ Premium Picks","5★ Premium Picks")}</span><h2>{say(lang,"Πρώτα η πολυτέλεια. Από ακριβότερο προς χαμηλότερο.","Luxury first. Highest feed price to lower.")}</h2></div><em>{detail?`${detail.fiveStarCount} ${say(lang,"επιβεβαιωμένες 5★ στο feed","verified 5★ in feed")}`:say(lang,"φόρτωση…","loading…")}</em></div>
            <div className="hotel-grid">{detail?premiumDisplay.map((o,i)=><HotelCard key={o.sourceProductId} offer={o} rank={i+1} lang={lang} verifiedFive={o.starLevel===5} onReview={()=>reviewOffer(o)}/>):Array.from({length:5}).map((_,i)=><div className="hotel-skeleton" key={i}/>)}</div>
            {detail&&detail.fiveStarCount<5&&<p className="data-honesty">{say(lang,`Το feed έχει ${detail.fiveStarCount} πραγματικές 5★ επιλογές εδώ. Οι υπόλοιπες premium κάρτες δεν χαρακτηρίζονται 5★ — δεν δημιουργούμε ψεύτικη κατηγορία.`,`The feed has ${detail.fiveStarCount} verified 5★ choices here. Remaining premium cards are not labelled 5★ — we do not invent hotel categories.`)}</p>}
            <div className="offer-section-head compact"><div><span>✦ {say(lang,"5 ισχυρές εναλλακτικές","5 strong alternatives")}</span><h2>{say(lang,"Περισσότερες επιλογές πριν ξεκλειδώσεις το τελικό link.","More choices before you unlock the final link.")}</h2></div></div>
            <div className="hotel-grid alternatives">{detail?alternativeDisplay.map((o,i)=><HotelCard key={o.sourceProductId} offer={o} rank={i+6} lang={lang} verifiedFive={false} onReview={()=>reviewOffer(o)}/>):Array.from({length:5}).map((_,i)=><div className="hotel-skeleton" key={i}/>)}</div>

            {selectedOffer&&<section id="offer-review" className="offer-review-panel"><div className="unlock-steps"><span className="done">1</span><i/><span className={offerUnlocked?"done":"active"}>2</span><i/><span className={offerUnlocked?"active":""}>3</span></div><div className="offer-review-main"><div className="offer-review-image" style={(selectedOffer.imageUrl||selectedOffer.thumbUrl)?{backgroundImage:`url(${selectedOffer.imageUrl||selectedOffer.thumbUrl})`}:undefined}/><div><span className="v5-kicker">{say(lang,"Mini funnel · πριν το τελικό click","Mini funnel · before the final click")}</span><h3>{selectedOffer.propertyName}</h3><p>{selectedOffer.description||say(lang,"Η περιγραφή του feed δεν είναι διαθέσιμη.","Feed description is not available.")}</p><div className="review-facts"><span>{selectedOffer.starLevel?`${selectedOffer.starLevel}★`:say(lang,"χωρίς star data","no star data")}</span><span>{priceLabel(selectedOffer,lang)}</span><span>{selectedOffer.discount?`-${Math.round(selectedOffer.discount)}%`:say(lang,"χωρίς discount signal","no discount signal")}</span><span>{say(lang,"ισχύει έως","valid to")} {dateLabel(selectedOffer.validTo,lang)}</span></div>{!offerUnlocked?<button type="button" className="unlock-button" onClick={()=>setOfferUnlocked(true)}>{say(lang,"Έλεγξα τα στοιχεία — ξεκλείδωσε την προσφορά","I reviewed it — unlock the offer")} →</button>:<div className="final-link"><div><b>{say(lang,"Τελικό βήμα","Final step")}</b><small>{say(lang,"Το μόνο εξωτερικό link είναι το ακριβές Linkwise tracking URL του feed.","The only external link is the exact Linkwise tracking URL from the feed.")}</small></div><a href={selectedOffer.trackingUrl} target="_blank" rel="sponsored nofollow">{say(lang,"Άνοιγμα tracked προσφοράς","Open tracked offer")} ↗</a></div>}</div></div></section>}
          </div>

          <aside className="discovery-column">
            <div className="discovery-tabs"><span>{say(lang,"Τι να κάνεις","Things to do")}</span><span>{say(lang,"Φαγητό & ζωή","Food & local life")}</span><span>{say(lang,"Research pulse","Research pulse")}</span></div>
            {researchReady&&insights?.overview&&<section className="research-overview"><div className="panel-title"><b>✦ {say(lang,"AI Web Research","AI Web Research")}</b><span>{insights.sources.length} {say(lang,"πηγές","sources")}</span></div><p>{insights.overview}</p><div className="research-source-chips">{Array.from(new Set(insights.sources.map(x=>x.domain))).slice(0,6).map(domain=><span key={domain}>{domain}</span>)}</div></section>}
            <DiscoveryBlock title={say(lang,"Κορυφαία πράγματα να κάνεις","Top things to do")} items={insights?.attractions??[]} empty={!researchReady} lang={lang}/>
            <DiscoveryBlock title={say(lang,"Φαγητό & τοπική ζωή","Food & local life")} items={insights?.restaurants??[]} empty={!researchReady} lang={lang}/>
            <div className="reviews-panel"><div className="panel-title"><b>{say(lang,"Research pulse","Research pulse")}</b><span>{researchReady?say(lang,"AI web research","AI web research"):say(lang,"Research agent","Research agent")}</span></div>{researchReady&&insights.reviews.length?insights.reviews.slice(0,4).map(r=><article key={r.id}><div><strong>{r.author||say(lang,"AI σύνθεση","AI synthesis")}</strong><span>{r.evidenceStrength??""}</span></div><h4>{r.title||say(lang,"Τι λέει η έρευνα","What the research says")}</h4><p>{r.text}</p></article>):<div className="terra-empty"><b>{insights?.source==="not-configured"?say(lang,"Το AI Web Research χρειάζεται OpenAI server key.","AI Web Research needs an OpenAI server key."):say(lang,"Η live web έρευνα δεν είναι διαθέσιμη τώρα.","Live web research is unavailable right now.")}</b><p>{say(lang,"Δεν εμφανίζουμε αντιγραμμένα reviews ή ψεύτικα ratings. Ο Research Agent συνθέτει δημόσιες πηγές όταν είναι διαθέσιμος.","We do not display copied reviews or fabricated ratings. The Research Agent synthesizes public web sources when available.")}</p></div>}{researchReady&&<small className="tripadvisor-attribution">{say(lang,`AI σύνθεση από ${insights.sources.length} δημόσιες web πηγές · έρευνα ${dateLabel(insights.researchedAt,lang)}. TripAdvisor pages μπορεί να εντοπίζονται μόνο ως reference — δεν αντιγράφουμε review text ή ratings.`,`AI synthesis from ${insights.sources.length} public web sources · researched ${dateLabel(insights.researchedAt,lang)}. Tripadvisor pages may be discovered only as references — review text and ratings are not copied.`)}</small>}</div>
            {researchReady&&insights.practicalNotes.length>0&&<div className="why-ai-panel"><span>⌁ {say(lang,"Πρακτικές σημειώσεις έρευνας","Research practical notes")}</span><ul>{insights.practicalNotes.slice(0,5).map((note,i)=><li key={`${note}-${i}`}>{note}</li>)}</ul></div>}
            <div className="why-ai-panel"><span>✦ {say(lang,"Γιατί ο AI διάλεξε αυτό","Why the AI chose this")}</span><ul><li>{selected.score}% {say(lang,"συνολικό match","overall match")}</li><li>{selected.fiveStarOfferCount} {say(lang,"επιβεβαιωμένες 5★ προσφορές","verified 5★ offers")}</li><li>{selected.breakdown.effort}% {say(lang,"fit απόστασης / effort","distance / effort fit")}</li><li>{selected.breakdown.intent}% {say(lang,"fit με αυτό που χρειάζεσαι","intent fit")}</li><li>{selected.breakdown.value}% {say(lang,"value fit","value fit")}</li></ul></div>
          </aside>
        </section>
      </main>
    </div>
  }

  return <div className="v5-app">
    <header className="v5-nav"><a className="v5-logo" href="#top">✦ <b>Travel Guru</b></a><nav><a href="#guide">{say(lang,"Πώς δουλεύει","How it works")}</a><a href="#choices">{say(lang,"Επιλογές","Choices")}</a><span>{say(lang,"Live affiliate universe","Live affiliate universe")}</span></nav><div className="v5-lang"><button className={lang==="el"?"active":""} onClick={()=>changeLanguage("el")}>EL</button><button className={lang==="en"?"active":""} onClick={()=>changeLanguage("en")}>EN</button></div></header>
    <main id="top">
      <section className="v5-hero">
        <div className="hero-bg hero-bg-main" style={hero(0)}/><div className="hero-bg hero-bg-side a" style={hero(1)}/><div className="hero-bg hero-bg-side b" style={hero(2)}/>
        <div className="hero-overlay"><div className="hero-copy-v5"><span className="hero-badge">✦ {say(lang,"Ο προσωπικός σου AI travel guide","Your personal AI travel guide")}</span><h1>{say(lang,"Λιγότερο ψάξιμο.","Less searching.")}<br/><em>{say(lang,"Καλύτερο ταξίδι, κάθε φορά.","Better trip, every time.")}</em></h1><p>{say(lang,"Πες μου πώς θέλεις να νιώσεις. Θα διαβάσω το live affiliate inventory, θα αφαιρέσω τις λάθος και διπλές επιλογές και θα σου δώσω 5 διαφορετικούς προορισμούς που αξίζει να εξετάσεις.","Tell me how you want the trip to feel. I’ll read live affiliate inventory, remove weak and duplicate options, and give you five genuinely different destinations worth considering.")}</p><div className="proof-row"><span>✓ {say(lang,"μόνο JSON προορισμοί","JSON destinations only")}</span><span>✓ {say(lang,"5 διαφορετικές πόλεις","5 distinct places")}</span><span>✓ {say(lang,"10 offers πριν το τελικό click","10 offers before final click")}</span></div></div></div>
      </section>

      <section className="guide-shell" id="guide">
        <div className="guide-card"><div className="guide-head"><div><span>✦ {say(lang,"Ρώτα τον AI","Ask the AI")}</span><p>{say(lang,"Λίγες έξυπνες ερωτήσεις — όχι φόρμα.","A few smart questions — not a form.")}</p></div><em>{say(lang,"διαβάζει live inventory","reads live inventory")}</em></div>
          <GuideRow icon="⌂" question={say(lang,"Από πού φεύγεις και πότε;","Where are you leaving from, and when?")} value={`${draft.origin} · ${monthLabel(draft.month,lang)}`} active={open==="origin"} onClick={()=>setOpen(open==="origin"?null:"origin")}><div className="guide-controls two"><input value={draft.origin} onChange={e=>update("origin",e.target.value)} aria-label="origin"/><div className="chip-row">{months.map(m=><button type="button" key={m} className={draft.month===m?"active":""} onClick={()=>update("month",m)}>{monthLabel(m,lang)}</button>)}</div></div></GuideRow>
          <GuideRow icon="◎" question={say(lang,"Πόσο μακριά θέλεις να νιώθει;","How far should this trip feel?")} value={(distanceOptions.find(x=>x.value===(draft.distancePreference??"any"))?.[lang==="el"?"el":"en"] as string)||""} active={open==="distance"} onClick={()=>setOpen(open==="distance"?null:"distance")}><div className="option-grid four">{distanceOptions.map(x=><button type="button" key={x.value} className={draft.distancePreference===x.value?"active":""} onClick={()=>update("distancePreference",x.value)}><b>{lang==="el"?x.el:x.en}</b><small>{lang==="el"?x.noteEl:x.noteEn}</small></button>)}</div></GuideRow>
          <GuideRow icon="☺" question={say(lang,"Τι χρειάζεσαι πραγματικά από αυτή την απόδραση;","What do you really need from this escape?")} value={moodLabel(draft.moods,lang)} active={open==="mood"} onClick={()=>setOpen(open==="mood"?null:"mood")}><div className="option-grid four moods">{moodOptions.map(x=><button type="button" key={x.value} className={draft.moods.includes(x.value)?"active":""} onClick={()=>toggleMood(x.value)}><i>{x.icon}</i><b>{lang==="el"?x.el:x.en}</b></button>)}</div></GuideRow>
          <GuideRow icon="▣" question={say(lang,"Πόσες νύχτες και πόσο άνετα θες να κινηθείς;","How many nights and how comfortable is the budget?")} value={`${draft.nights} ${say(lang,"νύχτες","nights")} · ${draft.budget} ${say(lang,"budget signal","budget signal")}`} active={open==="stay"} onClick={()=>setOpen(open==="stay"?null:"stay")}><div className="guide-controls"><div className="chip-row">{[2,3,4,5,7].map(n=><button type="button" key={n} className={draft.nights===n?"active":""} onClick={()=>update("nights",n)}>{n} {say(lang,"νύχτες","nights")}</button>)}</div><div className="chip-row">{[250,350,500,700,1000,1500].map(n=><button type="button" key={n} className={draft.budget===n?"active":""} onClick={()=>update("budget",n)}>{n}</button>)}</div></div></GuideRow>
          <GuideRow icon="♙" question={say(lang,"Με ποιον ταξιδεύεις;","Who are you traveling with?")} value={(travelerOptions.find(x=>x.value===draft.travelerType)?.[lang==="el"?"el":"en"] as string)||draft.travelerType} active={open==="people"} onClick={()=>setOpen(open==="people"?null:"people")}><div className="chip-row large">{travelerOptions.map(x=><button type="button" key={x.value} className={draft.travelerType===x.value?"active":""} onClick={()=>update("travelerType",x.value)}>{lang==="el"?x.el:x.en}</button>)}</div></GuideRow>
          <GuideRow icon="♥" question={say(lang,"Τι θα σε χαλούσε και τι hotel vibe θες;","What would ruin it, and what hotel vibe do you want?")} value={`${(hotelOptions.find(x=>x.value===(draft.hotelStyle??"any"))?.[lang==="el"?"el":"en"] as string)||""} · ${say(lang,"απέφυγε","avoid")} ${(avoidOptions.find(x=>x.value===(draft.avoid??"none"))?.[lang==="el"?"el":"en"] as string)||""}`} active={open==="style"} onClick={()=>setOpen(open==="style"?null:"style")}><div className="guide-controls"><div className="chip-row">{hotelOptions.map(x=><button type="button" key={x.value} className={draft.hotelStyle===x.value?"active":""} onClick={()=>update("hotelStyle",x.value)}>{lang==="el"?x.el:x.en}</button>)}</div><div className="chip-row">{avoidOptions.map(x=><button type="button" key={x.value} className={draft.avoid===x.value?"active":""} onClick={()=>update("avoid",x.value)}>{lang==="el"?x.el:x.en}</button>)}</div></div></GuideRow>
          <button type="button" className="guide-cta" onClick={()=>void askGuru()}><span>{say(lang,"Οδήγησέ με στις 5 καλύτερες επιλογές","Guide me to my 5 best choices")}</span><b>✦</b></button>
        </div>
        <aside className="thinking-card"><div className="thinking-title"><span className="live-dot"/><b>AI {view==="thinking"?say(lang,"δουλεύει τώρα","is working now"):say(lang,"έτοιμο","ready")}</b><em>{view==="thinking"?"Live":"Standby"}</em></div><p>{view==="thinking"&&topThinking?stageLabel(topThinking.type):say(lang,"Θα δείχνω τι ελέγχεται — όχι κρυφό chain-of-thought.","I’ll show what is being checked — not private chain-of-thought.")}</p><div className="thinking-progress"><i><b style={{width:`${view==="thinking"?thinkingProgress:18}%`}}/></i><span>{view==="thinking"?`${thinkingProgress}%`:say(lang,"έτοιμο για ανάλυση","ready to analyze")}</span></div><Metric label={say(lang,"πρόθεση","fit")} value={profile.fit}/><Metric label={say(lang,"effort","effort")} value={profile.effort}/><Metric label={say(lang,"5★ προτίμηση","5★ preference")} value={profile.luxury}/><Metric label={say(lang,"αξία","value")} value={profile.value}/>{view==="thinking"&&thinking.length>0&&<div className="thinking-log">{thinking.filter(x=>x.type!=="final").slice(-5).map((e,i)=><div key={`${e.type}-${i}`}><span>✓</span><p>{stageLabel(e.type)}</p></div>)}</div>}{thinkingError&&<div className="thinking-error">{thinkingError}</div>}</aside>
      </section>

      <section className="journey-strip"><div><b>1</b><span>{say(lang,"Ρώτα τον AI","Ask the AI")}</span><small>{say(lang,"τι πραγματικά χρειάζεσαι","what you actually need")}</small></div><i>→</i><div><b>2</b><span>{say(lang,"Σύγκρινε 5 μέρη","Compare 5 places")}</span><small>{say(lang,"χωρίς διπλές πόλεις","no duplicate cities")}</small></div><i>→</i><div><b>3</b><span>{say(lang,"Δες 10 stays","Explore 10 stays")}</span><small>{say(lang,"5★ πρώτα + 5 alternatives","5★ first + 5 alternatives")}</small></div><i>→</i><div><b>4</b><span>{say(lang,"Ξεκλείδωσε το link","Unlock the link")}</span><small>{say(lang,"μόνο στο τέλος","only at the end")}</small></div></section>

      {view==="choices"&&result&&<section className="choice-section" id="choices"><div className="choice-heading"><div><span className="v5-kicker">{say(lang,"Οι 5 λύσεις του Guru","Your 5 Guru solutions")}</span><h2>{say(lang,"Πέντε διαφορετικοί τρόποι να λύσεις το ίδιο travel problem.","Five different ways to solve the same travel problem.")}</h2></div><div><b>{result.candidateCount}</b><span>{say(lang,"eligible destinations ελέγχθηκαν","eligible destinations checked")}</span></div></div><div className="choice-grid">{result.recommendations.map((trip,i)=><DestinationChoice key={trip.destinationId} trip={trip} index={i} lang={lang} onChoose={()=>void chooseDestination(trip)}/>)}</div></section>}
    </main>
    <footer className="v5-footer"><span>Travel Guru · Linkwise feed-bound AI</span><span>{say(lang,"Facts → ranking → AI judgement → 5 choices → 10 offers → tracked link","Facts → ranking → AI judgement → 5 choices → 10 offers → tracked link")}</span></footer>
  </div>
}

function GuideRow({icon,question,value,active,onClick,children}:{icon:string;question:string;value:string;active:boolean;onClick:()=>void;children:React.ReactNode}){return <div className={`guide-row ${active?"open":""}`}><button type="button" className="guide-row-main" onClick={onClick}><i>{icon}</i><span><small>{question}</small><b>{value}</b></span><em>{active?"−":"+"}</em></button><div className="guide-row-extra">{children}</div></div>}
function DestinationChoice({trip,index,lang,onChoose}:{trip:GuruRecommendation;index:number;lang:Lang;onChoose:()=>void}){return <article className={`choice-card ${index===0?"featured":""}`}><div className="choice-photo" style={trip.imageUrl?{backgroundImage:`linear-gradient(180deg,rgba(3,17,40,.02),rgba(3,17,40,.78)),url(${trip.imageUrl})`}:undefined}><div><span>#{index+1}</span><em>{roleLabel(trip.role,lang)}</em></div><section><small>{trip.country}</small><h3>{trip.destination}</h3></section></div><div className="choice-body"><div className="choice-score"><strong>{trip.score}%</strong><span>{say(lang,"AI match","AI match")}</span><em>{confidenceLabel(trip.confidence,lang)} {say(lang,"βεβαιότητα","confidence")}</em></div><p>{trip.whyThisPlace}</p><div className="choice-stats"><span><b>{trip.fiveStarOfferCount}</b>{say(lang,"5★ offers","5★ offers")}</span><span><b>{trip.activeOfferCount}</b>{say(lang,"ενεργές","active")}</span><span><b>{trip.distanceKm!=null?Math.round(trip.distanceKm):"—"}</b>{say(lang,"km proxy","km proxy")}</span></div><div className="choice-bars"><Metric label={say(lang,"fit","fit")} value={trip.breakdown.intent}/><Metric label={say(lang,"effort","effort")} value={trip.breakdown.effort}/><Metric label={say(lang,"5★","5★")} value={trip.breakdown.luxury}/><Metric label={say(lang,"value","value")} value={trip.breakdown.value}/></div><button type="button" className="choose-button" onClick={onChoose}>{say(lang,"Εξερεύνησε αυτή την επιλογή","Explore this choice")} <span>→</span></button></div></article>}
function HotelCard({offer,rank,lang,verifiedFive,onReview}:{offer:AffiliateOffer;rank:number;lang:Lang;verifiedFive:boolean;onReview:()=>void}){const image=offer.imageUrl||offer.thumbUrl;return <article className="hotel-card"><div className="hotel-photo" style={image?{backgroundImage:`linear-gradient(180deg,rgba(3,17,40,.02),rgba(3,17,40,.38)),url(${image})`}:undefined}><b>{rank}</b><span>{verifiedFive?"5★":offer.starLevel?`${offer.starLevel}★`:say(lang,"premium alt","premium alt")}</span></div><div className="hotel-copy"><small>{offer.category||"stay"}</small><h3>{offer.propertyName}</h3><div className="hotel-price"><b>{priceLabel(offer,lang)}</b>{offer.discount&&offer.discount>0?<em>-{Math.round(offer.discount)}%</em>:null}</div><p>{offer.description?.slice(0,105)||say(lang,"Feed-backed tracked stay.","Feed-backed tracked stay.")}</p><div className="hotel-valid"><span>{say(lang,"έως","to")} {dateLabel(offer.validTo,lang)}</span><span>{offer.demandSignal!=null?`signal ${Math.round(offer.demandSignal)}`:"live feed"}</span></div><button type="button" onClick={onReview}>{say(lang,"Δες λεπτομέρειες","View details")}</button></div></article>}
function DiscoveryBlock({title,items,empty,lang}:{title:string;items:DestinationInsightsResponse["restaurants"];empty:boolean;lang:Lang}){return <section className="discovery-block"><div className="panel-title"><b>{title}</b><span>{empty?say(lang,"Research agent","Research agent"):say(lang,"AI web research","AI web research")}</span></div>{!empty&&items.length?<div className="discovery-grid">{items.slice(0,6).map(x=><article key={x.id}><div className="discovery-photo research-mark"><span>✦</span></div><div><b>{x.name}</b><span>{x.evidenceStrength?say(lang,`${x.evidenceStrength} evidence`,`${x.evidenceStrength} evidence`):say(lang,"web research","web research")}</span><small>{x.summary||x.address||""}</small>{x.whyItFits&&<em>{x.whyItFits}</em>}</div></article>)}</div>:<div className="terra-empty compact"><p>{say(lang,"Ο AI Research Agent θα γεμίσει αυτό το panel με live δημόσια web έρευνα για τον επιλεγμένο προορισμό.","The AI Research Agent will populate this panel with live public-web research for the selected destination.")}</p></div>}</section>}
