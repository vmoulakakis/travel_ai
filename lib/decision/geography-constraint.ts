import type { V8Destination } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").replace(/\s+/g," ").trim();
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
  excludedSlugs?:ReadonlySet<string>;
  requiredSlugs?:ReadonlySet<string>;
  requiredTags?:ReadonlySet<string>;
  requiredSeasonProfiles?:ReadonlySet<string>;
  proximityCenters?:readonly GeoPoint[];
  maxDistanceKm?:number;
  geography?:"island"|"mainland";
};
type Rule={id:string;el:string;en:string;phrases:string[];regions?:string[];slugs?:ReadonlySet<string>};
type ForeignScope={label:string;aliases:string[]};

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
const foreignScopes:ForeignScope[]=[
 {label:"Italy",aliases:["italy","italia","ιταλια","rome","roma","ρωμη","milan","milano","μιλανο","venice","venezia","βενετια"]},
 {label:"Spain",aliases:["spain","ισπανια","barcelona","βαρκελωνη","madrid","μαδριτη"]},
 {label:"France",aliases:["france","γαλλια","paris","παρισι","nice france","νικαια γαλλια"]},
 {label:"Portugal",aliases:["portugal","πορτογαλια","lisbon","λισαβονα","porto"]},
 {label:"Turkey",aliases:["turkey","turkiye","τουρκια","istanbul","constantinople","κωνσταντινουπολη","antalya"]},
 {label:"Cyprus",aliases:["cyprus","κυπρος","nicosia","λευκωσια","limassol","λεμεσος"]},
 {label:"Albania",aliases:["albania","αλβανια","tirana","τιρανα"]},
 {label:"Bulgaria",aliases:["bulgaria","βουλγαρια","sofia","σοφια"]},
 {label:"Croatia",aliases:["croatia","κροατια","dubrovnik","ντουμπροβνικ","split croatia"]},
 {label:"Montenegro",aliases:["montenegro","μαυροβουνιο","kotor"]},
 {label:"Malta",aliases:["malta","μαλτα","valletta","βαλετα"]},
 {label:"United Kingdom",aliases:["united kingdom","uk","england","αγγλια","london","λονδινο"]},
 {label:"Germany",aliases:["germany","γερμανια","berlin","βερολινο","munich","μοναχο"]},
 {label:"Austria",aliases:["austria","αυστρια","vienna","βιεννη"]},
 {label:"Switzerland",aliases:["switzerland","ελβετια","zurich","ζυριχη","geneva","γενευη"]},
 {label:"Netherlands",aliases:["netherlands","holland","ολλανδια","amsterdam","αμστερνταμ"]},
 {label:"Romania",aliases:["romania","ρουμανια","bucharest","βουκουρεστι"]},
 {label:"Serbia",aliases:["serbia","σερβια","belgrade","βελιγραδι"]},
 {label:"North Macedonia",aliases:["north macedonia","skopje","σκοπια"]},
 {label:"Egypt",aliases:["egypt","αιγυπτος","cairo","καιρο"]},
 {label:"Morocco",aliases:["morocco","μαροκο","marrakech","μαρακες"]},
 {label:"United Arab Emirates",aliases:["united arab emirates","uae","dubai","ντουμπαι","abu dhabi"]},
 {label:"United States",aliases:["united states","usa","new york","νεα υορκη","los angeles"]},
];

