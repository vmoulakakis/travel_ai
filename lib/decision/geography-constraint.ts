import type { V8Destination } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const hardWords=new Set(["μονο","αποκλειστικα","οπωσδηποτε","απαραιτητα","only","exclusively","must","mono"]);
export const GREEK_ISLAND_SLUGS=new Set(["aegina","agios-nikolaos","alonissos","amorgos","chania","corfu","evia","hydra","karpathos","kefalonia","kos","lefkada","milos","naxos","paros","paxos","rethymno","rhodes","samothrace","santorini","skiathos","skopelos","symi","syros","tinos","zakynthos"]);
export const GREEK_MOUNTAIN_SLUGS=new Set(["arachova","karpenisi","zagori","meteora","pelion"]);
const westernSlugs=new Set(["corfu","paxos","lefkada","kefalonia","zakynthos","ioannina","zagori","parga","nafpaktos","patras","olympia"]);

type GeoPoint={nameEl:string;nameEn:string;latitude:number;longitude:number};
export type GeographyConstraint={
  id:string;
  labelEl:string;
  labelEn:string;
  allowedRegions?:ReadonlySet<string>;
  allowedSlugs?:ReadonlySet<string>;
  requiredSlugs?:ReadonlySet<string>;
  requiredTags?:ReadonlySet<string>;
  requiredSeasonProfiles?:ReadonlySet<string>;
  proximityCenters?:readonly GeoPoint[];
  maxDistanceKm?:number;
  geography?:"island"|"mainland";
};
type Rule={id:string;el:string;en:string;phrases:string[];regions?:string[];slugs?:ReadonlySet<string>};

const rules:Rule[]=[
 {id:"western-greece",el:"Δυτική Ελλάδα",en:"Western Greece",phrases:["δυτικη ελλαδα","δυτικα της ελλαδας","western greece","west greece","dytiki ellada","ditiki ellada"],regions:["ionian","epirus"],slugs:westernSlugs},
 {id:"crete",el:"Κρήτη",en:"Crete",phrases:["κρητη","crete","kriti","krhth"],regions:["crete"]},
 {id:"peloponnese",el:"Πελοπόννησος",en:"Peloponnese",phrases:["πελοποννησο","πελοποννησος","peloponnese"],regions:["peloponnese"]},
 {id:"ionian",el:"Ιόνιο",en:"Ionian",phrases:["ιονιο","ιονια νησια","ionian"],regions:["ionian"]},
 {id:"epirus",el:"Ήπειρος",en:"Epirus",phrases:["ηπειρο","ηπειρος","epirus"],regions:["epirus"]},
 {id:"cyclades",el:"Κυκλάδες",en:"Cyclades",phrases:["κυκλαδες","cyclades","kyklades","kiklades"],regions:["cyclades"]},
 {id:"dodecanese",el:"Δωδεκάνησα",en:"Dodecanese",phrases:["δωδεκανησα","dodecanese"],regions:["dodecanese"]},
 {id:"sporades",el:"Σποράδες",en:"Sporades",phrases:["σποραδες","sporades"],regions:["sporades"]},
 {id:"northern-greece",el:"Βόρεια Ελλάδα",en:"Northern Greece",phrases:["βορεια ελλαδα","βορεια της ελλαδας","northern greece","north greece"],regions:["macedonia","epirus","thessaly","north-aegean"]},
 {id:"macedonia",el:"Μακεδονία",en:"Macedonia",phrases:["μακεδονια","macedonia"],regions:["macedonia"]},
 {id:"thrace",el:"Θράκη",en:"Thrace",phrases:["θρακη","thrace"],regions:["thrace"],slugs:new Set(["samothrace"])},
 {id:"central-greece",el:"Στερεά Ελλάδα",en:"Central Greece",phrases:["στερεα ελλαδα","κεντρικη ελλαδα","central greece"],regions:["central-greece"]},
];
const anchors=[
 {aliases:["λαρισα","λαρισας","larissa"],nameEl:"Λάρισα",nameEn:"Larissa",latitude:39.639,longitude:22.419},
 {aliases:["βολο","βολος","βολου","volos"],nameEl:"Βόλος",nameEn:"Volos",latitude:39.362,longitude:22.943},
 {aliases:["αθηνα","αθηνας","athens"],nameEl:"Αθήνα",nameEn:"Athens",latitude:37.984,longitude:23.728},
 {aliases:["θεσσαλονικη","θεσσαλονικης","thessaloniki"],nameEl:"Θεσσαλονίκη",nameEn:"Thessaloniki",latitude:40.640,longitude:22.944},
 {aliases:["πατρα","πατρας","patras"],nameEl:"Πάτρα",nameEn:"Patras",latitude:38.246,longitude:21.735},
] as const;

