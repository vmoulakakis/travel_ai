import { V31PageFrame } from "@/components/v31-site-shell";

type Lang="el"|"en";
const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;

export function V31NativeHome({lang="el"}:{lang?:Lang}){
 const prefix=lang==="en"?"/en":"";
 const destinations=lang==="el"?"/proorismoi":"/en/destinations";
 return <V31PageFrame lang={lang}>
  <section className="wf-hero">
   <div className="wf-shell wf-hero__frame">
    <div className="wf-hero__visual" aria-hidden="true"/>
    <div className="wf-hero__content">
     <div className="wf-hero__copy">
      <span className="wf-kicker">AI TRAVEL INTELLIGENCE · GREECE</span>
      <h1 className="wf-display">{say(lang,"Η Ελλάδα δεν χρειάζεται άλλη μία λίστα.","Greece does not need another list.")}</h1>
      <p className="wf-lead">{say(lang,"Χρειάζεται τη σωστή επιλογή για εσένα — με βάση εποχή, παρέα, budget, ρυθμό, πρόσβαση και πραγματικά travel signals.","It needs the right choice for you — based on season, company, budget, pace, access and real travel signals.")}</p>
     </div>
     <div className="wf-prompt">
      <span className="wf-kicker">{say(lang,"Πες μου πώς θέλεις να νιώθεις","Tell me how you want to feel")}</span>
      <div className="wf-prompt__field">{say(lang,"π.χ. 4 μέρες τον Σεπτέμβριο, ζευγάρι, θάλασσα, καλό φαγητό και χωρίς πολύ κόσμο","e.g. 4 days in September, couple, sea, great food and fewer crowds")}</div>
      <div className="wf-chip-row">
       {[
        say(lang,"Θάλασσα","Sea"),say(lang,"Ζευγάρι","Couple"),say(lang,"Οικογένεια","Family"),say(lang,"Φαγητό","Food"),say(lang,"Φύση","Nature"),say(lang,"Πολιτισμός","Culture")
       ].map(item=><span className="wf-chip" key={item}>{item}</span>)}
      </div>
      <a className="wf-btn wf-btn--primary" href={`${prefix}/ai-planner`}>{say(lang,"Βρες τον προορισμό μου →","Find my destination →")}</a>
     </div>
    </div>
   </div>
  </section>

  <section className="wf-section wf-section--tight">
   <div className="wf-shell">
    <div className="wf-map-preview">
     <aside className="wf-rank-list">
      <span className="wf-kicker">{say(lang,"Σήμερα στην Ελλάδα","Today in Greece")}</span>
      <h2 className="wf-h3">Daily AI ranking</h2>
      {[
       ["01",say(lang,"Νάξος","Naxos"),say(lang,"Ισορροπία παραλίας, φαγητού και ρυθμού","Strong balance of beach, food and pace"),"92"],
       ["02",say(lang,"Χανιά","Chania"),say(lang,"Πόλη, παραλίες και μεγάλη εποχική ευελιξία","City, beaches and a long usable season"),"90"],
       ["03",say(lang,"Μήλος","Milos"),say(lang,"Ζευγάρι, τοπίο και πιο ήρεμο shoulder season","Couples, scenery and quieter shoulder season"),"88"]
      ].map(([rank,name,note,score])=><a className="wf-rank" href={`${prefix}/ai-map`} key={rank}><span className="wf-rank__n">{rank}</span><span><strong>{name}</strong><br/><small>{note}</small></span><span className="wf-rank__score">{score}</span></a>)}
      <a className="wf-btn wf-btn--primary" href={`${prefix}/ai-map`}>{say(lang,"Άνοιξε τον AI Χάρτη","Open AI Map")}</a>
     </aside>
     <a className="wf-map-canvas wf-map-canvas--preview" href={`${prefix}/ai-map`} aria-label={say(lang,"Άνοιξε τον διαδραστικό AI χάρτη","Open the interactive AI map")}>
      <span className="wf-map-island wf-map-island--1">92</span><span className="wf-map-island wf-map-island--2">90</span><span className="wf-map-island wf-map-island--3">88</span><strong>{say(lang,"Ζωντανός χάρτης κατάταξης →","Live ranking map →")}</strong>
     </a>
    </div>
   </div>
  </section>

  <section className="wf-section">
   <div className="wf-shell">
    <span className="wf-kicker">Explore by feeling</span>
    <h2 className="wf-h2">{say(lang,"Τι θέλεις να σου δώσει αυτό το ταξίδι;","What do you want this trip to give you?")}</h2>
    <div className="wf-grid-3 wf-space-top">
     <a className="wf-destination-card wf-feel-restore" href={`${destinations}?mood=restore`}><div className="wf-destination-card__content"><span className="wf-destination-card__meta">RESTORE</span><h3 className="wf-h3">{say(lang,"Να ξεκουραστώ πραγματικά","To truly recharge")}</h3></div></a>
     <a className="wf-destination-card wf-feel-food" href={`${destinations}?mood=food`}><div className="wf-destination-card__content"><span className="wf-destination-card__meta">FOOD + PLACE</span><h3 className="wf-h3">{say(lang,"Να φάω καλά και να νιώσω τον τόπο","To eat well and feel the place")}</h3></div></a>
     <a className="wf-destination-card wf-feel-discover" href={`${destinations}?mood=discover`}><div className="wf-destination-card__content"><span className="wf-destination-card__meta">DISCOVER</span><h3 className="wf-h3">{say(lang,"Να βρω κάτι που δεν είναι το προφανές","To find something less obvious")}</h3></div></a>
    </div>
   </div>
  </section>

  <section className="wf-section wf-paper-section">
   <div className="wf-shell">
    <span className="wf-kicker">COMPARE, DON&apos;T SCROLL</span>
    <h2 className="wf-h2">{say(lang,"Νάξος, Μήλος ή Χανιά;","Naxos, Milos or Chania?")}</h2>
    <p className="wf-lead">{say(lang,"Μία απόφαση είναι πιο χρήσιμη από δώδεκα tabs.","One decision is more useful than twelve tabs.")}</p>
    <div className="wf-compare wf-space-top">
     <div className="wf-compare__cell"><strong>{say(lang,"Νάξος","Naxos")}</strong><p className="wf-body">{say(lang,"Ισχυρή ισορροπία για παραλία, φαγητό, οικογένεια και value.","Strong balance for beach, food, family and value.")}</p></div>
     <div className="wf-compare__cell"><strong>{say(lang,"Μήλος","Milos")}</strong><p className="wf-body">{say(lang,"Πιο εικονική και ρομαντική, με μεγαλύτερη εποχική ευαισθησία.","More iconic and romantic, with stronger seasonal sensitivity.")}</p></div>
     <div className="wf-compare__cell"><strong>{say(lang,"Χανιά","Chania")}</strong><p className="wf-body">{say(lang,"Πόλη + φύση + φαγητό με μεγαλύτερη διάρκεια σεζόν.","City + nature + food with a longer season.")}</p></div>
    </div>
    <a className="wf-btn wf-btn--secondary wf-space-top-sm" href={`${prefix}/ai-planner`}>{say(lang,"Σύγκρινέ τα για το δικό μου ταξίδι","Compare them for my trip")}</a>
   </div>
  </section>

  <section className="wf-section">
   <div className="wf-shell wf-trust">
    <div><span className="wf-kicker">TRUST LAYER</span><h2 className="wf-h2">{say(lang,"Το AI δεν αποφασίζει “στο περίπου”.","The AI does not decide by guesswork.")}</h2><p className="wf-lead">{say(lang,"Κάθε πρόταση περνά από location truth, intent, season, route, stay evidence και έλεγχο συνέπειας.","Every recommendation passes location truth, intent, season, route, stay evidence and consistency checks.")}</p></div>
    <div className="wf-trust__list">
     <div className="wf-trust__item"><strong>01 · Location truth</strong><p className="wf-body">{say(lang,"Αν επιλέξεις Νάξο, δεν θα σου επιστρέψει άλλη πόλη επειδή σκοράρει καλύτερα.","If you select Naxos, it will not return another city just because it scores higher.")}</p></div>
     <div className="wf-trust__item"><strong>02 · Evidence before confidence</strong><p className="wf-body">{say(lang,"Ratings, review counts και rankings εμφανίζονται μόνο όταν υπάρχουν από την πηγή.","Ratings, review counts and rankings appear only when returned by the source.")}</p></div>
     <div className="wf-trust__item"><strong>03 · Affiliate-independent ranking</strong><p className="wf-body">{say(lang,"Η εμπορική προμήθεια δεν καθορίζει ποιος προορισμός προτείνεται.","Commercial commission never decides which destination is recommended.")}</p></div>
    </div>
   </div>
  </section>

  <section className="wf-section"><div className="wf-shell wf-card wf-card--dark wf-final-cta"><span className="wf-kicker wf-kicker--light">YOUR GREECE, DECIDED</span><h2 className="wf-h2">{say(lang,"Πες μας τι χρειάζεσαι. Το AI θα κάνει τη δύσκολη σύγκριση.","Tell us what you need. The AI will do the hard comparison.")}</h2><div><a className="wf-btn wf-btn--secondary" href={`${prefix}/ai-planner`}>{say(lang,"Ξεκίνα με AI","Start with AI")}</a></div></div></section>
 </V31PageFrame>
}