const radians=(value:number)=>value*Math.PI/180;
function distanceKm(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const lat=radians(b.latitude-a.latitude),lon=radians(b.longitude-a.longitude),x=Math.sin(lat/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(lon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function phraseIndex(text:string,phrase:string){if(text===phrase)return 0;if(text.startsWith(`${phrase} `))return 0;const middle=text.indexOf(` ${phrase} `);if(middle>=0)return middle+1;if(text.endsWith(` ${phrase}`))return text.length-phrase.length;return-1}
function containsPhrase(text:string,phrase:string){return phraseIndex(text,phrase)>=0}
function includesAny(text:string,phrases:string[]){return phrases.some(phrase=>containsPhrase(text,norm(phrase))||text.includes(norm(phrase)))}
function joinLabel(parts:string[],fallback:string){return parts.filter(Boolean).join(" · ")||fallback}
function tokenCount(text:string){return text.split(" ").filter(Boolean).length}
function originLeadContains(text:string,alias:string){const index=phraseIndex(text,alias);if(index<0)return false;if(containsPhrase(text,`from ${alias}`)||containsPhrase(text,`απο ${alias}`)||containsPhrase(text,`apo ${alias}`))return true;if(!(text.startsWith("from ")||text.startsWith("απο ")||text.startsWith("apo ")))return false;const separators=[" to "," προς "," για "," want "," θελω "].map(separator=>text.indexOf(separator)).filter(value=>value>0);const cut=separators.length?Math.min(...separators):text.length;return index<cut}
function nearMention(text:string,alias:string){return ["near","κοντα","γυρω απο","close to"].some(prefix=>containsPhrase(text,`${prefix} ${alias}`)||text.includes(`${prefix} στη ${alias}`)||text.includes(`${prefix} στην ${alias}`)||text.includes(`${prefix} στο ${alias}`)||text.includes(`${prefix} σε ${alias}`))}
function negativeMention(text:string,alias:string){return ["οχι","εκτος","αποφυγη","not","except","avoid"].some(prefix=>containsPhrase(text,`${prefix} ${alias}`)||text.includes(`${prefix} τη ${alias}`)||text.includes(`${prefix} την ${alias}`)||text.includes(`${prefix} το ${alias}`))}
function comparisonMention(text:string,alias:string){return containsPhrase(text,`σαν ${alias}`)||containsPhrase(text,`like ${alias}`)||containsPhrase(text,`similar to ${alias}`)}
function destinationCue(text:string,alias:string){
 if(tokenCount(text)<=5)return true;
 const phrases=[`to ${alias}`,`in ${alias}`,`visit ${alias}`,`visit to ${alias}`,`go to ${alias}`,`stay in ${alias}`,`at ${alias}`,`σε ${alias}`,`στη ${alias}`,`στην ${alias}`,`στο ${alias}`,`προς ${alias}`,`για ${alias}`,`θελω ${alias}`,`thelo ${alias}`];
 if(phrases.some(phrase=>containsPhrase(text,phrase)))return true;
 return (includesAny(text,["διακοπες","ταξιδι","trip","vacation","holiday","προορισμο"])&&containsPhrase(text,alias));
}
function identities(destination:V8Destination){return[destination.slug,destination.nameEl,destination.nameEn,...destination.aliases].map(norm).filter(value=>value.length>=2)}
function selectedDestination(request:TripRequest,catalog:readonly V8Destination[]){const selected=norm(request.consideredDestination??"");if(!selected)return null;return catalog.find(destination=>identities(destination).some(identity=>identity===selected))??false}
function naturalDestinationTargets(text:string,catalog:readonly V8Destination[],hard:boolean){
 const targets=new Map<string,V8Destination>(),excluded=new Set<string>();
 for(const destination of catalog){
  const aliases=identities(destination);
  const mentions=aliases.filter(alias=>containsPhrase(text,alias));
  if(!mentions.length)continue;
  const negative=mentions.some(alias=>negativeMention(text,alias));
  if(negative){excluded.add(destination.slug);continue}
  const target=mentions.some(alias=>!originLeadContains(text,alias)&&!nearMention(text,alias)&&!comparisonMention(text,alias)&&(hard||destinationCue(text,alias)));
  if(target)targets.set(destination.slug,destination);
 }
 return{targets:[...targets.values()],excluded};
}
function activeRule(text:string,hard:boolean){
 for(const rule of rules){
  const phrase=rule.phrases.map(norm).find(item=>containsPhrase(text,item));if(!phrase)continue;
  if(negativeMention(text,phrase)||originLeadContains(text,phrase)||nearMention(text,phrase)||comparisonMention(text,phrase))continue;
  if(hard||destinationCue(text,phrase))return rule;
 }
 return null;
}

export function detectUnsupportedDestinationCountry(input:string|undefined|null){
 const text=norm(input??"");if(!text)return null;
 for(const scope of foreignScopes){for(const rawAlias of scope.aliases){const alias=norm(rawAlias);if(!containsPhrase(text,alias))continue;if(originLeadContains(text,alias)||comparisonMention(text,alias)||negativeMention(text,alias))continue;return scope.label;}}
 return null;
}

export function geographyConstraint(request:TripRequest,catalog:readonly V8Destination[]=[]):GeographyConstraint|null{
 const text=norm(request.tripText??"");
 const tokens=new Set(text.split(" ").filter(Boolean));
 const negatedExclusivity=includesAny(text,["δεν θελω μονο","δεν ζηταω μονο","δεν επιμενω μονο","not only","den thelo mono","den zitao mono"]);
 const notOnlyIslands=includesAny(text,["οχι μονο νησι","οχι μονο νησια","δεν θελω μονο νησι","δεν θελω μονο νησια","δεν ζηταω μονο νησι","δεν ζηταω μονο νησια","not only island","not only islands","oxi mono nisi","den thelo mono nisi"]);
 const hard=Boolean(text)&&!negatedExclusivity&&!notOnlyIslands&&[...hardWords].some(marker=>tokens.has(marker));
 const mainland=Boolean(text)&&!notOnlyIslands&&includesAny(text,["οχι νησι","οχι νησια","χωρις νησι","χωρις νησια","δεν θελω νησι","δεν θελω νησια","αποφυγη νησι","αποφυγη νησιων","mainland only","no island","no islands","avoid island","avoid islands","not an island","xoris nisi","xwris nisi","oxi nisi","den thelo nisi"]);
 const island=Boolean(text)&&!notOnlyIslands&&includesAny(text,["μονο νησι","μονο νησια","θελω νησι","θελω νησια","island only","islands only","only island","only islands","want an island","mono nisi","thelo nisi mono","thelo nisi"]);
 const near=Boolean(text)&&(includesAny(text,["κοντα","γυρω απο","near "])||text.startsWith("near"));
 const centers=near?anchors.filter(anchor=>anchor.aliases.some(alias=>containsPhrase(text,norm(alias)))):[];
 const coastal=Boolean(text)&&includesAny(text,["παραθαλασ","διπλα στη θαλασσα","κοντα στη θαλασσα","seaside","coastal"]);
 const mountain=Boolean(text)&&includesAny(text,["βουνο","ορειν","mountain"]);
 const selected=selectedDestination(request,catalog);
 const natural=selected===null?naturalDestinationTargets(text,catalog,hard):{targets:[] as V8Destination[],excluded:new Set<string>()};
 const rule=selected===null?activeRule(text,hard):null;
 const selectedActive=selected!==null;
 const naturalActive=natural.targets.length>0;
 const ruleActive=Boolean(rule);
 const contextualHard=selectedActive||hard||mainland||island||centers.length>0||naturalActive||ruleActive;
 const coastalActive=coastal&&contextualHard;
 const mountainActive=mountain&&contextualHard;
 if(!contextualHard&&!coastalActive&&!mountainActive&&natural.excluded.size===0)return null;

 const ids:string[]=[];
 const el:string[]=[];
 const en:string[]=[];
 let allowedSlugs:ReadonlySet<string>|undefined;
 let allowedRegions:ReadonlySet<string>|undefined;
 if(selectedActive){
  if(selected===false){allowedSlugs=new Set<string>();ids.push("selected-destination-unresolved");el.push("ο επιλεγμένος προορισμός δεν αναγνωρίστηκε");en.push("selected destination was not recognized");}
  else if(selected){allowedSlugs=new Set([selected.slug]);ids.push(`selected-${selected.slug}`);el.push(`προορισμός ${selected.nameEl}`);en.push(`destination ${selected.nameEn}`);}
 }else{
  if(naturalActive){allowedSlugs=new Set(natural.targets.map(destination=>destination.slug));ids.push(`destination-${natural.targets.map(destination=>destination.slug).sort().join("-")}`);el.push(`προορισμός ${natural.targets.map(destination=>destination.nameEl).join(" / ")}`);en.push(`destination ${natural.targets.map(destination=>destination.nameEn).join(" / ")}`);}
  if(ruleActive&&rule){allowedRegions=rule.regions?new Set(rule.regions):undefined;if(rule.slugs)allowedSlugs=new Set([...(allowedSlugs??[]),...rule.slugs]);ids.push(rule.id);el.push(rule.el);en.push(rule.en);}
 }
 if(centers.length){ids.push(`near-${centers.map(center=>center.nameEn.toLowerCase()).join("-")}`);el.push(`κοντά σε ${centers.map(center=>center.nameEl).join(" / ")}`);en.push(`near ${centers.map(center=>center.nameEn).join(" / ")}`)}
 if(mainland){ids.push("mainland-only");el.push("χωρίς νησί");en.push("mainland only")}
 else if(island){ids.push("island-only");el.push("μόνο νησί");en.push("island only")}
 if(natural.excluded.size){ids.push(`exclude-${[...natural.excluded].sort().join("-")}`);el.push("με ρητές εξαιρέσεις");en.push("with explicit exclusions")}
 if(coastalActive){ids.push("coastal");el.push("παραθαλάσσια");en.push("seaside")}
 if(mountainActive){ids.push("mountain");el.push("βουνό");en.push("mountain")}

 return{
  id:ids.join("+")||"explicit-geography",
  labelEl:joinLabel(el,"ρητός γεωγραφικός περιορισμός"),
  labelEn:joinLabel(en,"explicit geography constraint"),
  ...(allowedSlugs!==undefined?{allowedSlugs}:{}),
  ...(allowedRegions!==undefined?{allowedRegions}:{}),
  ...(natural.excluded.size?{excludedSlugs:natural.excluded}:{}),
  ...(mountainActive?{requiredSlugs:GREEK_MOUNTAIN_SLUGS}:{}),
  ...(coastalActive?{requiredTags:new Set(["beach"])}:{}),
  ...(centers.length?{proximityCenters:centers,maxDistanceKm:100}:{}),
  ...((mainland||mountainActive)?{geography:"mainland" as const}:island?{geography:"island" as const}:{}),
 };
}

export function matchesGeographyConstraint(destination:V8Destination,constraint:GeographyConstraint|null){
 if(!constraint)return true;
 if(destination.countryCode!=="GR")return false;
 if(constraint.excludedSlugs?.has(destination.slug))return false;
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
