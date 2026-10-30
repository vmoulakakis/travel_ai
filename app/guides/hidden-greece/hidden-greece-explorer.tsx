"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./hidden-greece.module.css";
import {upcomingGreekBreaks,type GreekBreak} from "@/lib/hidden-greece/holidays";

type Place={
  id:string;name_el:string;region_el:string|null;latitude:number;longitude:number;
  kind:string|null;seasons:string[]|null;activities:string[]|null;moods:string[]|null;
  hook_el:string|null;access_el:string|null;source_url:string|null;source_label:string|null;
  discoveryFitScore:number;verifiedSource:boolean;scoreExplanation:string[];
};
type Stay={
  stayId:string;propertyName:string;address:string|null;latitude:number;longitude:number;
  distanceKmStraightLine:number;imageUrl:string|null;affiliateUrl:string|null;
  observedOfferPrice:number|null;currency:string|null;
  bookingStatus:string;qualityStatus:string;score:number;
};
type DayPlan={day:number;heading:string;focus:string;steps:string[];requiresVerification:string[]};
type Case={place:Place;stays:Stay[];plan?:{nights:number;days:DayPlan[];status:string;disclaimer:string};reason:string};
type Result={ok:boolean;count:number;cases:Case[];generatedAt?:string;methodology?:Record<string,string>};
type Mood="nature"|"quiet"|"adventure"|"culture"|"romantic"|"family"|"";
type Journey={mood:Mood;nights:number;start:string;season:string};
const questions:{id:Mood;label:string;description:string}[]=[
  {id:"nature",label:"Θέλω φύση που συγκλονίζει",description:"Τοπίο · νερά · δάση"},
  {id:"quiet",label:"Χρειάζομαι πραγματική ησυχία",description:"Αποφόρτιση · αργός ρυθμός"},
  {id:"adventure",label:"Θέλω να εξερευνήσω",description:"Μονοπάτια · περιπέτεια"},
  {id:"culture",label:"Θέλω τόπους με ιστορίες",description:"Οικισμοί · παράδοση"},
  {id:"romantic",label:"Θέλω μία απόδραση για δύο",description:"Ατμόσφαιρα · ανακάλυψη"},
  {id:"family",label:"Θέλω κάτι διαφορετικό με παιδιά",description:"Πρακτική βάση · ήπια εμπειρία"},
];
const seasonForMonth=(month:number)=>month>=3&&month<=5?"spring":month>=6&&month<=8?"summer":month>=9&&month<=11?"autumn":"winter";
function localISO(date:Date) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
function nextFriday(){
  const today=new Date();
  const days=(5-today.getDay()+7)%7;
  today.setDate(today.getDate()+days);
  return localISO(today);
}
function addDays(iso:string,days:number){
  const [y,m,d]=iso.split("-").map(Number);
  if(!y||!m||!d)return "";
  const date=new Date(y,m-1,d);
  date.setDate(date.getDate()+days);
  return localISO(date);
}
function durationLabel(n:number){return n===1?"1 νύχτα":`${n} νύχτες`;}
function themeLabel(kind:string|null){
  if(!kind)return "Ανεξερεύνητο μέρος";
  const names:Record<string,string>={waterfall:"Καταρράκτης",village:"Οικισμός",lake:"Λίμνη",forest:"Δάσος",gorge:"Φαράγγι",island:"Νησί",nature:"Φύση"};
  return names[kind]??kind.replace(/-/g," · ");
}
function safeHotelImage(value:string|null){
  if(!value)return null;
  try{const u=new URL(value);return u.protocol==="https:"?u.toString():null;}catch{return null;}
}
function safeSource(value:string|null){
  if(!value)return null;
  try{const u=new URL(value);return u.protocol==="https:"?u.toString():null;}catch{return null;}
}
function MapCanvas({active}:{active:Case|null}){
  const target=useRef<HTMLDivElement>(null);
  const [mapError,setMapError]=useState(false);
  useEffect(()=>{
    if(!target.current||!active)return;
    let map:import("leaflet").Map|undefined;
    let disposed=false;
    setMapError(false);
    void import("leaflet").then(L=>{
      if(disposed||!target.current)return;
      map=L.map(target.current,{zoomControl:false,scrollWheelZoom:false,attributionControl:true,keyboard:true,preferCanvas:true})
        .setView([active.place.latitude,active.place.longitude],11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        maxZoom:17,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(map);
      L.control.zoom({position:"bottomright"}).addTo(map);
      const originIcon=L.divIcon({className:styles.poiPin,html:"✦",iconSize:[44,44],iconAnchor:[22,22]});
      const origin=L.marker([active.place.latitude,active.place.longitude],{icon:originIcon}).addTo(map);
      const name=document.createElement("span");name.textContent=active.place.name_el;origin.bindTooltip(name,{direction:"top",offset:[0,-18]});
      const coords: [number,number][]=[[active.place.latitude,active.place.longitude]];
      active.stays.forEach((stay,i)=>{
        const icon=L.divIcon({className:styles.stayPin,html:String(i+1),iconSize:[30,30],iconAnchor:[15,15]});
        const m=L.marker([stay.latitude,stay.longitude],{icon}).addTo(map!);
        const title=document.createElement("span");title.textContent=stay.propertyName;
        m.bindTooltip(title,{direction:"top",offset:[0,-12]});
        coords.push([stay.latitude,stay.longitude]);
      });
      if(coords.length>1)map.fitBounds(L.latLngBounds(coords).pad(.28),{maxZoom:12,animate:false});
      const current=map;
      window.requestAnimationFrame(()=>{if(!disposed)current.invalidateSize();});
    }).catch(()=>{if(!disposed)setMapError(true)});
    return()=>{disposed=true;map?.remove();};
  },[active]);
  return <div className={styles.mapFrame}>
    <div className={styles.mapHeading}><span className={styles.microLabel}>CARTOGRAPHIC VIEW</span><span>✦ Microplace &nbsp; ◦ Stays</span></div>
    <div ref={target} className={styles.mapCanvas} role="region" aria-label="Χάρτης με το επιλεγμένο μέρος και τις κοντινές επιλογές διαμονής"/>
    {mapError&&<p className={styles.mapFallback}>Ο χάρτης δεν φόρτωσε. Η γεωγραφική θέση και οι αποστάσεις παραμένουν διαθέσιμες παρακάτω.</p>}
    {active&&<div className={styles.coordinateLabel}>{active.place.latitude.toFixed(3)}° N &nbsp; {active.place.longitude.toFixed(3)}° E</div>}
  </div>;
}

export default function HiddenGreeceExplorer(){
  const headingId=useId();
  const [journey,setJourney]=useState<Journey>({mood:"",nights:2,start:"",season:seasonForMonth(new Date().getMonth()+1)});
  const [cases,setCases]=useState<Case[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [needText,setNeedText]=useState("");
  const [intentLoading,setIntentLoading]=useState(false);
  const [intentFeedback,setIntentFeedback]=useState("");
  const [mode,setMode]=useState<"explore"|"details">("explore");
  const [retry,setRetry]=useState(0);
  const [holidayChoices,setHolidayChoices]=useState<GreekBreak[]>([]);
  useEffect(()=>setHolidayChoices(upcomingGreekBreaks(new Date(),3)),[]);
  const selectedCase=cases.find(item=>item.place.id===selected)??cases[0]??null;
  const update=useCallback((change:Partial<Journey>)=>setJourney(prev=>({...prev,...change})),[]);
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({limit:"6",nights:String(journey.nights),season:journey.season});
    if(journey.mood)params.set("mood",journey.mood);
    if(journey.start){params.set("start",journey.start);params.set("end",addDays(journey.start,journey.nights));}
    setLoading(true);setMessage("");
    void fetch("/api/hidden-greece/discover?"+params,{cache:"no-store",signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw new Error("Δεν ήταν διαθέσιμη η αναζήτηση. Δοκίμασε ξανά.");
        const result=await response.json() as Result;
        if(!result.ok||!Array.isArray(result.cases))throw new Error("Η ταξιδιωτική βάση δεν απάντησε σωστά.");
        setCases(result.cases);
        setSelected(old=>result.cases.some(c=>c.place.id===old)?old:result.cases[0]?.place.id??null);
        if(!result.cases.length)setMessage("Δεν υπάρχουν τεκμηριωμένες επιλογές για αυτόν τον συνδυασμό. Δοκίμασε άλλο ύφος ή εποχή.");
      })
      .catch(e=>{if(!controller.signal.aborted){setMessage(e instanceof Error?e.message:"Αποτυχία φόρτωσης.");setCases([]);}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[journey.mood,journey.nights,journey.season,journey.start,retry]);
  const interpretNeed=async()=>{
    if(needText.trim().length<8||intentLoading)return;
    setIntentLoading(true);setIntentFeedback("");
    try{
      const response=await fetch("/api/hidden-greece/interpret",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:needText}),cache:"no-store"
      });
      const data=await response.json() as {ok:boolean;intent?:{mood:Mood|null;nights:number|null;mode:string};error?:string;needsClarification?:boolean};
      if(!response.ok||!data.ok||!data.intent)throw new Error(data.error??"Δεν έγινε κατανόηση της ανάγκης.");
      const choice=data.intent;
      if(choice.mood||choice.nights)update({...choice.mood?{mood:choice.mood}:{},...choice.nights?{nights:choice.nights}:{}});
      setIntentFeedback(data.needsClarification?"Δεν κατάλαβα με σιγουριά την προτεραιότητά σου. Επίλεξε μία ανάγκη παραπάνω.":"Προσάρμοσα τις προτάσεις στην ανάγκη σου. Τα αποτελέσματα βασίζονται στα πραγματικά στοιχεία της βάσης.");
    }catch(e){setIntentFeedback(e instanceof Error?e.message:"Προσωρινό πρόβλημα. Χρησιμοποίησε τις έτοιμες επιλογές.");}
    finally{setIntentLoading(false);}
  };
  const selectCase=(id:string)=>{setSelected(id);setMode("details");};
  const seasonLabel=journey.season==="winter"?"Χειμώνας":journey.season==="spring"?"Άνοιξη":journey.season==="summer"?"Καλοκαίρι":"Φθινόπωρο";
  const selectedQuestion=questions.find(q=>q.id===journey.mood);

  return <main className={styles.experience}>
    <div className={styles.ambientLines} aria-hidden="true"/>
    <section className={styles.hero} aria-labelledby={headingId}>
      <div className={styles.heroText}>
        <div className={styles.overline}><span className={styles.mark}>✦</span> TRAVELAI · AN ATLAS OF UNEXPECTED PLACES <span className={styles.line}/></div>
        <h1 id={headingId}>The places<br/>you <em>didn’t know</em><br/>you needed.</h1>
        <p className={styles.heroTranslation}>Η άλλη Ελλάδα δεν είναι λίστα.<br/>Είναι η απόδραση που σου έλειπε.</p>
        <p className={styles.heroDescription}>Μικροί τόποι, μεγάλες εμπειρίες. Ανακαλύπτουμε τι αξίζει πραγματικά, εξετάζουμε τις δυσκολίες και χτίζουμε την ιδανική βάση διαμονής γύρω από το μέρος — όχι το αντίστροφο.</p>
        <a className={styles.heroCta} href="#discover">Βρες το δικό σου κρυφό μέρος <span aria-hidden="true">↗</span></a>
        <div className={styles.heroFoot}><span>HIDDEN GREECE / 001</span><span>DISCOVER · UNDERSTAND · ESCAPE</span></div>
      </div>
      <div className={styles.heroVisual} aria-label="Καλλιτεχνική χαρτογραφική απεικόνιση της ελληνικής φύσης, όχι πραγματική φωτογραφία προορισμού">
        <div className={styles.orbitOne}/><div className={styles.orbitTwo}/><div className={styles.contour}/><div className={styles.contourSecond}/>
        <div className={styles.islandShape}/>
        <div className={styles.heroCoordinate}>39° 21′ N<br/>22° 56′ E</div>
        <div className={styles.heroEmblem}>✦</div>
        <div className={styles.visualBottom}><span>01 / THE UNEXPECTED</span><strong>WANDER<br/>BEYOND.</strong></div>
        <p className={styles.visualDisclaimer}>Εικαστική χαρτογραφία · όχι φωτογραφία συγκεκριμένης τοποθεσίας</p>
      </div>
    </section>

    <section id="discover" className={styles.discoveryWorkspace} aria-label="Σχεδίαση της απόδρασής σου">
      <div className={styles.workspaceIntro}>
        <div><span className={styles.microLabel}>01 — YOUR ESCAPE, DEFINED</span><h2>Τι χρειάζεσαι <em>να νιώσεις;</em></h2></div>
        <p>Δεν χρειάζεται να ξέρεις προορισμό. Ξεκίνα από την ανάγκη σου· το μέρος θα ακολουθήσει.</p>
      </div>
      <div className={styles.needGrid} role="group" aria-label="Επίλεξε την ανάγκη σου">
        {questions.map(q=><button key={q.id} type="button" onClick={()=>update({mood:journey.mood===q.id?"":q.id})}
          className={`${styles.needButton} ${journey.mood===q.id?styles.needActive:""}`}
          aria-pressed={journey.mood===q.id}><span className={styles.needSelect}>{journey.mood===q.id?"✓":"↗"}</span>
          <strong>{q.label}</strong><small>{q.description}</small></button>)}
      </div>
      <form className={styles.needForm} onSubmit={e=>{e.preventDefault();void interpretNeed();}}>
        <label htmlFor="hg-your-need">Ή πες μας με δικά σου λόγια τι σου λείπει.</label>
        <div className={styles.needInputGroup}><input id="hg-your-need" name="need" type="text" value={needText} minLength={8} maxLength={320} required
          onChange={e=>setNeedText(e.target.value)} placeholder="Θέλω ένα διήμερο σε άγνωστο βουνό, με ησυχία και ωραίες διαδρομές…"/>
          <button type="submit" disabled={intentLoading}>{intentLoading?"Κατανοούμε…":"Κατάλαβε την ανάγκη μου ↗"}</button></div>
        <small>Η ερμηνεία υποστηρίζει κανόνες και προαιρετικό AI model. Μην καταχωρείς ευαίσθητα προσωπικά δεδομένα.</small>
        {intentFeedback&&<p role="status">{intentFeedback}</p>}
      </form>
      <div className={styles.tripBar}>
        <div className={styles.tripBarTitle}><span className={styles.microLabel}>02 — TRIP REALITY</span><strong>Πόσο χρόνο έχεις;</strong></div>
        <div className={styles.durationControl} role="group" aria-label="Διάρκεια ταξιδιού">
          {[1,2,3,7].map(n=><button key={n} type="button" className={journey.nights===n?styles.durationActive:""} onClick={()=>update({nights:n})} aria-pressed={journey.nights===n}>{n===1?"Μία νύχτα":n===2?"Σαββατοκύριακο":n===3?"3ήμερο":"Εβδομάδα"}</button>)}
        </div>
        <label className={styles.dateField}><span>Αναχώρηση <small>(προαιρετικά)</small></span><input type="date" min={localISO(new Date())} value={journey.start}
          onChange={e=>{const d=e.target.value;update({start:d,season:d?seasonForMonth(Number(d.slice(5,7))):journey.season});}} /></label>
        <label className={styles.seasonField}><span>Εποχή</span><select value={journey.season} onChange={e=>update({season:e.target.value})}><option value="autumn">Φθινόπωρο</option><option value="winter">Χειμώνας</option><option value="spring">Άνοιξη</option><option value="summer">Καλοκαίρι</option></select></label>
      </div>
      <div className={styles.quickAccess}><span>ΓΡΗΓΟΡΗ ΑΠΟΔΡΑΣΗ</span><button type="button" onClick={()=>update({start:nextFriday(),nights:2,season:seasonForMonth(Number(nextFriday().slice(5,7)))})}>Το επόμενο Σ/Κ ↗</button><button type="button" onClick={()=>update({start:""})}>Χωρίς ημερομηνίες</button>{holidayChoices.map(h=><button type="button" key={h.id} title={h.why} onClick={()=>update({start:h.start,nights:h.nights,season:seasonForMonth(Number(h.start.slice(5,7)))})}>{h.label} · {h.start.slice(8,10)}/{h.start.slice(5,7)} ↗</button>)}</div>
    </section>

    <section className={styles.resultsSection} aria-labelledby="resultTitle">
      <div className={styles.resultsHeader}>
        <div><span className={styles.microLabel}>03 — INTELLIGENT DISCOVERY</span><h2 id="resultTitle">{selectedQuestion?"Μέρη για αυτό που αναζητάς.":"Η Ελλάδα που δεν περίμενες."}</h2></div>
        <div className={styles.resultMeta}><span>{durationLabel(journey.nights)}</span><span>·</span><span>{seasonLabel}</span><span>·</span><span>{loading?"Αναζήτηση…":`${cases.length} τεκμηριωμένες προτάσεις`}</span></div>
      </div>
      {message&&<div className={styles.feedback} role="status"><span>{message}</span><button onClick={()=>setRetry(x=>x+1)} type="button">Επανάληψη ↗</button></div>}
      {loading&&<div className={styles.loading} role="status"><span className={styles.loadingPulse}/>Εξετάζουμε τις πηγές και το ταξιδιωτικό σου προφίλ…</div>}
      {!loading&&cases.length>0&&<>
        <div className={styles.contentLayout}>
          <div className={styles.resultsRail} aria-label="Προτεινόμενα κρυμμένα μέρη">
            {cases.map((item,index)=><button key={item.place.id} type="button" onClick={()=>selectCase(item.place.id)}
              aria-pressed={selectedCase?.place.id===item.place.id} className={`${styles.placeRow} ${selectedCase?.place.id===item.place.id?styles.placeSelected:""}`}>
              <span className={styles.placeIndex}>{String(index+1).padStart(2,"0")}</span>
              <span className={styles.placeRowText}><small>{item.place.region_el??"Ελλάδα"} · {themeLabel(item.place.kind)}</small>
                <strong>{item.place.name_el}</strong><span>{item.place.hook_el??"Ένας διαφορετικός λόγος για ταξίδι."}</span></span>
              <span className={styles.placeScore}><b>{item.place.discoveryFitScore}</b><small>fit / 100</small></span>
            </button>)}
          </div>
          <div className={styles.featuredCase}>
            {selectedCase&&<>
              <div className={styles.caseEyebrow}><span className={styles.microLabel}>FIELD NOTE / {selectedCase.place.id.toUpperCase()}</span><span className={styles.sourceLabel}>● SOURCE-LED</span></div>
              <h3>{selectedCase.place.name_el}</h3>
              <p className={styles.caseHook}>{selectedCase.place.hook_el??"Μια εμπειρία έξω από τα συνηθισμένα."}</p>
              <div className={styles.caseMeta}><span>{selectedCase.place.region_el}</span><span>✦</span><span>{themeLabel(selectedCase.place.kind)}</span><span>✦</span><span>{selectedCase.place.discoveryFitScore}/100 προφίλ</span></div>
              <div className={styles.caseReason}><span className={styles.microLabel}>WHY IT MATTERS</span><p>{selectedCase.place.scoreExplanation[0]}. {selectedCase.place.scoreExplanation[1]}. Δεν μετράμε την αξία αυτού του τόπου από τη δημοφιλία του.</p></div>
              <div className={styles.realityCheck}><span className={styles.microLabel}>THE REALITY CHECK</span><p>{selectedCase.place.access_el??"Η τοπική πρόσβαση, ο καιρός και οι συνθήκες πρέπει να επιβεβαιωθούν πριν την αναχώρηση."}</p></div>
              <div className={styles.caseActions}>
                <button type="button" onClick={()=>{setMode(mode==="details"?"explore":"details");document.getElementById("stay-area")?.scrollIntoView({behavior:"smooth",block:"start"});}} className={styles.primaryAction}>Σχεδίασε {durationLabel(journey.nights)} <span>↗</span></button>
                <a href={`/guides/hidden-greece/${selectedCase.place.id}`}>Ο πλήρης οδηγός ↗</a>
                {safeSource(selectedCase.place.source_url)&&<a href={safeSource(selectedCase.place.source_url)!} target="_blank" rel="noopener noreferrer">Δες την πηγή ↗</a>}
              </div>
            </>}
          </div>
        </div>

        {selectedCase?.plan&&<section className={styles.itinerarySection} aria-label="Ενδεικτικό πρόγραμμα ταξιδιού">
          <div className={styles.itineraryHeading}><div><span className={styles.microLabel}>04 — THE JOURNEY IN DETAIL</span><h2>Το ταξίδι σου,<br/><em>μέρα με τη μέρα.</em></h2></div>
            <p>{selectedCase.place.name_el} · {durationLabel(selectedCase.plan.nights)} · {selectedCase.plan.days.length} ημέρες</p></div>
          <div className={styles.dayRail}>{selectedCase.plan.days.map(day=><article key={day.day} className={styles.dayCard}>
            <span className={styles.dayNumber}>{String(day.day).padStart(2,"0")}</span>
            <div className={styles.dayCardBody}><small>{day.focus}</small><h3>{day.heading}</h3>
              <ol>{day.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>
            </div></article>)}</div>
          <p className={styles.planDisclaimer}>{selectedCase.plan.disclaimer}</p>
        </section>}
        <div id="stay-area" className={styles.stayArea}>
          <div className={styles.stayIntro}><div><span className={styles.microLabel}>05 — WHERE THE JOURNEY COMES TOGETHER</span><h2>Ένα μέρος.<br/><em>Μια ολόκληρη απόδραση.</em></h2></div>
            <p>{selectedCase?.place.name_el} — οι πιθανές βάσεις διαμονής αποτυπώνονται πάνω στον χάρτη. Κανένα κατάλυμα δεν εμφανίζεται ως διαθέσιμο χωρίς έλεγχο ημερομηνιών.</p></div>
          <div className={styles.mapAndStays}>
            <MapCanvas active={selectedCase}/>
            <div className={styles.staysPanel}>
              <div className={styles.panelTop}><div><span className={styles.microLabel}>YOUR STAY BASES</span><h3>Πού αξίζει να μείνεις;</h3></div><span>{selectedCase?.stays.length??0} επιλογές</span></div>
              {selectedCase?.stays.length?selectedCase.stays.map((stay,i)=><article className={styles.stayCard} key={stay.stayId}>
                <div className={styles.stayNumber}>{String(i+1).padStart(2,"0")}</div>
                <div className={styles.stayCardBody}>{safeHotelImage(stay.imageUrl)&&<img className={styles.hotelPhoto} src={safeHotelImage(stay.imageUrl)!} alt={`Φωτογραφία καταλύματος: ${stay.propertyName}, από τον πάροχο`} width={440} height={300} loading="lazy" decoding="async" referrerPolicy="no-referrer"/>}<strong>{stay.propertyName}</strong><span>{stay.address??"Ακριβής διεύθυνση υπό επιβεβαίωση"}</span><div className={styles.stayTags}><small>{stay.distanceKmStraightLine} χλμ. σε ευθεία</small><small>Διαθεσιμότητα άγνωστη</small></div>
                  {stay.currency&&stay.observedOfferPrice!=null&&<p className={styles.feedPrice}>Παρατηρούμενη τιμή feed: {stay.observedOfferPrice.toLocaleString("el-GR")} {stay.currency} · όχι επιβεβαιωμένη τιμή ταξιδιού</p>}
                  {stay.affiliateUrl?<a className={styles.stayLink} href={stay.affiliateUrl} target="_blank" rel="sponsored noopener noreferrer">Έλεγξε την προσφορά στον συνεργάτη ↗</a>:<p className={styles.stayDisabled}>Σύνδεσμος κράτησης: εκκρεμεί εμπορική επαλήθευση.</p>}
                </div>
              </article>):<div className={styles.noStays}><strong>Δεν βρέθηκε κατάλληλη επαληθεύσιμη βάση.</strong><p>Μπορείς να ανακαλύψεις το μέρος, αλλά δεν θα σου προτείνουμε άσχετο κατάλυμα για να συμπληρώσουμε την οθόνη. Δοκίμασε άλλη διάρκεια ή ημερομηνίες.</p></div>}
              <p className={styles.stayCaveat}>Οι αποστάσεις είναι σε ευθεία, όχι χρόνοι οδήγησης. Η ποιότητα, η πρόσβαση από δρόμο, η διαθεσιμότητα και η τελική τιμή χρειάζονται ανεξάρτητη επιβεβαίωση.</p>
            </div>
          </div>
        </div>
        <div className={styles.storyEnd}><span>HIDDEN GREECE / BUILT FOR CURIOSITY</span><p>Δεν πουλάμε τον προορισμό.<br/><em>Αποκαλύπτουμε τον λόγο να πας.</em></p><a href="#discover">Ανακάλυψε κάτι ακόμη ↗</a></div>
      </>}
    </section>
  </main>;
}
