import type { ReactNode } from "react";

type Lang="el"|"en";
const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;

function NavLinks({lang,mobile=false}:{lang:Lang;mobile?:boolean}){
 const prefix=lang==="en"?"/en":"",destinations=lang==="en"?"/en/destinations":"/proorismoi";
 return <nav className={mobile?"wf-mobile-menu__links":"wf-nav__links"} aria-label={say(lang,"Κύρια πλοήγηση","Main navigation")}>
  <a href={`${prefix}/ai-planner`}>{say(lang,"AI Σύμβουλος","AI Planner")}</a>
  <a href={`${prefix}/stays-map`}>{say(lang,"Χάρτης Διαμονών","Stay Map")}</a>
  <a href={`${prefix}/ai-map`}>{say(lang,"AI Χάρτης","AI Map")}</a>
  <a href={destinations}>{say(lang,"Προορισμοί","Destinations")}</a>
  <a href={`${prefix}/seasonal`}>{say(lang,"Ανά εποχή","Seasonal")}</a>
  <a href={`${prefix}/guides`}>{say(lang,"Οδηγοί","Guides")}</a>
  <a href={`${prefix}/how-ai-works`}>{say(lang,"Πώς δουλεύει","How AI works")}</a>
 </nav>
}

export function V31Nav({lang="el"}:{lang?:Lang}){
 const prefix=lang==="en"?"/en":"";
 return <header className="wf-nav">
  <div className="wf-shell wf-nav__inner">
   <a className="wf-brand" href={prefix||"/"}><span className="wf-brand__mark">A</span><span>AI Greece Travel</span></a>
   <NavLinks lang={lang}/>
   <div className="wf-nav__actions">
    <details className="wf-mobile-menu"><summary aria-label={say(lang,"Άνοιγμα μενού","Open menu")}><span></span><span></span><span></span></summary><div className="wf-mobile-menu__panel"><NavLinks lang={lang} mobile/></div></details>
    <a className="wf-btn wf-btn--secondary wf-locale" href={lang==="el"?"/en":"/"}>{lang==="el"?"EN":"EL"}</a>
   </div>
  </div>
 </header>
}

export function V31Footer({lang="el"}:{lang?:Lang}){
 const prefix=lang==="en"?"/en":"";
 return <footer className="wf-footer"><div className="wf-shell wf-footer__grid">
  <div><div className="wf-brand"><span className="wf-brand__mark">A</span><span>AI Greece Travel</span></div><p className="wf-body wf-footer-copy">{say(lang,"AI travel decision support για την Ελλάδα, με πραγματικούς χάρτες προϊόντων, διαφανή evidence και location truth.","AI travel decision support for Greece with real product maps, transparent evidence and location truth.")}</p></div>
  <div><strong>Plan</strong><br/><a href={`${prefix}/ai-planner`}>{say(lang,"AI Σύμβουλος","AI Planner")}</a><br/><a href={`${prefix}/stays-map`}>{say(lang,"Χάρτης Διαμονών","Stay Map")}</a></div>
  <div><strong>Explore</strong><br/><a href={`${prefix}/ai-map`}>{say(lang,"AI Χάρτης","AI Map")}</a><br/><a href={lang==="en"?"/en/destinations":"/proorismoi"}>{say(lang,"Προορισμοί","Destinations")}</a><br/><a href={`${prefix}/seasonal`}>{say(lang,"Ανά εποχή","Seasonal")}</a></div>
  <div><strong>Trust</strong><br/><a href={`${prefix}/how-ai-works`}>{say(lang,"Πώς δουλεύει","How it works")}</a><br/><a href={`${prefix}/guides`}>{say(lang,"Οδηγοί","Guides")}</a></div>
 </div></footer>
}

export function V31PageFrame({lang="el",children}:{lang?:Lang;children:ReactNode}){
 return <main className="wf-v31" data-locale={lang}><V31Nav lang={lang}/>{children}<V31Footer lang={lang}/></main>
}