const radians=(value:number)=>value*Math.PI/180;
function distanceKm(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const lat=radians(b.latitude-a.latitude),lon=radians(b.longitude-a.longitude),x=Math.sin(lat/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(lon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function includesAny(text:string,phrases:string[]){return phrases.some(phrase=>text.includes(phrase))}
function joinLabel(parts:string[],fallback:string){return parts.filter(Boolean).join(" · ")||fallback}

export function geographyConstraint(request:TripRequest,catalog:readonly V8Destination[]=[]):GeographyConstraint|null{
 const text=norm(request.tripText??"");
 if(!text)return null;
 const tokens=new Set(text.split(" ").filter(Boolean));
 const negatedExclusivity=includesAny(text,["δεν θελω μονο","δεν ζηταω μονο","δεν επιμενω μονο","not only","den thelo mono","den zitao mono"]);
 const notOnlyIslands=includesAny(text,["οχι μονο νησι","οχι μονο νησια","δεν θελω μονο νησι","δεν θελω μονο νησια","δεν ζηταω μονο νησι","δεν ζηταω μονο νησια","not only island","not only islands","oxi mono nisi","den thelo mono nisi"]);
 const hard=!negatedExclusivity&&!notOnlyIslands&&[...hardWords].some(marker=>tokens.has(marker));
 const mainland=!notOnlyIslands&&includesAny(text,["οχι νησι","οχι νησια","χωρις νησι","χωρις νησια","δεν θελω νησι","δεν θελω νησια","αποφυγη νησι","αποφυγη νησιων","mainland only","no island","no islands","avoid island","avoid islands","not an island","xoris nisi","xwris nisi","oxi nisi","den thelo nisi"]);
 const island=!notOnlyIslands&&includesAny(text,["μονο νησι","μονο νησια","θελω νησι","θελω νησια","island only","islands only","only island","only islands","want an island","mono nisi","thelo nisi mono","thelo nisi"]);
 const near=includesAny(text,["κοντα","γυρω απο","near "])||text.startsWith("near");
 const centers=near?anchors.filter(anchor=>anchor.aliases.some(alias=>text.includes(alias))):[];
 const coastal=includesAny(text,["παραθαλασ","διπλα στη θαλασσα","κοντα στη θαλασσα","seaside","coastal"]);
 const mountain=includesAny(text,["βουνο","ορειν","mountain"]);
 const rule=rules.find(item=>item.phrases.some(phrase=>text.includes(phrase)));
 const ruleActive=Boolean(rule&&(hard||mainland||island));
 const destination=catalog.find(item=>[item.slug,item.nameEl,item.nameEn,...item.aliases].some(alias=>{const value=norm(alias);return value.length>=3&&(text===value||text.startsWith(`${value} `)||text.endsWith(` ${value}`)||text.includes(` ${value} `));}));
 const destinationActive=Boolean(destination&&hard);
 const contextualHard=hard||mainland||island||centers.length>0||ruleActive||destinationActive;
 const coastalActive=coastal&&contextualHard;
 const mountainActive=mountain&&contextualHard;
 if(!contextualHard&&!coastalActive&&!mountainActive)return null;

 const ids:string[]=[];
 const el:string[]=[];
 const en:string[]=[];
 if(destinationActive&&destination){ids.push(`destination-${destination.slug}`);el.push(`μόνο ${destination.nameEl}`);en.push(`${destination.nameEn} only`)}
 else if(ruleActive&&rule){ids.push(rule.id);el.push(`μόνο ${rule.el}`);en.push(`${rule.en} only`)}
 if(centers.length){ids.push(`near-${centers.map(center=>center.nameEn.toLowerCase()).join("-")}`);el.push(`κοντά σε ${centers.map(center=>center.nameEl).join(" / ")}`);en.push(`near ${centers.map(center=>center.nameEn).join(" / ")}`)}
 if(mainland){ids.push("mainland-only");el.push("χωρίς νησί");en.push("mainland only")}
 else if(island){ids.push("island-only");el.push("μόνο νησί");en.push("island only")}
 if(coastalActive){ids.push("coastal");el.push("παραθαλάσσια");en.push("seaside")}
 if(mountainActive){ids.push("mountain");el.push("βουνό");en.push("mountain")}

 return{
  id:ids.join("+")||"explicit-geography",
  labelEl:joinLabel(el,"ρητός γεωγραφικός περιορισμός"),
  labelEn:joinLabel(en,"explicit geography constraint"),
  ...(destinationActive&&destination?{allowedSlugs:new Set([destination.slug])}:ruleActive&&rule?.slugs?{allowedSlugs:rule.slugs}:{}),
  ...(ruleActive&&rule?.regions?{allowedRegions:new Set(rule.regions)}:{}),
  ...(mountainActive?{requiredSlugs:GREEK_MOUNTAIN_SLUGS}:{}),
  ...(coastalActive?{requiredTags:new Set(["beach"])}:{}),
  ...(centers.length?{proximityCenters:centers,maxDistanceKm:100}:{}),
  ...((mainland||mountainActive)?{geography:"mainland" as const}:island?{geography:"island" as const}:{}),
 };
}

export function matchesGeographyConstraint(destination:V8Destination,constraint:GeographyConstraint|null){
 if(!constraint)return true;
 if(destination.countryCode!=="GR")return false;
 if(constraint.geography==="island"&&!GREEK_ISLAND_SLUGS.has(destination.slug))return false;
 if(constraint.geography==="mainland"&&GREEK_ISLAND_SLUGS.has(destination.slug))return false;
 if(constraint.proximityCenters&&!constraint.proximityCenters.some(center=>distanceKm(center,destination)<=Number(constraint.maxDistanceKm??100)))return false;
 if(constraint.requiredTags&&![...constraint.requiredTags].every(tag=>destination.tags.includes(tag as never)))return false;
 if(constraint.requiredSeasonProfiles&&!constraint.requiredSeasonProfiles.has(destination.seasonProfile))return false;
 if(constraint.requiredSlugs&&!constraint.requiredSlugs.has(destination.slug))return false;
 if(constraint.allowedRegions||constraint.allowedSlugs){
  const inScope=Boolean(constraint.allowedRegions?.has(destination.regionGroup)||constraint.allowedSlugs?.has(destination.slug));
  if(!inScope)return false;
 }
 return true;
}
