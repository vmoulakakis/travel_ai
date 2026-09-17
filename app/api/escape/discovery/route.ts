import { NextResponse } from "next/server";
import { z } from "zod";

const questionIds=["companions","outcome","social","novelty","must_have","friction"] as const;
const QuestionId=z.enum(questionIds);
const AnswerSchema=z.object({questionId:QuestionId,value:z.string().trim().min(1).max(100)});
const InputSchema=z.object({locale:z.enum(["el","en"]).default("el"),initialText:z.string().trim().min(3).max(900),answers:z.array(AnswerSchema).max(6).default([])});

type QuestionId=z.infer<typeof QuestionId>;
type Mood="relax"|"romantic"|"food"|"warmth"|"city"|"nature"|"adventure"|"culture";
type Profile={travelerType:"solo"|"couple"|"family"|"friends";moods:Mood[];pace:"slow"|"balanced"|"full";desiredEnergy:"restore"|"balanced"|"stimulating";socialPreference:"quiet"|"balanced"|"lively";noveltyPreference:"familiar"|"balanced"|"surprise";avoid:"long-travel"|"high-cost"|"crowds"|"none";mustHave:"sea"|"nature"|"culture"|"nightlife"|"none";dnaLabels:string[]};
type Parsed={summary:string;profile:Profile;answered:QuestionId[];nextQuestionId:QuestionId|null;confidence:number};

// Product rule: infer only travel-decision preferences, never clinical psychology.
// The next question is chosen by highest expected information gain. Never recommend a destination here.
const DISCOVERY_POLICY="highest expected information gain · never clinical psychology · Never recommend a destination";
const has=(s:string,r:RegExp)=>r.test(s.toLowerCase());
const uniq=<T,>(rows:T[])=>[...new Set(rows)];

function explicitSignals(initialText:string){
 const t=initialText.toLowerCase();
 return{
  companions:/παιδ|kids|children|family|οικογεν|wife|husband|partner|couple|ζευγ|friends|φιλ|παρεα|solo|alone|μονος|μόνος/i.test(t),
  outcome:/κουρασ|ηρεμ|χαλαρ|ξεκουρ|relax|rest|switch off|reset|adventure|περιπετ|ζωνταν|ενεργ|inspir/i.test(t),
  social:/quiet|ήσυχ|ησυχ|lively|ζωνταν|nightlife|party|κοσμο|κόσμο/i.test(t),
  novelty:/surprise|έκπλη|εκπλη|different|διαφορετ|familiar|σίγουρ|σιγουρ|γνωστ/i.test(t),
  must_have:/sea|θαλασσ|παραλι|beach|nature|φυση|βουν|culture|history|μουσει|πολιτισ|nightlife|club/i.test(t),
  friction:/short|easy|κοντα|κοντά|ταλαιπωρ|no long|budget|cheap|οικονομ|crowd|πολυκοσ|τουριστ/i.test(t)
 } as const;
}

function nextByInformationGain(initialText:string,answered:Set<QuestionId>):QuestionId|null{
 const s=explicitSignals(initialText);
 const score:Record<QuestionId,number>={
  companions:s.companions?0:6,
  outcome:s.outcome?0:7,
  social:s.social?0:3.8,
  novelty:s.novelty?0:2.4,
  must_have:s.must_have?0:5.5,
  friction:s.friction?0:5
 };
 for(const q of answered)score[q]=0;
 const useful=answered.size+Object.values(s).filter(Boolean).length;
 if(useful>=4){
  const critical=(['must_have','friction'] as QuestionId[]).find(q=>score[q]>=5);
  return critical??null;
 }
 const ranked=(questionIds as readonly QuestionId[]).filter(q=>score[q]>0).sort((a,b)=>score[b]-score[a]);
 return ranked[0]??null;
}

