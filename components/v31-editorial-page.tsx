import { V31PageFrame } from "@/components/v31-site-shell";

type Lang="el"|"en";type Kind="seasonal"|"guides"|"how-ai-works";
const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;

export function V31EditorialPage({lang="el",kind}:{lang?:Lang;kind:Kind}){
 const prefix=lang==="en"?"/en":"";
 const config={
  seasonal:{kicker:"SEASONAL INTELLIGENCE",title:say(lang,"Η σωστή Ελλάδα αλλάζει με τον μήνα.","The right Greece changes with the month."),lead:say(lang,"Δεν υπάρχει “καλύτερο νησί” για όλο τον χρόνο. Ο AI engine σταθμίζει εποχή, θερμοκρασία, crowd pressure, πρόσβαση και πραγματικό inventory.","There is no single best island all year. The AI engine weighs season, temperature, crowd pressure, access and real inventory."),cards:[
   [say(lang,"Άνοιξη","Spring"),say(lang,"Πόλεις, Πελοπόννησος, Κρήτη και φύση πριν την κορύφωση της ζέστης.","Cities, Peloponnese, Crete and nature before peak heat.")],
   [say(lang,"Καλοκαίρι","Summer"),say(lang,"Νησιά και ακτές με έλεγχο crowd/value trade-offs και μεταφορικής πίεσης.","Islands and coasts with crowd/value and transport trade-offs checked.")],
   [say(lang,"Φθινόπωρο","Autumn"),say(lang,"Shoulder season, ζεστή θάλασσα και προορισμοί με μεγαλύτερη διάρκεια σεζόν.","Shoulder season, warm sea and destinations with longer operating seasons.")],
  ]},
  guides:{kicker:"DECISION GUIDES",title:say(lang,"Οδηγοί που βοηθούν να αποφασίσεις, όχι να χαθείς.","Guides that help you decide, not scroll forever."),lead:say(lang,"Σύγκρινε προορισμούς με πραγματικά trade-offs: διάρκεια, πρόσβαση, budget, crowd level, ρυθμό και εποχικό fit.","Compare destinations through real trade-offs: duration, access, budget, crowd level, pace and seasonal fit."),cards:[
   [say(lang,"Νησί ή ηπειρωτική Ελλάδα;","Island or mainland Greece?"),say(lang,"Πότε αξίζει το ferry/flight effort και πότε κερδίζει η ευκολότερη πρόσβαση.","When ferry/flight effort is worth it and when easier access wins.")],
   [say(lang,"3, 5 ή 7 νύχτες;","3, 5 or 7 nights?"),say(lang,"Η διάρκεια αλλάζει ποιοι προορισμοί έχουν νόημα — δεν είναι απλή λεπτομέρεια.","Trip length changes which destinations make sense — it is not a minor detail.")],
   [say(lang,"Budget χωρίς ψευδή ακρίβεια","Budget without false precision"),say(lang,"Ο engine χρησιμοποιεί cost tiers και verified stay evidence αντί να υποσχεθεί τιμές που δεν έχει επαληθεύσει.","The engine uses cost tiers and verified stay evidence instead of promising unverified prices.")],
  ]},
  "how-ai-works":{kicker:"TRUST ARCHITECTURE",title:say(lang,"Πώς αποφασίζει το AI — και πού σταματά να μαντεύει.","How the AI decides — and where it stops guessing."),lead:say(lang,"Το σύστημα είναι agentic, αλλά τα κρίσιμα constraints είναι deterministic και fail-closed. Τα μοντέλα δεν μπορούν να παρακάμψουν geography truth ή να επινοήσουν review evidence.","The system is agentic, but critical constraints are deterministic and fail-closed. Models cannot override geography truth or invent review evidence."),cards:[
   ["01 · Location truth",say(lang,"Επιλεγμένη πόλη/περιοχή γίνεται hard scope πριν από ranking.","A selected city/region becomes hard scope before ranking.")],
   ["02 · Evidence before confidence",say(lang,"Tripadvisor/Booking ratings εμφανίζονται μόνο όταν επιστρέφονται από live source adapters.","Tripadvisor/Booking ratings appear only when returned by live source adapters.")],
   ["03 · Independent ranking",say(lang,"Affiliate EPC ή commission δεν συμμετέχουν στο destination score.","Affiliate EPC or commission never enters the destination score.")],
   ["04 · Skeptical audit",say(lang,"Οι προτάσεις περνούν verifier, result auditor και council πριν γίνουν δημόσιο αποτέλεσμα.","Recommendations pass a verifier, result auditor and council before becoming a public result.")],
  ]}
 }[kind];
 return <V31PageFrame lang={lang}>
  <section className="wf-section wf-editorial-hero"><div className="wf-shell"><span className="wf-kicker">{config.kicker}</span><h1 className="wf-h2">{config.title}</h1><p className="wf-lead">{config.lead}</p></div></section>
  <section className="wf-section wf-section--tight"><div className="wf-shell"><div className="wf-editorial-grid">{config.cards.map(([title,text],index)=><article className="wf-card wf-editorial-card" key={title}><span className="wf-kicker">{String(index+1).padStart(2,"0")}</span><h2 className="wf-h3">{title}</h2><p className="wf-body">{text}</p></article>)}</div><div className="wf-editorial-cta wf-card wf-card--dark"><span className="wf-kicker wf-kicker--light">AI DECISION MODE</span><h2 className="wf-h3">{say(lang,"Έχεις πραγματικό ταξίδι στο μυαλό σου;","Have a real trip in mind?")}</h2><p className="wf-body wf-footer-copy">{say(lang,"Δώσε ημερομηνίες, budget, παρέα και τοποθεσία — και άφησε τον engine να συγκρίνει.","Give dates, budget, travellers and location — then let the engine compare.")}</p><a className="wf-btn wf-btn--secondary" href={`${prefix}/ai-planner`}>{say(lang,"Άνοιξε τον AI Σύμβουλο","Open AI Planner")}</a></div></div></section>
 </V31PageFrame>
}
