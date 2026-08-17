import { detectUnsupportedDestinationCountry,geographyConstraint,type GeographyConstraint } from "@/lib/decision/geography-constraint";
import type { V8Destination } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").replace(/\s+/g," ").trim();
const V30_ISLAND_SLUGS=new Set(["aegina","agios-nikolaos","alonissos","amorgos","andros","astypalaia","chania","chios","corfu","evia","hydra","karpathos","kefalonia","kos","lefkada","milos","mykonos","naxos","paros","paxos","rethymno","rhodes","samothrace","santorini","skiathos","skopelos","symi","syros","thasos","tinos","zakynthos"]);
const destinationWords=["διακοπες","ταξιδι","προορισμο","vacation","holiday","trip","visit","stay","παω","πάω","θελω","thelo","want","to","in","στη","στην","στο","σε","για","προς"];

type CanonicalTarget={destination:V8Destination;identity:string};
export interface LocationScopeV30{
  id:string;
  labelEl:string;
  labelEn:string;
  source:"selected"|"explicit-text"|"foreign-out-of-scope"|"geography"|"structured-island";
  selectedSlugs?:ReadonlySet<string>;
  base?:GeographyConstraint|null;
  outsideCountry?:string|null;
}

function variants(raw:string){
 const base=norm(raw),out=new Set<string>();if(!base)return out;out.add(base);
 for(const token of base.split(" ")){
  if(/[α-ω]ος$/.test(token))out.add(base.replace(new RegExp(`${token}$`),token.slice(0,-1)));
  if(/[α-ω]ης$/.test(token))out.add(base.replace(new RegExp(`${token}$`),token.slice(0,-1)));
 }
 return out;
}
function identities(destination:V8Destination){const out=new Set<string>();for(const raw of [destination.slug,destination.nameEl,destination.nameEn,...destination.aliases])for(const value of variants(raw))if(value.length>=2)out.add(value);return[...out]}
function phraseIndex(text:string,phrase:string){if(text===phrase||text.startsWith(`${phrase} `))return 0;const middle=text.indexOf(` ${phrase} `);if(middle>=0)return middle+1;if(text.endsWith(` ${phrase}`))return text.length-phrase.length;return-1}
function contains(text:string,phrase:string){return phraseIndex(text,phrase)>=0}
function originMention(text:string,identity:string){return contains(text,`from ${identity}`)||contains(text,`απο ${identity}`)||contains(text,`apo ${identity}`)}
function proximityMention(text:string,identity:string){return contains(text,`near ${identity}`)||contains(text,`close to ${identity}`)||contains(text,`κοντα ${identity}`)||text.includes(`κοντα στη ${identity}`)||text.includes(`κοντα στην ${identity}`)||text.includes(`κοντα στο ${identity}`)||text.includes(`κοντα σε ${identity}`)}
function excludedMention(text:string,identity:string){return contains(text,`not ${identity}`)||contains(text,`avoid ${identity}`)||contains(text,`except ${identity}`)||contains(text,`οχι ${identity}`)||contains(text,`εκτος ${identity}`)||contains(text,`αποφυγη ${identity}`)}
function comparisonMention(text:string,identity:string){return contains(text,`like ${identity}`)||contains(text,`similar to ${identity}`)||contains(text,`σαν ${identity}`)}
function destinationContext(text:string,identity:string){
 if(text.split(" ").length<=5)return true;
 if([`to ${identity}`,`in ${identity}`,`visit ${identity}`,`stay in ${identity}`,`στη ${identity}`,`στην ${identity}`,`στο ${identity}`,`σε ${identity}`,`για ${identity}`,`προς ${identity}`,`θελω ${identity}`,`thelo ${identity}`].some(phrase=>contains(text,phrase)))return true;
 return destinationWords.some(word=>contains(text,word))&&contains(text,identity);
}
function selectedTarget(request:TripRequest,catalog:readonly V8Destination[]):V8Destination|null|false{
 const selected=norm(request.consideredDestination??"");if(!selected)return null;
 return catalog.find(destination=>identities(destination).includes(selected))??false;
}
function explicitTargets(text:string,catalog:readonly V8Destination[]){
 const targets=new Map<string,CanonicalTarget>();
 for(const destination of catalog){for(const identity of identities(destination)){
  if(!contains(text,identity)||originMention(text,identity)||proximityMention(text,identity)||excludedMention(text,identity)||comparisonMention(text,identity)||!destinationContext(text,identity))continue;
  const current=targets.get(destination.slug);if(!current||identity.length>current.identity.length)targets.set(destination.slug,{destination,identity});
 }}
 return[...targets.values()].map(item=>item.destination);
}
function baseMatches(destination:V8Destination,constraint:GeographyConstraint|null){
 if(!constraint)return true;
 if(destination.countryCode!=="GR")return false;
 if(constraint.excludedSlugs?.has(destination.slug))return false;
 if(constraint.geography==="island"&&!V30_ISLAND_SLUGS.has(destination.slug))return false;
 if(constraint.geography==="mainland"&&V30_ISLAND_SLUGS.has(destination.slug))return false;
 if(constraint.proximityCenters){const rad=(value:number)=>value*Math.PI/180,dist=(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number})=>{const lat=rad(b.latitude-a.latitude),lon=rad(b.longitude-a.longitude),x=Math.sin(lat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(lon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))};if(!constraint.proximityCenters.some(center=>dist(center,destination)<=Number(constraint.maxDistanceKm??100)))return false;}
 if(constraint.requiredTags&&![...constraint.requiredTags].every(tag=>destination.tags.includes(tag as never)))return false;
 if(constraint.requiredSeasonProfiles&&!constraint.requiredSeasonProfiles.has(destination.seasonProfile))return false;
 if(constraint.requiredSlugs&&!constraint.requiredSlugs.has(destination.slug))return false;
 if(constraint.allowedRegions||constraint.allowedSlugs){const inScope=Boolean(constraint.allowedRegions?.has(destination.regionGroup)||constraint.allowedSlugs?.has(destination.slug));if(!inScope)return false;}
 return true;
}