function deterministic(locale:"el"|"en",initialText:string,answers:Array<{questionId:QuestionId;value:string}>):Parsed{
 const text=[initialText,...answers.map(a=>a.value)].join(" ").toLowerCase();
 const answerMap=new Map(answers.map(a=>[a.questionId,a.value]));
 const signals=explicitSignals(initialText);
 const travelerType:Profile["travelerType"]=has(text,/(παιδ|kids|children|family|οικογεν)/)?"family":has(text,/(φιλ|friends|παρεα)/)?"friends":has(text,/(μονος|μόνος|solo|alone)/)?"solo":has(text,/(γυναικ|αντρα|συντροφ|wife|husband|partner|couple|ζευγ)/)?"couple":"couple";
 const moods:Mood[]=[];const addMood=(m:Mood,r:RegExp)=>{if(has(text,r)&&!moods.includes(m))moods.push(m)};
 addMood("relax",/(ηρεμ|χαλαρ|ξεκουρ|κουρασ|relax|rest|switch off|quiet|reset)/);addMood("romantic",/(ρομαν|μαζι|μαζί|anniversary|romantic|partner|couple)/);addMood("food",/(φαγη|εστιατορ|food|restaurant|gastr)/);addMood("warmth",/(ηλιο|ζεστ|sun|warm)/);addMood("nature",/(φυση|βουν|nature|mountain|green)/);addMood("culture",/(πολιτισ|μουσει|history|culture|museum|παλια πολη|παλιά πόλη)/);addMood("adventure",/(περιπετ|adventure|different|διαφορετ|δραστηρ)/);addMood("city",/(πολη|πόλη|city|urban)/);if(!moods.length)moods.push("relax");
 const outcome=answerMap.get("outcome")||"";const desiredEnergy:Profile["desiredEnergy"]=/(stimulat|ζωνταν|ενεργ|adventure|περιπετ)/i.test(outcome+text)?"stimulating":/(rest|ηρεμ|χαλαρ|reset|ξεκουρ|κουρασ)/i.test(outcome+text)?"restore":"balanced";
 const socialRaw=answerMap.get("social")||"";const socialPreference:Profile["socialPreference"]=/(quiet|ήσυχ|ησυχ)/i.test(socialRaw+text)?"quiet":/(lively|ζωνταν|nightlife|party)/i.test(socialRaw+text)?"lively":"balanced";
 const noveltyRaw=answerMap.get("novelty")||"";const noveltyPreference:Profile["noveltyPreference"]=/(surprise|έκπλη|εκπλη|different|διαφορετ)/i.test(noveltyRaw+text)?"surprise":/(familiar|σίγουρ|σιγουρ|γνωστ)/i.test(noveltyRaw+text)?"familiar":"balanced";
 const mustRaw=answerMap.get("must_have")||"";const mustHave:Profile["mustHave"]=/(sea|θαλασσ|παραλι|beach)/i.test(mustRaw+text)?"sea":/(nature|φυση|βουν)/i.test(mustRaw+text)?"nature":/(culture|history|μουσει|πολιτισ|παλια πολη|παλιά πόλη)/i.test(mustRaw+text)?"culture":/(night|club|nightlife|party)/i.test(mustRaw+text)?"nightlife":"none";
 const frictionRaw=answerMap.get("friction")||"";const avoid:Profile["avoid"]=/(short|easy|κοντα|κοντά|ταλαιπωρ|no long|κουραστικ)/i.test(frictionRaw+text)?"long-travel":/(cheap|budget|οικονομ|cost|κοστος|κόστος)/i.test(frictionRaw+text)?"high-cost":/(crowd|πολυκοσ|τουριστ)/i.test(frictionRaw+text)?"crowds":"none";
 const pace:Profile["pace"]=desiredEnergy==="restore"?"slow":desiredEnergy==="stimulating"?"full":"balanced";
 const answered=new Set<QuestionId>(answers.map(a=>a.questionId));for(const q of questionIds){if(signals[q])answered.add(q)}
 const nextQuestionId=nextByInformationGain(initialText,answered);
 const labels=[desiredEnergy==="restore"?(locale==="el"?"Αποφόρτιση":"Reset"):desiredEnergy==="stimulating"?(locale==="el"?"Ενέργεια":"Energy"):(locale==="el"?"Ισορροπία":"Balance"),socialPreference==="quiet"?(locale==="el"?"Ήσυχος ρυθμός":"Quiet rhythm"):socialPreference==="lively"?(locale==="el"?"Ζωντανή ατμόσφαιρα":"Lively atmosphere"):(locale==="el"?"Ισορροπημένη ατμόσφαιρα":"Balanced atmosphere"),noveltyPreference==="surprise"?(locale==="el"?"Κάτι διαφορετικό":"Something different"):(locale==="el"?"Σίγουρη ανακάλυψη":"Confident discovery"),avoid==="long-travel"?(locale==="el"?"Χαμηλή ταλαιπωρία":"Low friction"):avoid==="crowds"?(locale==="el"?"Μακριά από πολυκοσμία":"Avoid crowds"):(locale==="el"?"Ευελιξία":"Flexible"),...moods.slice(0,2).map(m=>m==="food"?(locale==="el"?"Καλό φαγητό":"Food-led"):m==="romantic"?(locale==="el"?"Χρόνος μαζί":"Time together"):m==="nature"?(locale==="el"?"Φύση":"Nature"):m==="warmth"?(locale==="el"?"Ήλιος":"Sun"):m==="culture"?(locale==="el"?"Πολιτισμός":"Culture"):m==="adventure"?(locale==="el"?"Περιπέτεια":"Adventure"):(locale==="el"?"Ανάσα":"Escape"))];
 const summary=locale==="el"?`Κατάλαβα: ${desiredEnergy==="restore"?"θέλεις πραγματικό reset":desiredEnergy==="stimulating"?"θέλεις ενέργεια και εμπειρίες":"θέλεις μια ισορροπημένη απόδραση"}${socialPreference==="quiet"?", σε ήρεμο ρυθμό":""}${mustHave!=="none"?`, με ξεκάθαρο must-have ${mustHave==="sea"?"τη θάλασσα":mustHave==="nature"?"τη φύση":mustHave==="culture"?"τον πολιτισμό":"τη βραδινή ζωή"}`:""}${avoid==="long-travel"?", χωρίς περιττή ταλαιπωρία":""}.`:`Got it: ${desiredEnergy==="restore"?"you want a real reset":desiredEnergy==="stimulating"?"you want energy and experiences":"you want a balanced escape"}${socialPreference==="quiet"?", at a calmer pace":""}${mustHave!=="none"?`, with ${mustHave} as a real must-have`:""}${avoid==="long-travel"?", without unnecessary travel friction":""}.`;
 const confidence=nextQuestionId?Math.min(.88,.62+answered.size*.055):.92;
 return{summary,profile:{travelerType,moods:moods.slice(0,3),pace,desiredEnergy,socialPreference,noveltyPreference,avoid,mustHave,dnaLabels:uniq(labels).slice(0,6)},answered:[...answered],nextQuestionId,confidence};
}

export async function POST(request:Request){
 const parsed=InputSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_discovery"},{status:400,headers:{"cache-control":"no-store"}});
 const {locale,initialText,answers}=parsed.data;
 const result=deterministic(locale,initialText,answers);
 void DISCOVERY_POLICY;
 return NextResponse.json({ok:true,...result,complete:result.nextQuestionId===null||result.answered.length>=4,mode:"instant-agent-v41"},{headers:{"cache-control":"no-store","x-travel-agent-mode":"instant"}});
}
