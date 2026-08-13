import type { V8Destination } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const hardWords=new Set(["μονο","αποκλειστικα","θελω","ζηταω","only","exclusively","want"]);
export const GREEK_ISLAND_SLUGS=new Set(["aegina","agios-nikolaos","alonissos","amorgos","chania","corfu","evia","hydra","karpathos","kefalonia","kos","milos","naxos","paros","paxos","rethymno","rhodes","samothrace","santorini","skiathos","skopelos","symi","syros","tinos","zakynthos"]);
const westernSlugs=new Set(["corfu","paxos","lefkada","kefalonia","zakynthos","ioannina","zagori","parga","nafpaktos","patras","olympia"]);
export type GeographyConstraint={id:string;labelEl:string;labelEn:string;allowedRegions?:ReadonlySet<string>;allowedSlugs?:ReadonlySet<string>;geography?:"island"|"mainland"};
type Rule={id:string;el:string;en:string;phrases:string[];regions?:string[];slugs?:ReadonlySet<string>};
const rules:Rule[]=[
 {id:"western-greece",el:"μόνο Δυτική Ελλάδα",en:"Western Greece only",phrases:["δυτικη ελλαδα","δυτικα της ελλαδας","western greece","west greece"],regions:["ionian","epirus"],slugs:westernSlugs},
 {id:"crete",el:"μόνο Κρήτη",en:"Crete only",phrases:["κρητη","crete"],regions:["crete"]},{id:"peloponnese",el:"μόνο Πελοπόννησος",en:"Peloponnese only",phrases:["πελοποννησο","πελοποννησος","peloponnese"],regions:["peloponnese"]},
 {id:"ionian",el:"μόνο Ιόνιο",en:"Ionian only",phrases:["ιονιο","ιονια νησια","ionian"],regions:["ionian"]},{id:"epirus",el:"μόνο Ήπειρος",en:"Epirus only",phrases:["ηπειρο","ηπειρος","epirus"],regions:["epirus"]},
 {id:"cyclades",el:"μόνο Κυκλάδες",en:"Cyclades only",phrases:["κυκλαδες","cyclades"],regions:["cyclades"]},{id:"dodecanese",el:"μόνο Δωδεκάνησα",en:"Dodecanese only",phrases:["δωδεκανησα","dodecanese"],regions:["dodecanese"]},
 {id:"sporades",el:"μόνο Σποράδες",en:"Sporades only",phrases:["σποραδες","sporades"],regions:["sporades"]},{id:"northern-greece",el:"μόνο Βόρεια Ελλάδα",en:"Northern Greece only",phrases:["βορεια ελλαδα","βορεια της ελλαδας","northern greece","north greece"],regions:["macedonia","epirus","thessaly","north-aegean"]},
 {id:"macedonia",el:"μόνο Μακεδονία",en:"Macedonia only",phrases:["μακεδονια","macedonia"],regions:["macedonia"]},
 {id:"thrace",el:"μόνο Θράκη",en:"Thrace only",phrases:["θρακη","thrace"],regions:["thrace"],slugs:new Set(["samothrace"])},
 {id:"central-greece",el:"μόνο Στερεά Ελλάδα",en:"Central Greece only",phrases:["στερεα ελλαδα","κεντρικη ελλαδα","central greece"],regions:["central-greece"]},
];
export function geographyConstraint(request:TripRequest):GeographyConstraint|null{
 const text=norm(request.tripText??""),tokens=new Set(text.split(" ").filter(Boolean)),negatedOnly=text.includes("δεν θελω μονο")||text.includes("δεν ζηταω μονο")||text.includes("not only"),hard=!negatedOnly&&[...hardWords].some(marker=>tokens.has(marker));
 const mainland=text.includes("οχι νησι")||text.includes("χωρις νησι")||text.includes("ηπειρωτικη ελλαδα")||text.includes("mainland only")||text.includes("no island");if(mainland)return{id:"mainland-only",labelEl:"χωρίς νησί",labelEn:"mainland only",geography:"mainland"};
 const notOnlyIslands=text.includes("οχι μονο νησι")||text.includes("not only island"),island=!notOnlyIslands&&(text.includes("μονο νησι")||text.includes("θελω νησι")||text.includes("island only")||text.includes("only island"));if(island)return{id:"island-only",labelEl:"μόνο νησί",labelEn:"island only",geography:"island"};
 if(!hard)return null;const rule=rules.find(item=>item.phrases.some(phrase=>text.includes(phrase)));if(!rule)return null;
 return{id:rule.id,labelEl:rule.el,labelEn:rule.en,...(rule.regions?{allowedRegions:new Set(rule.regions)}:{}),...(rule.slugs?{allowedSlugs:rule.slugs}:{})};
}
export function matchesGeographyConstraint(destination:V8Destination,constraint:GeographyConstraint|null){if(!constraint)return true;if(destination.countryCode!=="GR")return false;if(constraint.geography==="island"&&!GREEK_ISLAND_SLUGS.has(destination.slug))return false;if(constraint.geography==="mainland"&&GREEK_ISLAND_SLUGS.has(destination.slug))return false;if(constraint.allowedRegions||constraint.allowedSlugs)return Boolean(constraint.allowedRegions?.has(destination.regionGroup)||constraint.allowedSlugs?.has(destination.slug));return true}
