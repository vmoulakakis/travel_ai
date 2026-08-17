import type { ReactNode } from "react";

type Lang="el"|"en";

const say=(lang:Lang,el:string,en:string)=>lang==="el"?el:en;

export function V31Nav({lang="el"}:{lang?:Lang}){
 const prefix=lang==="en"?"/en":"";
 return <header className="wf-nav">
  <div className="wf-shell wf-nav__inner">
   <a className="wf-brand" href={prefix||"/"}><span className="wf-brand__mark">A</span><span>AI Greece Travel</span></a>
   <nav className="wf-nav__links" aria-label={say(lang,"Κύρια πλοήγηση","Main navigation")}>
    <a href={`${prefix}/ai-planner`}>{say(lang,"AI Σύμβουλος","AI Planner")}</a>
    <a href={`${prefix}/ai-map`}>{say(lang,"AI Χάρτης","AI Map")}</a>
    <a href={lang==="en"?"/en/destinations":"/proorismoi"}>{say(lang,"Προορισμοί","Destinations")}</a>
    <a href={`${prefix}/seasonal`}>{say(lang,"Ανά εποχή","Seasonal")}</a>
    <a href={`${prefix}/guides`}>{say(lang,"Οδηγοί","Guides")}</a>
    <a href={`${prefix}/how-ai-works`}>{say(lang,"Πώς δουλεύει","How AI works")}</a>
   </nav>
   <a className="wf-btn wf-btn--secondary" href={lang==="el"?"/en":"/"}>{lang==="el"?"EN":"EL"}</a>
  </div>
 </header>
}

export function V31Footer({lang="el"}:{lang?:Lang}){
 const prefix=lang==="en"?"/en":"";
 return <footer className="wf-footer"><div className="wf-shell wf-footer__grid">
  <div><div className="wf-brand"><span className="wf-brand__mark">A</span><span>AI Greece Travel</span></div><p className="wf-body wf-footer-copy">{say(lang,"AI travel decision support για την Ελλάδα, με διαφάνεια στις πηγές, στα constraints και στον τρόπο κατάταξης.","AI travel decision support for Greece, with transparent sources, constraints and ranking logic.")}</p></div>
  <div><strong>Plan</strong><br/><a href={`${prefix}/ai-planner`}>{say(lang,"AI Σύμβουλος","AI Planner")}</a><br/><a href={`${prefix}/ai-map`}>{say(lang,"AI Χάρτης","AI Map")}</a></div>
  <div><strong>Explore</strong><br/><a href={lang==="en"?"/en/destinations":"/proorismoi"}>{say(lang,"Προορισμοί","Destinations")}</a><br/><a href={`${prefix}/seasonal`}>{say(lang,"Ανά εποχή","Seasonal")}</a></div>
  <div><strong>Trust</strong><br/><a href={`${prefix}/how-ai-works`}>{say(lang,"Πώς δουλεύει","How it works")}</a><br/><a href={`${prefix}/guides`}>{say(lang,"Οδηγοί","Guides")}</a></div>
 </div></footer>
}

export function V31PageFrame({lang="el",children}:{lang?:Lang;children:ReactNode}){
 return <main className="wf-v31" data-locale={lang}><V31Nav lang={lang}/>{children}<V31Footer lang={lang}/></main>
}
