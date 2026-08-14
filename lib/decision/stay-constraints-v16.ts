import type { StayConstraintKind, StayConstraintSpec, V8StayOffer } from "@/lib/decision/v8-types";

const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const cleanHtml=(value:string)=>value.replace(/<[^>]*>/g," ").replace(/&[a-z]+;/gi," ").replace(/\s+/g," ").trim();
const unique=<T,>(values:T[])=>[...new Set(values)];

const exclusive=/(?:\bμονο\b|\bαποκλειστικ|\bοπωσδηποτε\b|\bmust\b|\bonly\b|\bstrictly\b|\bmono\b|\bapokleistik)/i;
const stayNoun=/(?:καταλυμ|ξενοδοχει|δωματι|διαμον|hotel|stay|room|katalym|xenodox|diamoni)/i;

const patterns:Record<StayConstraintKind,RegExp[]>={
 BEACHFRONT:[/beachfront/i,/sea[ -]?front/i,/on the beach/i,/directly on the beach/i,/μπροστα.{0,30}(?:θαλασσ|παραλι)/i,/πανω.{0,30}(?:θαλασσ|παραλι)/i,/ακριβως.{0,30}παραλι/i,/παραθαλασσι(?:ο|α|ες)/i,/mprosta.{0,30}(?:thalass|parali)/i,/pano.{0,30}(?:thalass|parali)/i,/parathalassi/i],
 NEAR_BEACH:[/διπλα.{0,30}(?:θαλασσ|παραλι)/i,/κοντα.{0,30}παραλι/i,/walking distance.{0,30}(?:beach|sea)/i,/near (?:the )?beach/i,/close to (?:the )?beach/i,/dipla.{0,30}(?:thalass|parali)/i,/konta.{0,30}parali/i],
 SEA_VIEW:[/sea view/i,/ocean view/i,/θεα.{0,20}θαλασσ/i,/θαλασσ.{0,20}θεα/i,/thea.{0,20}thalass/i],
 POOL:[/\bpool\b/i,/πισιν/i,/pisin/i],
 PARKING:[/\bparking\b/i,/παρκιν/i,/parking/i],
 EV_CHARGING:[/(?:ev|electric).{0,20}(?:charg|φορτι)/i,/φορτιστ.{0,20}(?:ηλεκτρ|ev)/i,/fortist.{0,20}(?:ilektr|ev)/i],
 BREAKFAST:[/breakfast/i,/πρωιν/i,/proin/i],
 PET_FRIENDLY:[/pet[ -]?friendly/i,/κατοικιδ/i,/pet allowed/i,/katoikid/i],
 FAMILY_ROOM:[/family room/i,/family rooms/i,/οικογενειακ.{0,20}δωματι/i,/oikogeneiak.{0,20}domati/i],
 ADULTS_ONLY:[/adults?[ -]?only/i,/μονο.{0,15}ενηλικ/i,/mono.{0,15}enilik/i],
};

function mentions(kind:StayConstraintKind,text:string){return patterns[kind].some(pattern=>pattern.test(text));}
function hasScopedExclusivity(text:string,kind:StayConstraintKind){
 if(!exclusive.test(text))return false;
 if(stayNoun.test(text)&&mentions(kind,text))return true;
 const n=norm(text),terms:Record<StayConstraintKind,string[]>={
  BEACHFRONT:["beachfront","sea front","θαλασσ","παραλι","thalass","parali"],NEAR_BEACH:["παραλι","θαλασσ","beach","parali","thalass"],SEA_VIEW:["sea view","θεα","thea"],POOL:["pool","πισιν","pisin"],PARKING:["parking","παρκιν"],EV_CHARGING:["φορτι","charg","forti"],BREAKFAST:["breakfast","πρωιν","proin"],PET_FRIENDLY:["pet","κατοικιδ","katoikid"],FAMILY_ROOM:["family room","οικογενειακ","oikogeneiak"],ADULTS_ONLY:["adults only","ενηλικ","enilik"]};
 const ex=[...n.matchAll(/\b(?:μονο|only|mono|αποκλειστικ\w*|apokleistik\w*|οπωσδηποτε|must)\b/g)].map(match=>match.index??0);
 const hits=terms[kind].flatMap(term=>{const rows:number[]=[];let from=0;for(;;){const at=n.indexOf(term,from);if(at<0)break;rows.push(at);from=at+term.length;}return rows;});
 return ex.some(a=>hits.some(b=>Math.abs(a-b)<=90));
}

