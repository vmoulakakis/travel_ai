import { V8_DIMENSIONS,type V8Dimension,type V8SemanticIntent } from "@/lib/decision/v8-types";

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const normalize=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").replace(/\s+/g," ").trim();
const emptyQualifiers=():V8SemanticIntent["qualifiers"]=>({avoidCrowds:0,easyAccess:0,slowRhythm:0,walkable:0,localCharacter:0});

function editDistance(a:string,b:string){
 const prev=Array.from({length:b.length+1},(_,i)=>i),cur=Array(b.length+1).fill(0);
 for(let i=1;i<=a.length;i++){cur[0]=i;for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=cur[j];}
 return prev[b.length];
}
function fuzzyToken(tokens:string[],targets:string[],max=1){return tokens.some(token=>token.length>=5&&targets.some(target=>Math.abs(token.length-target.length)<=max&&editDistance(token,target)<=max));}
function any(text:string,patterns:RegExp[]){return patterns.some(pattern=>pattern.test(text));}
function hasSignal(s:V8SemanticIntent){return Object.values(s.positive).some(v=>(v??0)>.05)||Object.values(s.negative).some(v=>(v??0)>.05)||s.priorities.length>0||Object.values(s.qualifiers).some(v=>v>.05)}

export function deterministicSemanticIntentV19(raw:string):V8SemanticIntent{
 const text=normalize(raw),tokens=text.split(" ").filter(Boolean),positive:Partial<Record<V8Dimension,number>>={},negative:Partial<Record<V8Dimension,number>>={},qualifiers=emptyQualifiers(),priorities:V8Dimension[]=[];
 const pos=(d:V8Dimension,v:number)=>positive[d]=Math.max(positive[d]??0,v),neg=(d:V8Dimension,v:number)=>negative[d]=Math.max(negative[d]??0,v),priority=(d:V8Dimension)=>{if(!priorities.includes(d))priorities.push(d)};
 if(!text)return{positive,negative,priorities,qualifiers,confidence:1,source:"structured",rationale:[]};
 let fuzzy=false;
 const food=any(text,[/φαγητ|γαστρονομ|ταβερν|εστιατορ|food|restaurant|tavern|fagit|faght|gastronom|estiatori/])||fuzzyToken(tokens,["φαγητο","fagito"]);
 const beach=any(text,[/θαλασσ|παραλι|μπανι|beach|seaside|coast|paralia|thalass|thalasa|mpani/])||fuzzyToken(tokens,["θαλασσα","παραλια","μπανια","thalassa","paralia","mpania"]);
 const relax=any(text,[/ησυχ|ηρεμ|χαλαρ|ξεκουρα|quiet|calm|relax|xalar|chalar|isixi|hsyx|irem/])||fuzzyToken(tokens,["ησυχια","χαλαρωση","xalarosi","isixia"]);
 const nature=any(text,[/φυση|φυσικ|nature|fusi|fysi|fysh|prasino/]);
 const culture=any(text,[/πολιτισ|παλια πολη|ιστορ|αρχαι|αρχεα|μνημ|culture|heritage|historic|politism|politiz|palia poli|arxai|arxea|archaia|mnimei/]);
 const family=any(text,[/παιδ|οικογεν|family|children|kids|paidi|paidak|oikogene/])||fuzzyToken(tokens,["παιδια","παιδακια","paidia","paidakia"]);
 const romantic=any(text,[/ρομαντ|ζευγαρ|romantic|romance|couple|zeygar|zeugar/]);
 const adventure=any(text,[/πεζοπορ|δραστηριοτ|περιπετει|hiking|adventure|pezopor|peripet/]);
 const warmth=any(text,[/ζεστ|ηλιο|warm|sunny|ilios|zesti|zesto/]);
 const explicitCity=any(text,[/πολη|αστικ|city|urban|city break|palia poli|astik|kent(?:r|)o/]);
 const nightlifeWord=any(text,[/nightlife|βραδιν|νυχτεριν|κλαμπ|μπαρ|παρτι|bars?\b|clubs?\b|party|vradin|nyxt|clubak/]);
 const negativeNightlife=any(text,[/(?:οχι|χωρις|δεν θελω|να μην|να μη|μακρια απο).{0,36}(?:nightlife|βραδιν|νυχτεριν|κλαμπ|μπαρ|παρτι|φασαρι)/,/(?:no|not|without|away from|xoris|xwris|oxi|den thelo|na min|makria apo).{0,36}(?:nightlife|club|bar|party|nyxter|fasaria)/]);
 const negativeBeach=any(text,[/(?:οχι|δεν θελω|δεν ειναι|να μην).{0,35}(?:beach holiday|διακοπ.{0,10}παραλι|παραλι)/,/(?:not|no|oxi|den thelo).{0,35}(?:beach holiday|beach trip|paralia diakop|paralia)/]);
 const negativeCity=any(text,[/(?:οχι|δεν θελω|χωρις).{0,20}(?:πολη|αστικ)/,/(?:not|no|without|oxi).{0,20}(?:city|urban|astik)/]);
 const negativeAdventure=any(text,[/(?:οχι|δεν θελω|χωρις).{0,20}(?:βουνο|πεζοπορ)/,/(?:not|no|without|oxi).{0,20}(?:mountain|hiking|pezopor)/]);
 const negativeLuxury=any(text,[/(?:οχι|δεν θελω|χωρις).{0,20}(?:luxury|πολυτελ)/,/(?:not|no|without|oxi).{0,20}(?:luxury|polytele)/]);
 if(food)pos("food",.88);if(beach)pos("beach",.9);if(relax)pos("relax",.86);if(nature)pos("nature",.9);if(culture)pos("culture",.94);if(family)pos("family",.9);if(romantic)pos("romantic",.84);if(adventure)pos("adventure",.8);if(warmth)pos("warmth",.8);if(explicitCity)pos("city",.86);
 if(nightlifeWord&&!negativeNightlife)pos("nightlife",.76);
 if(negativeNightlife)neg("nightlife",.96);if(negativeBeach)neg("beach",.88);if(negativeCity)neg("city",.92);if(negativeAdventure)neg("adventure",.9);if(negativeLuxury)neg("luxury",.92);

 qualifiers.avoidCrowds=any(text,[/τουριστοπαγ|πολυκοσμ|πολυ κοσμ|ορδ.{0,12}τουριστ|φασαρι|crowd|packed.{0,12}tourist|tourist trap|not chaos|no party crowds|polykosm|fasaria/])?1:0;
 qualifiers.easyAccess=any(text,[/ευκολ.{0,15}(?:προσβ|μεταβ)|κοντιν.{0,15}μεταβ|λιγη.{0,10}οδηγ|να μη.{0,25}(?:χασ|φαμε).{0,30}(?:ωρ|μερα|δρομ)|χωρις.{0,18}οδηγ/,/easy access|easy transfer|little driving|not much driv|dont want a long transfer|do not want a long transfer|eukol.{0,15}metav|xoris.{0,18}odig|xwris.{0,18}odig|na min.{0,25}xas.{0,20}(?:or|drom)/])?1:0;
 qualifiers.slowRhythm=any(text,[/slow rhythm|slow morning|easy rhythm|ηρεμ.{0,12}ρυθμ|χαλαρ.{0,12}ρυθμ|χωρις.{0,15}τρεξ|να μην.{0,12}τρεχ|να μη.{0,12}τρεχ|οχι.{0,15}μαραθ|ξεκουρα|xalara|xoris.{0,12}trex|xwris.{0,12}trex/])?1:0;
 qualifiers.walkable=any(text,[/walkable|με τα ποδια|ολα.{0,8}κοντα|περπατ|βολτ|perpat|ola.{0,8}konta|volta/])?1:0;
 qualifiers.localCharacter=any(text,[/τοπικ.{0,12}χαρακτηρ|αυθεντικ|οχι.{0,12}τουριστικ|authentic|local character|not a generic resort|not touristy|local tavern|topik.{0,12}xarakt|oxi.{0,12}touristik/])?1:0;
 if(qualifiers.avoidCrowds){pos("relax",.8);neg("nightlife",Math.max(negative.nightlife??0,.55));}if(qualifiers.slowRhythm)pos("relax",.92);if(qualifiers.walkable){pos("city",Math.max(positive.city??0,.5));pos("culture",Math.max(positive.culture??0,.45));}if(qualifiers.localCharacter)pos("culture",Math.max(positive.culture??0,.78));if(qualifiers.easyAccess){pos("short_break",.68);pos("relax",Math.max(positive.relax??0,.55));}

 const first=(d:V8Dimension,terms:string[])=>{const joined=terms.join("|");return new RegExp(`(?:προτεραιοτητα|πανω απ ολα|πρωτα|κυριως|priority|first|proteraiotita|prota).{0,28}(?:${joined})|(?:${joined}).{0,22}(?:πρωτ|priority|first)`).test(text)&&priority(d)};
 first("food",["φαγητ","food","fagit","faght"]);first("culture",["πολιτισ","ιστορ","culture","heritage","politism"]);first("nature",["φυση","nature","fusi","fysi"]);first("relax",["ηρεμ","ξεκουρα","χαλαρ","relax","xalar"]);

 for(const d of V8_DIMENSIONS){if((negative[d]??0)>=.75&&(positive[d]??0)>.25)positive[d]=.2;}
 fuzzy=fuzzyToken(tokens,["φαγητο","fagito","θαλασσα","παραλια","μπανια","thalassa","paralia","mpania","ησυχια","χαλαρωση","xalarosi","isixia","παιδια","παιδακια","paidia","paidakia"]);
 const semantic={positive,negative,priorities,qualifiers,confidence:.3,source:"structured" as const,rationale:[] as string[]};
 const signals=Object.values(positive).filter(v=>(v??0)>.05).length+Object.values(negative).filter(v=>(v??0)>.05).length+priorities.length+Object.values(qualifiers).filter(v=>v>.05).length;
 semantic.confidence=signals===0?.3:fuzzy&&signals===1?.64:signals>=3?.9:signals===2?.86:.82;
 semantic.rationale=signals?[`deterministic semantic signals: ${signals}${fuzzy?"; fuzzy typo recovery":""}`]:["no reliable semantic signal"];
 return semantic;
}

export function semanticHasMeaningV19(semantic:V8SemanticIntent){return hasSignal(semantic)}