export function resolveLocationScopeV30(request:TripRequest,catalog:readonly V8Destination[]):LocationScopeV30|null{
 const selected=selectedTarget(request,catalog);
 if(selected===false)return{id:"selected-unresolved",labelEl:"ο επιλεγμένος προορισμός δεν αναγνωρίστηκε",labelEn:"selected destination was not recognized",source:"selected",selectedSlugs:new Set()};
 if(selected)return{id:`selected-${selected.slug}`,labelEl:`μόνο ${selected.nameEl}`,labelEn:`${selected.nameEn} only`,source:"selected",selectedSlugs:new Set([selected.slug])};
 const text=norm(request.tripText??""),outside=detectUnsupportedDestinationCountry(text);
 if(outside)return{id:`outside-greece-${norm(outside).replace(/ /g,"-")}`,labelEl:`εκτός Ελλάδας: ${outside}`,labelEn:`outside Greece: ${outside}`,source:"foreign-out-of-scope",selectedSlugs:new Set(),outsideCountry:outside};
 const targets=text?explicitTargets(text,catalog):[];
 const base=geographyConstraint(request,catalog);
 if(targets.length)return{id:`explicit-${targets.map(item=>item.slug).sort().join("-")}`,labelEl:`ρητός προορισμός: ${targets.map(item=>item.nameEl).join(" / ")}`,labelEn:`explicit destination: ${targets.map(item=>item.nameEn).join(" / ")}`,source:"explicit-text",selectedSlugs:new Set(targets.map(item=>item.slug)),base};
 if(base)return{id:`geo-${base.id}`,labelEl:base.labelEl,labelEn:base.labelEn,source:"geography",base};
 if(request.distancePreference==="island")return{id:"structured-island",labelEl:"μόνο νησιωτικός προορισμός",labelEn:"island destinations only",source:"structured-island",base:{id:"structured-island",labelEl:"μόνο νησιωτικός προορισμός",labelEn:"island destinations only",geography:"island"}};
 return null;
}

export function matchesLocationScopeV30(destination:V8Destination,scope:LocationScopeV30|null){
 if(!scope)return destination.countryCode==="GR";
 if(destination.countryCode!=="GR")return false;
 if(scope.selectedSlugs&&!scope.selectedSlugs.has(destination.slug))return false;
 return baseMatches(destination,scope.base??null);
}

export function locationScopeAuditV30(scope:LocationScopeV30|null){return scope?{id:scope.id,source:scope.source,labelEl:scope.labelEl,labelEn:scope.labelEn,outsideCountry:scope.outsideCountry??null}:null}
