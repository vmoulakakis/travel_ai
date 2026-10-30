export type HiddenMood="nature"|"quiet"|"adventure"|"culture"|"romantic"|"family";
export type InterpretedNeed={mood:HiddenMood|null;nights:number|null;summary:string;confidence:"high"|"medium"|"low";mode:"rules"|"model"};
function normalizeGreek(input:string):string{
 return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ς/g,"σ");
}
const patterns:{mood:HiddenMood;words:string[]}[]=[
 {mood:"family",words:["παιδ","οικογεν","family","kids","child"]},
 {mood:"quiet",words:["ησυχ","ξεκουρα","αποφορτι","ηρεμ","χαλαρω","χωρις πολυκοσμ","μοναξ","quiet","silence","peace","digital detox"]},
 {mood:"nature",words:["φυσ","βουν","καταρρακ","νερα","δασ","λιμν","θαλασσ","μονοπατ","nature","forest","waterfall","landscape"]},
 {mood:"adventure",words:["περιπετ","πεζοπορ","ανακαλυψ","ανεξερευ","ορειβ","hiking","adventure","explor"]},
 {mood:"culture",words:["παραδοσ","ιστορι","χωρι","πολιτισ","μουσει","culture","village","heritage"]},
 {mood:"romantic",words:["ρομαντ","ζευγαρ","ερωτευ","δυο μασ","romantic","couple"]},
];
export function interpretHiddenNeedLocally(raw:string):InterpretedNeed{
 const text=raw.trim().slice(0,320),clean=normalizeGreek(text);
 const hits=patterns.map(({mood,words})=>({mood,points:words.reduce((score,w)=>score+(clean.includes(w)?1:0),0)}))
  .filter(x=>x.points>0).sort((a,b)=>b.points-a.points);
 let nights:number|null=null;
 if(/(μια|1|ένα|ενα)\s*(νυχτ|νυκτ|βραδ|night)/.test(clean))nights=1;
 else if(/(διημερ|σαββατοκυριακ|σ\/κ|weekend|2\s*night)/.test(clean))nights=2;
 else if(/(τριημερ|3\s*νυχτ|3\s*night)/.test(clean))nights=3;
 else if(/(εβδομαδ|7\s*νυχτ|7\s*night|week\b)/.test(clean))nights=7;
 else {
  const explicit=/\b([1-7])\s*(?:νυχτ|νυκτ|διανυκτερευ|nights?)\b/.exec(clean);
  if(explicit)nights=Number(explicit[1]);
 }
 const dominant=hits[0]?.mood??null;
 const confidence=hits.length===1&&nights!==null?"high":hits.length>=1?"medium":"low";
 return{mood:dominant,nights,summary:text,confidence,mode:"rules"};
}