export function parseStayConstraintsV16(raw:string|undefined|null):StayConstraintSpec{
 const text=norm(raw??"");
 if(!text)return{hard:[],soft:[],confidence:"HIGH",source:"deterministic",needsSemanticAssist:false};
 const hard:StayConstraintKind[]=[],soft:StayConstraintKind[]=[];
 for(const kind of Object.keys(patterns) as StayConstraintKind[]){
  if(!mentions(kind,text))continue;
  if(hasScopedExclusivity(text,kind))hard.push(kind);else soft.push(kind);
 }
 // “μπροστά/πάνω στη θάλασσα” is a physical stay requirement even when the user
 // omits the word “μόνο”; if “μόνο” is present it is always a hard gate.
 if(mentions("BEACHFRONT",text)&&!hard.includes("BEACHFRONT")&&!soft.includes("BEACHFRONT"))soft.push("BEACHFRONT");
 const ambiguousStayLanguage=stayNoun.test(text)&&/(θελω|want|χρειαζ|prepei|πρεπει|na einai|να ειναι)/i.test(text)&&hard.length===0&&soft.length===0;
 const multipleClauses=(text.match(/(?:,| και | αλλα | χωρις | με | but | and | without )/g)??[]).length>=3;
 return{hard:unique(hard),soft:unique(soft.filter(kind=>!hard.includes(kind))),confidence:(ambiguousStayLanguage||multipleClauses)?"MEDIUM":"HIGH",source:"deterministic",needsSemanticAssist:ambiguousStayLanguage||multipleClauses};
}

function rawText(offer:V8StayOffer){
 const raw=offer.raw&&typeof offer.raw==="object"?offer.raw:{};
 const fields=[offer.propertyName,offer.description,offer.city,offer.address,typeof raw.details==="string"?raw.details:"",typeof raw.product_name==="string"?raw.product_name:"",typeof raw.extra_title==="string"?raw.extra_title:"",typeof raw.type==="string"?raw.type:""];
 return norm(cleanHtml(fields.filter(Boolean).join(" ")));
}

function explicitBeachDistanceMeters(text:string){
 const patterns=[/(\d{1,4})\s*(?:m|meters?|metres?|μετρ(?:α|ων)?)\s*(?:from|απο)?\s*(?:the )?(?:beach|παραλι)/i,/(?:beach|παραλι).{0,25}?(\d{1,4})\s*(?:m|meters?|metres?|μετρ(?:α|ων)?)/i];
 for(const pattern of patterns){const match=text.match(pattern);if(match){const n=Number(match[1]);if(Number.isFinite(n))return n;}}
 return null;
}

function evidenceFor(kind:StayConstraintKind,offer:V8StayOffer){
 const text=rawText(offer),distance=explicitBeachDistanceMeters(text);
 switch(kind){
  case"BEACHFRONT":{
   const strong=/(?:\bbeachfront\b|\bsea[ -]?front\b|\bon the beach\b|\bdirectly on the beach\b|μπροστα.{0,35}(?:θαλασσ|παραλι)|πανω.{0,35}(?:θαλασσ|παραλι)|ακριβως.{0,35}παραλι|παραθαλασσι(?:ο|α|ες))/i.test(text);
   return strong?"explicit beachfront/seafront wording":null;
  }
  case"NEAR_BEACH":return distance!=null&&distance<=500?`${distance}m stated beach distance`:/(?:walking distance.{0,30}(?:beach|sea)|near (?:the )?beach|close to (?:the )?beach|διπλα.{0,30}(?:θαλασσ|παραλι)|κοντα.{0,30}παραλι)/i.test(text)?"explicit near-beach wording":null;
  case"SEA_VIEW":return /(?:sea view|ocean view|θεα.{0,20}θαλασσ|θαλασσ.{0,20}θεα)/i.test(text)?"explicit sea-view wording":null;
  case"POOL":return /(?:\bpool\b|πισιν)/i.test(text)?"pool stated":null;
  case"PARKING":return /(?:\bparking\b|παρκιν)/i.test(text)?"parking stated":null;
  case"EV_CHARGING":return /(?:(?:ev|electric).{0,20}(?:charg|φορτι)|φορτιστ.{0,20}(?:ηλεκτρ|ev))/i.test(text)?"EV charging stated":null;
  case"BREAKFAST":return /(?:breakfast|πρωιν)/i.test(text)?"breakfast stated":null;
  case"PET_FRIENDLY":return /(?:pet[ -]?friendly|pet allowed|κατοικιδ)/i.test(text)?"pet-friendly stated":null;
  case"FAMILY_ROOM":return /(?:family rooms?|οικογενειακ.{0,20}δωματι)/i.test(text)?"family room stated":null;
  case"ADULTS_ONLY":return /(?:adults?[ -]?only|μονο.{0,15}ενηλικ)/i.test(text)?"adults-only stated":null;
 }
}

export function evaluateStayOfferV16(offer:V8StayOffer,spec:StayConstraintSpec){
 const evidence=Object.fromEntries([...spec.hard,...spec.soft].map(kind=>[kind,evidenceFor(kind,offer)])) as Partial<Record<StayConstraintKind,string|null>>;
 const hardFailures=spec.hard.filter(kind=>!evidence[kind]);
 const softMatches=spec.soft.filter(kind=>Boolean(evidence[kind]));
 return{passed:hardFailures.length===0,hardFailures,evidence,softMatches};
}

export function filterStayOffersV16(offers:readonly V8StayOffer[],spec:StayConstraintSpec){
 return offers.map(offer=>({offer,evaluation:evaluateStayOfferV16(offer,spec)})).filter(row=>row.evaluation.passed);
}

export function hasHardStayConstraintsV16(spec:StayConstraintSpec){return spec.hard.length>0;}
