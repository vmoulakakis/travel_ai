import assert from "node:assert/strict";
import { deterministicSemanticIntentV18,structuredIntent } from "../lib/ai/intent-v8";
import { semanticNeedsClarificationV19 } from "../lib/ai/semantic-policy-v19";
import { canonicalRankingInputsV19 } from "../lib/decision/canonical-ranking-v19";
import { applySemanticIntentRankingV18 } from "../lib/decision/semantic-intent-ranking-v18";
import { preRankV8 } from "../lib/decision/v8-matcher";
import { loadV8DestinationCatalog } from "../lib/data/destination-v8";
import { matchesGeographyConstraint } from "../lib/decision/geography-constraint";
import { V8_DIMENSIONS,type V8Dimension,type V8SemanticIntent } from "../lib/decision/v8-types";
import type { Mood,TripRequest } from "../lib/validation/trip";

const CASES=10_000,seed=0x1900cafe;let state=seed;
const random=()=>{let t=state+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const pick=<T>(items:readonly T[])=>items[Math.floor(random()*items.length)];
const addDays=(iso:string,days:number)=>new Date(Date.parse(`${iso}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
const idx=Object.fromEntries(V8_DIMENSIONS.map((d,i)=>[d,i])) as Record<V8Dimension,number>;
type Qualifier=keyof V8SemanticIntent["qualifiers"];
type Template={id:string;category:"positive"|"negative"|"priority"|"qualifier"|"mixed"|"ambiguous"|"geography";variants:readonly string[];positive?:readonly [V8Dimension,number];negative?:readonly [V8Dimension,number];priority?:V8Dimension;qualifier?:readonly [Qualifier,number];ambiguous?:boolean};

const templates:readonly Template[]=[
 {id:"food-clean",category:"positive",variants:["θέλω πολύ καλό φαγητό","καλές ταβέρνες και φαγητό","food and local restaurants","thelo kalo fagito"],positive:["food",.8]},
 {id:"food-typo",category:"positive",variants:["θελω καλο φαγτο","θέλω φαγτηο και ταβερνες","thelo faghto","kalo faghto oxi fancy"],positive:["food",.75]},
 {id:"beach-clean",category:"positive",variants:["θέλω θάλασσα και παραλία","θέλω μπάνια κάθε μέρα","sea and beach","thelw mpania kai paralia"],positive:["beach",.8]},
 {id:"beach-typo",category:"positive",variants:["θέλω παραλεία","μπανια και θαλασα","paraleia kai mpania","thalasa kai paralIa"],positive:["beach",.72]},
 {id:"relax-clean",category:"positive",variants:["θέλω ησυχία και χαλάρωση","ήρεμα και χαλαρά","quiet calm trip","thelo xalarosi kai isixia"],positive:["relax",.8]},
 {id:"relax-typo",category:"positive",variants:["θελω ησχια","χαλαρα χωρις αγχος","hsyxia kai xalara","isixia xoris treximo"],positive:["relax",.72]},
 {id:"nature",category:"positive",variants:["θέλω φύση","μέσα στη φύση και πράσινο","nature and green scenery","fusi kai prasino"],positive:["nature",.8]},
 {id:"culture",category:"positive",variants:["πολιτισμός και παλιά πόλη","ιστορία και αρχαία","culture heritage old town","politismo kai arxaia"],positive:["culture",.82]},
 {id:"culture-typo",category:"positive",variants:["πολιτσμο και παλια πολη","αρχεα και ιστορια","politizmo palia poli","arxea mnimeia"],positive:["culture",.72]},
 {id:"family",category:"positive",variants:["με παιδιά","οικογενειακό ταξίδι","family with kids","me paidia"],positive:["family",.82]},
 {id:"family-typo",category:"positive",variants:["με παιδα","με τα παιδακια","me paidakia","oikogeniako me pedia"],positive:["family",.72]},
 {id:"romantic",category:"positive",variants:["ρομαντικό για ζευγάρι","couple romantic trip","romantika gia dyo","zeygari kai romantika"],positive:["romantic",.75]},
 {id:"adventure",category:"positive",variants:["πεζοπορία και δραστηριότητες","hiking and adventure","pezoporia kai drasthriothtes","peripeteia sti fusi"],positive:["adventure",.72]},
 {id:"no-nightlife",category:"negative",variants:["όχι nightlife","δεν θέλω κλαμπ ή πάρτι","no clubs no nightlife","oxi clubakia kai party"],negative:["nightlife",.85]},
 {id:"no-nightlife-natural",category:"negative",variants:["μακριά από κλαμπ","να μην έχει νυχτερινή φασαρία","χωρίς μπαρ μέχρι το πρωί","xoris club kai nyxterini fasaria"],negative:["nightlife",.72]},
 {id:"no-city",category:"negative",variants:["δεν θέλω πόλη","όχι city break","not urban","oxi poli kai astiko perivallon"],negative:["city",.8]},
 {id:"not-beach-holiday",category:"negative",variants:["θάλασσα κοντά αλλά όχι beach holiday","όχι διακοπές παραλίας","sea nearby but not a beach trip","thalassa bonus oxi paralia diakopes"],negative:["beach",.7]},
 {id:"no-luxury",category:"negative",variants:["δεν θέλω luxury","όχι πολυτέλεια","not luxury","oxi polyteleia"],negative:["luxury",.8]},
 {id:"avoid-crowds",category:"qualifier",variants:["όχι πολύ κόσμο","μακριά από τουριστοπαγίδες","quiet, no crowds","oxi polykosmia kai tourist traps"],qualifier:["avoidCrowds",.85]},
 {id:"avoid-crowds-natural",category:"qualifier",variants:["να μην έχει φασαρία και ορδές τουριστών","ήσυχο μέρος χωρίς πολυκοσμία","not packed with tourists","xoris fasaria kai polykosmia"],qualifier:["avoidCrowds",.75]},
 {id:"easy-access",category:"qualifier",variants:["εύκολη πρόσβαση","να μη χάσουμε ώρες στη μετάβαση","easy transfer, little driving","xoris poli odigisi kai eukoli metavasi"],qualifier:["easyAccess",.85]},
 {id:"easy-access-natural",category:"qualifier",variants:["να μη φάμε τη μέρα στον δρόμο","κοντινή και εύκολη μετάβαση","I don't want a long transfer","na min xasoume ores sto dromo"],qualifier:["easyAccess",.72]},
 {id:"slow-rhythm",category:"qualifier",variants:["χαλαρός ρυθμός χωρίς τρέξιμο","slow mornings","όχι πρόγραμμα μαραθώνιο","xalara xoris treximo"],qualifier:["slowRhythm",.85]},
 {id:"walkable",category:"qualifier",variants:["να τα κάνουμε με τα πόδια","walkable place","βόλτες με τα πόδια","ola konta gia perpatima"],qualifier:["walkable",.82]},
 {id:"local-character",category:"qualifier",variants:["τοπικός χαρακτήρας και αυθεντικό μέρος","not a generic resort","authentic local feeling","topikos xaraktiras oxi touristiko"],qualifier:["localCharacter",.82]},
 {id:"food-first",category:"priority",variants:["φαγητό πρώτα","πάνω απ όλα καλό φαγητό","food first","proteraiotita to fagito"],positive:["food",.75],priority:"food"},
 {id:"culture-first",category:"priority",variants:["πολιτισμός πρώτα","προτεραιότητα η ιστορία και ο πολιτισμός","culture first","prota politismos kai istoria"],positive:["culture",.75],priority:"culture"},
 {id:"nature-first",category:"priority",variants:["φύση πρώτα","προτεραιότητα η φύση","nature first","prota fusi"],positive:["nature",.75],priority:"nature"},
 {id:"relax-first",category:"priority",variants:["ηρεμία πρώτα","πάνω απ όλα ξεκούραση","relax first","prota xalarosi"],positive:["relax",.75],priority:"relax"},
 {id:"mixed-food-no-party",category:"mixed",variants:["φαγητό πρώτα, όχι nightlife και όχι πολύ κόσμο","food first, no clubs and no crowds","kalo fagito prota, oxi party kai polykosmia"],positive:["food",.75],negative:["nightlife",.8],priority:"food",qualifier:["avoidCrowds",.8]},
 {id:"mixed-culture-sea-bonus",category:"mixed",variants:["πολιτισμός πρώτα, θάλασσα bonus αλλά όχι διακοπές παραλίας","culture first, sea nearby but not a beach holiday","politismos prota, thalassa bonus oxi beach trip"],positive:["culture",.78],negative:["beach",.65],priority:"culture"},
 {id:"mixed-slow-easy",category:"mixed",variants:["θέλω ηρεμία, εύκολη μετάβαση και όλα με τα πόδια","slow rhythm, easy access and walkable","xalara, eukoli metavasi kai volta me ta podia"],positive:["relax",.72],qualifier:["easyAccess",.7]},
 {id:"beach-basia-typo",category:"positive",variants:["θελω μπασια","θέλω μπασια","θελο μπασια","thelo mpasia"],positive:["beach",.62]},
 {id:"ambiguous-good",category:"ambiguous",variants:["κάτι καλό","να περάσουμε ωραία","something nice","kati oraio"],ambiguous:true},
 {id:"ambiguous-different",category:"ambiguous",variants:["όχι τα ίδια","κάτι αλλιώτικο","not the usual","kati allo"],ambiguous:true},
 {id:"geo-mainland",category:"geography",variants:["χωρίς νησί","δεν θέλω νησί","mainland only","xoris nisi"]},
 {id:"geo-island",category:"geography",variants:["μόνο νησί","θέλω νησί μόνο","island only","mono nisi"]},
 {id:"geo-crete",category:"geography",variants:["μόνο Κρήτη","θέλω μόνο Κρήτη","Crete only"]},
 {id:"geo-cyclades",category:"geography",variants:["μόνο Κυκλάδες","θέλω Κυκλάδες μόνο","Cyclades only"]},
 {id:"geo-west",category:"geography",variants:["μόνο δυτική Ελλάδα","θέλω μόνο δυτική Ελλάδα","western Greece only"]},
] as const;

const starts=["2026-09-18","2026-10-16","2026-11-13","2027-04-16","2027-06-18"] as const;
const origins=["Athens","Thessaloniki","Patras","Larissa","Ioannina"] as const;
const moods:readonly Mood[]=["relax","romantic","food","warmth","city","nature","adventure","culture"];
function profile(text:string):TripRequest{
 const travelerType=pick(["solo","couple","family","friends"] as const),groupSize=travelerType==="solo"?1:travelerType==="couple"?2:pick([3,4,5]),startDate=pick(starts),nights=pick([2,3,4,5,7]);
 return{origin:pick(origins),startDate,endDate:addDays(startDate,nights),month:"flexible",nights,budget:pick([500,800,1200,1800,2500]),moods:[pick(moods)],travelerType,language:random()<.15?"en":"el",distancePreference:pick(["nearby","easy-hop","any"] as const),pace:pick(["slow","balanced","full"] as const),hotelStyle:pick(["luxury","boutique","resort","value","any"] as const),avoid:pick(["crowds","none","high-cost","long-travel"] as const),entryMode:"unknown",groupSize,desiredEnergy:pick(["restore","balanced","stimulating"] as const),socialPreference:pick(["quiet","balanced","lively"] as const),noveltyPreference:pick(["familiar","balanced","surprise"] as const),mustHave:pick(["none","sea","culture","nature"] as const),dateFlexibility:pick(["fixed","few-days","open"] as const),transportMode:pick(["no-car","car","electric-car","any"] as const),stayLocationPreference:pick(["central","balanced","outside"] as const),tripText:text};
}
function decorate(text:string,index:number){const wrappers=[text,`  ${text}  `,`${text}!!!`,text.toUpperCase(),`${text}, παρακαλώ`,`${text} :)`];return wrappers[index%wrappers.length]}
function semanticPass(t:Template,s:V8SemanticIntent){
 if(t.ambiguous)return s.confidence<=.5&&Object.keys(s.positive).length===0&&Object.keys(s.negative).length===0&&Object.values(s.qualifiers).every(v=>v<.5);
 if(t.positive&&Number(s.positive[t.positive[0]]??0)<t.positive[1])return false;
 if(t.negative&&Number(s.negative[t.negative[0]]??0)<t.negative[1])return false;
 if(t.priority&&s.priorities[0]!==t.priority)return false;
 if(t.qualifier&&Number(s.qualifiers[t.qualifier[0]]??0)<t.qualifier[1])return false;
 return true;
}
function average<T>(items:T[],read:(item:T)=>number){return items.length?items.reduce((s,x)=>s+read(x),0)/items.length:0}
function rankingMetric(t:Template,items:ReturnType<typeof rank>){const top=items.slice(0,3);if(!top.length)return NaN;if(t.positive)return average(top,x=>x.destination.vector[idx[t.positive![0]]]??0);if(t.negative)return average(top,x=>x.destination.vector[idx[t.negative![0]]]??0);if(t.qualifier?.[0]==="avoidCrowds")return average(top,x=>x.destination.crowdLevel);if(t.qualifier?.[0]==="easyAccess")return average(top,x=>x.breakdown.effort);if(t.qualifier?.[0]==="slowRhythm")return average(top,x=>x.destination.vector[idx.relax]??0);if(t.qualifier?.[0]==="walkable")return average(top,x=>((x.destination.vector[idx.city]??0)+(x.destination.vector[idx.culture]??0))/2);if(t.qualifier?.[0]==="localCharacter")return average(top,x=>x.destination.vector[idx.culture]??0);return NaN}
function directionOk(t:Template,withText:number,withoutText:number){if(!Number.isFinite(withText)||!Number.isFinite(withoutText))return true;if(t.positive)return withText>=withoutText-.025;if(t.negative||t.qualifier?.[0]==="avoidCrowds")return withText<=withoutText+.08;if(t.qualifier?.[0]==="easyAccess")return withText>=withoutText-2;return withText>=withoutText-.025}
function rank(request:TripRequest,catalog:Awaited<ReturnType<typeof loadV8DestinationCatalog>>){const intent=structuredIntent(request),{constrainedCatalog,rankingTrip}=canonicalRankingInputsV19(request,catalog),raw=preRankV8(rankingTrip,intent,constrainedCatalog,constrainedCatalog.length);return applySemanticIntentRankingV18(raw,intent).slice(0,12)}

async function main(){
 const catalog=(await loadV8DestinationCatalog()).filter(x=>x.countryCode==="GR");
 const vague=structuredIntent(profile("κάτι καλό")),bania=structuredIntent(profile("θελω μπασια"));
 assert.equal(semanticNeedsClarificationV19(vague,"κάτι καλό",false),true,"vague free text must ask for clarification instead of being ignored");
 assert.equal(semanticNeedsClarificationV19(bania,"θελω μπασια",false),false,"recoverable swimming typo must not trigger clarification");
 assert.ok((bania.semantic?.positive.beach??0)>=.62,"μπασια must recover toward μπάνια / beach intent");
 assert.equal(semanticNeedsClarificationV19(vague,"μόνο Κρήτη",true),false,"understood hard geography must not ask an unrelated clarification");
 let parseOk=0,parseTotal=0,directionPass=0,directionTotal=0,geoLeaks=0,empty=0,ambiguousOk=0,ambiguousTotal=0;
 const byCategory=new Map<string,{ok:number;total:number}>(),byTemplate=new Map<string,{ok:number;total:number}>(),errors:Array<Record<string,unknown>>=[];
 for(let i=0;i<CASES;i++){
  const t=templates[i%templates.length],text=decorate(pick(t.variants),i),request=profile(text),semantic=deterministicSemanticIntentV18(text),result=rank(request,catalog);
  if(!result.length)empty++;
  if(t.category==="geography"){
   const {hardConstraint}=canonicalRankingInputsV19(request,catalog);if(!hardConstraint||result.some(x=>!matchesGeographyConstraint(x.destination,hardConstraint))){geoLeaks++;if(errors.length<40)errors.push({i,id:t.id,kind:"geography",text,hardConstraint:hardConstraint?.id??null,top3:result.slice(0,3).map(x=>x.destination.slug)});}continue;
  }
  parseTotal++;const pass=semanticPass(t,semantic);if(pass)parseOk++;if(!byCategory.has(t.category))byCategory.set(t.category,{ok:0,total:0});if(!byTemplate.has(t.id))byTemplate.set(t.id,{ok:0,total:0});const c=byCategory.get(t.category)!,bt=byTemplate.get(t.id)!;c.total++;bt.total++;if(pass){c.ok++;bt.ok++;}
  if(t.ambiguous){ambiguousTotal++;if(pass)ambiguousOk++;}
  if(!pass&&errors.length<40)errors.push({i,id:t.id,kind:"semantic",text,positive:semantic.positive,negative:semantic.negative,priorities:semantic.priorities,qualifiers:semantic.qualifiers,confidence:semantic.confidence});
  if(!t.ambiguous){const baseline=rank({...request,tripText:undefined},catalog),a=rankingMetric(t,result),b=rankingMetric(t,baseline);directionTotal++;if(directionOk(t,a,b))directionPass++;else if(errors.length<40)errors.push({i,id:t.id,kind:"ranking-direction",text,withText:a,withoutText:b,top3:result.slice(0,3).map(x=>x.destination.slug),baseline:baseline.slice(0,3).map(x=>x.destination.slug)});}
 }
 const category=Object.fromEntries([...byCategory].map(([k,v])=>[k,{...v,rate:v.ok/Math.max(1,v.total)}])),worst=[...byTemplate].map(([id,v])=>({id,...v,rate:v.ok/Math.max(1,v.total)})).sort((a,b)=>a.rate-b.rate).slice(0,15);
 const output={seed,cases:CASES,catalogSize:catalog.length,parseAccuracy:parseOk/Math.max(1,parseTotal),ambiguousSafetyRate:ambiguousOk/Math.max(1,ambiguousTotal),rankingDirectionRate:directionPass/Math.max(1,directionTotal),geographyLeaks:geoLeaks,emptyResults:empty,category,worstTemplates:worst,errorSamples:errors};
 console.log("V19_10000_SEMANTIC_MATCH_AUDIT",JSON.stringify(output));
 assert.equal(geoLeaks,0,`Hard geography leaked in ${geoLeaks} cases`);
 assert(parseOk/Math.max(1,parseTotal)>=.95,`Semantic parse accuracy only ${(parseOk/Math.max(1,parseTotal)*100).toFixed(1)}%`);
 const rate=(name:string)=>byCategory.get(name)!.ok/byCategory.get(name)!.total;
 assert(rate("positive")>=.98,`Positive parse only ${(rate("positive")*100).toFixed(1)}%`);
 assert(rate("negative")>=.98,`Negative parse only ${(rate("negative")*100).toFixed(1)}%`);
 assert(rate("qualifier")>=.98,`Qualifier parse only ${(rate("qualifier")*100).toFixed(1)}%`);
 assert(rate("priority")>=.98,`Priority parse only ${(rate("priority")*100).toFixed(1)}%`);
 assert(rate("mixed")>=.95,`Mixed parse only ${(rate("mixed")*100).toFixed(1)}%`);
 assert(ambiguousOk/Math.max(1,ambiguousTotal)>=.95,`Ambiguous/noisy safety only ${(ambiguousOk/Math.max(1,ambiguousTotal)*100).toFixed(1)}%`);
 assert(directionPass/Math.max(1,directionTotal)>=.8,`Ranking moves in the intended direction only ${(directionPass/Math.max(1,directionTotal)*100).toFixed(1)}%`);
 assert(empty/CASES<=.08,`Too many empty results: ${(empty/CASES*100).toFixed(1)}%`);
}
void main();
