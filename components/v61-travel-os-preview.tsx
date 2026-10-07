"use client";

import { useMemo, useState } from "react";
import { Brain, CalendarBlank, Compass, DownloadSimple, MapPin, Sparkle, Star, SunHorizon } from "@phosphor-icons/react";
import styles from "./v61-travel-os-preview.module.css";

type Mode = "now" | "weekend" | "hidden" | "quiet";
type Place = { name:string; micro:string; score:number; x:number; y:number; reason:string; season:string; friction:string; crowd:string; tag:string };

const places: Place[] = [
  { name:"Zagori", micro:"Dilofo + Vradeto", score:96, x:31, y:22, reason:"Autumn colour, stone villages and excellent fit for a quiet 3-day reset.", season:"Excellent now", friction:"4h 45m road", crowd:"Low", tag:"AI BEST" },
  { name:"Tzoumerka", micro:"Syrrako + Kalarrytes", score:93, x:39, y:37, reason:"High landscape drama with stronger hidden-gem value than the obvious mountain choices.", season:"Very good", friction:"5h road", crowd:"Very low", tag:"HIDDEN" },
  { name:"Pelion", micro:"Tsagarada + Damouchari", score:91, x:55, y:43, reason:"Sea + forest with short-break practicality and strong food density.", season:"Excellent", friction:"3h 40m road", crowd:"Medium-low", tag:"BALANCED" },
  { name:"Monemvasia", micro:"Kastania + Gerakas", score:88, x:58, y:72, reason:"Romantic visual impact, shoulder-season comfort and a premium-stay story.", season:"Excellent", friction:"4h road", crowd:"Medium", tag:"ROMANTIC" },
  { name:"Nafplio", micro:"Kandia + Vivari", score:84, x:49, y:68, reason:"Lower travel friction with nearby microplaces that avoid a generic city-break.", season:"Very good", friction:"2h road", crowd:"Medium", tag:"EASY" }
];

const hours = (value:string) => Number.parseFloat(value);

export function V61TravelOSPreview() {
  const [mode,setMode] = useState<Mode>("now");
  const [active,setActive] = useState(0);
  const ranked = useMemo(() => {
    const copy = [...places];
    if (mode === "hidden") copy.sort((a,b) => Number(b.crowd === "Very low") - Number(a.crowd === "Very low"));
    if (mode === "quiet") copy.sort((a,b) => Number(b.crowd.includes("low")) - Number(a.crowd.includes("low")));
    if (mode === "weekend") copy.sort((a,b) => hours(a.friction) - hours(b.friction));
    return copy;
  }, [mode]);
  const hero = ranked[Math.min(active, ranked.length - 1)] ?? ranked[0];

  return <main className={styles.shell}>
    <header className={styles.topbar}>
      <a href="/" className={styles.brand}><span>✦</span><div><b>TravelAI Greece</b><small>Agentic Travel OS · V61</small></div></a>
      <nav><a href="/proorismoi">Destinations</a><a href="/blog">Travel intelligence</a><a href="/en">EN</a></nav>
      <button className={styles.install}><DownloadSimple size={18}/> Install</button>
    </header>

    <section className={styles.hero}>
      <div className={styles.copy}>
        <div className={styles.kicker}><Sparkle weight="fill"/> 1,700+ places · one decision</div>
        <h1>Tell me how you want Greece to <em>feel.</em></h1>
        <p>TravelAI combines dates, holidays, season, travel friction, crowd tolerance, budget and hidden microplaces — then shows only the trips that survive reality.</p>
        <div className={styles.prompt}>
          <Brain size={23}/>
          <input aria-label="Trip brief" defaultValue="3 days from Athens, quiet, great food, dramatic nature, no tourist crowds"/>
          <button>Find my Greece <span>↗</span></button>
        </div>
        <div className={styles.modeRow}>
          <button onClick={() => {setMode("now");setActive(0)}} className={mode==="now"?styles.activeMode:""}><SunHorizon size={16}/>Best now</button>
          <button onClick={() => {setMode("weekend");setActive(0)}} className={mode==="weekend"?styles.activeMode:""}><CalendarBlank size={16}/>Easy weekend</button>
          <button onClick={() => {setMode("hidden");setActive(0)}} className={mode==="hidden"?styles.activeMode:""}><Compass size={16}/>Hidden Greece</button>
          <button onClick={() => {setMode("quiet");setActive(0)}} className={mode==="quiet"?styles.activeMode:""}><Sparkle size={16}/>Low crowd</button>
        </div>
      </div>
      <aside className={styles.agentCard}>
        <small>LIVE DECISION TRACE</small>
        <div><CalendarBlank/><p><b>Calendar</b><span>Public holidays + seasonal opportunity windows</span></p></div>
        <div><Compass/><p><b>Spatial</b><span>Origin-aware road / ferry / flight friction</span></p></div>
        <div><Brain/><p><b>Semantic fit</b><span>Intent matched against destination + microplace graph</span></p></div>
        <div><Star/><p><b>Skeptical audit</b><span>Weak recommendations rejected before reveal</span></p></div>
      </aside>
    </section>

    <section className={styles.workbench}>
      <div className={styles.map}>
        <div className={styles.mapLabel}><MapPin/> Living intelligence map <span>satellite + terrain + stays</span></div>
        <div className={styles.coast}/>
        {ranked.map((p,i) => <button key={p.name} className={styles.pin+" "+(i===active?styles.pinActive:"")} style={{left:p.x+"%",top:p.y+"%"}} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} aria-label={p.name}><span>★</span><small>#{i+1}</small></button>)}
        <div className={styles.mapCard}>
          <span className={styles.tag}>{hero.tag}</span>
          <h2>{hero.name}</h2>
          <b>{hero.micro}</b>
          <p>{hero.reason}</p>
          <div className={styles.metrics}><span><strong>{hero.score}%</strong> fit</span><span><strong>{hero.season}</strong> season</span><span><strong>{hero.crowd}</strong> crowd</span><span><strong>{hero.friction}</strong> friction</span></div>
          <button>Inspect this trip ↗</button>
        </div>
      </div>

      <aside className={styles.ranking}>
        <div className={styles.rankingHead}><div><small>AI SHORTLIST</small><h2>Only the strongest 3</h2></div><span>Explainable</span></div>
        {ranked.slice(0,3).map((p,i) => <button key={p.name} className={i===active?styles.activeCard:""} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)}>
          <span className={styles.rank}>0{i+1}</span>
          <div><b>{p.name}</b><small>{p.micro}</small><p>{p.reason}</p></div>
          <strong>{p.score}</strong>
        </button>)}
        <div className={styles.infographic}>
          <small>WHY THIS CHANGED THE RANKING</small>
          <div><span>Seasonality</span><i className={styles.w91}/></div>
          <div><span>Intent fit</span><i className={styles.w96}/></div>
          <div><span>Travel friction</span><i className={styles.w74}/></div>
          <div><span>Hidden-value</span><i className={styles.w88}/></div>
        </div>
      </aside>
    </section>
  </main>;
}