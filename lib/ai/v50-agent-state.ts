import type { TripRequest } from "@/lib/validation/trip";

export type V50FilterKey="calm"|"food"|"nature"|"discovery"|"nightlife"|"value";
export type V50Filters=Record<V50FilterKey,number>;
export type V50TravelerType="solo"|"couple"|"family"|"friends";
export type V50QuestionId="dates"|"companions"|"outcome"|"friction";

export type V50ConversationInput={
  userText:string;
  priorUserText?:string;
  origin?:string;
  budget?:number;
  filters?:Partial<V50Filters>;
  answers?:Partial<Record<V50QuestionId,string>>;
};

export type V50Question={
  id:V50QuestionId;
  text:string;
  quickReplies:Array<{label:string;value:string}>;
};

export type V50ConversationInterpretation={
  compactText:string;
  startDate:string|null;
  endDate:string|null;
  nights:number|null;
  weekend:boolean;
  flexibleDates:boolean;
  travelerType:V50TravelerType|null;
  desiredEnergy:"restore"|"balanced"|"stimulating";
  socialPreference:"quiet"|"balanced"|"lively";
  noveltyPreference:"familiar"|"balanced"|"surprise";
  mustHave:"sea"|"nature"|"culture"|"nightlife"|"none";
  terrainIntent:"mountain"|null;
  avoid:"long-travel"|"high-cost"|"crowds"|"none";
  distancePreference:"nearby"|"easy-hop"|"island"|"any";
  moods:TripRequest["moods"];
  confidence:number;
  signals:string[];
};

const defaultFilters:V50Filters={calm:60,food:55,nature:55,discovery:55,nightlife:35,value:60};
const norm=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const iso=(d:Date)=>d.toISOString().slice(0,10);
const validDate=(d:Date)=>Number.isFinite(d.getTime());
const weekendRe=/(^|[\s,.;:!?])σκ($|[\s,.;:!?])|σαββατοκυριακ|weekend/i;

function nextFriday(anchor:Date,strictAfter:boolean){
  const d=new Date(anchor.getTime());
  if(strictAfter)d.setUTCDate(d.getUTCDate()+1);
  const delta=(5-d.getUTCDay()+7)%7;
  d.setUTCDate(d.getUTCDate()+delta);
  return d;
}

const greekMonths:Record<string,number>={
  ιανουαρι:0,ιαν:0,φεβρουαρι:1,φεβ:1,μαρτι:2,μαρ:2,απριλι:3,απρ:3,μαιο:4,μαι:4,
  ιουνι:5,ιουν:5,ιουλι:6,ιουλ:6,αυγουστο:7,αυγουστ:7,αυγ:7,σεπτεμβρι:8,σεπτ:8,οκτωβρι:9,οκτ:9,
  νοεμβρι:10,νοε:10,δεκεμβρι:11,δεκ:11
};

function explicitDate(text:string,now=new Date()){
  let m=text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);
  if(m){
    const d=new Date(Date.UTC(Number(m[3]),Number(m[2])-1,Number(m[1])));
    if(validDate(d)&&d.getUTCDate()===Number(m[1])&&d.getUTCMonth()===Number(m[2])-1)return d;
  }
  m=text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if(m){
    const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));
    if(validDate(d))return d;
  }

  const normalized=norm(text);
  const named=normalized.match(/(?:^|\s)(\d{1,2})\s+(ιανουαρι(?:ου)?|ιαν|φεβρουαρι(?:ου)?|φεβ|μαρτι(?:ου)?|μαρ|απριλι(?:ου)?|απρ|μαι(?:ου)?|μαι|ιουνι(?:ου)?|ιουν|ιουλι(?:ου)?|ιουλ|αυγουστ(?:ου|ο)?|αυγ|σεπτεμβρι(?:ου)?|σεπτ|οκτωβρι(?:ου)?|οκτ|νοεμβρι(?:ου)?|νοε|δεκεμβρι(?:ου)?|δεκ)(?:\s+(\d{4}))?(?=\s|$|[,.!?;:])/);
  if(named){
    const day=Number(named[1]),monthToken=named[2].replace(/ου$/,"").replace(/ο$/,""),month=greekMonths[monthToken];
    if(month!=null){
      let year=named[3]?Number(named[3]):now.getUTCFullYear();
      let d=new Date(Date.UTC(year,month,day));
      if(!named[3]&&d.getTime()<new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())).getTime()){
        year+=1;d=new Date(Date.UTC(year,month,day));
      }
      if(validDate(d)&&d.getUTCDate()===day&&d.getUTCMonth()===month)return d;
    }
  }
  return null;
}

export function parseNaturalWindowV50(text:string,answer:string|undefined,now=new Date()){
  const combined=[text,answer??""].join(" ").trim(),normalized=norm(combined);
  const range=normalized.match(/(?:^|\s)(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(ιανουαρι(?:ου)?|φεβρουαρι(?:ου)?|μαρτι(?:ου)?|απριλι(?:ου)?|μαι(?:ου)?|ιουνι(?:ου)?|ιουλι(?:ου)?|αυγουστ(?:ου|ο)?|σεπτεμβρι(?:ου)?|οκτωβρι(?:ου)?|νοεμβρι(?:ου)?|δεκεμβρι(?:ου)?)(?:\s+(\d{4}))?(?=\s|$|[,.!?;:])/);
  if(range){
    const from=explicitDate(range[1]+" "+range[3]+(range[4]?" "+range[4]:""),now),to=explicitDate(range[2]+" "+range[3]+(range[4]?" "+range[4]:""),now);
    if(from&&to&&to>from)return{startDate:iso(from),endDate:iso(to),nights:Math.max(1,Math.round((to.getTime()-from.getTime())/86400000)),weekend:weekendRe.test(combined),flexible:false};
  }

  const anchor=explicitDate(combined,now);
  const isWeekend=weekendRe.test(combined);
  const after=/μετ[αά]\s*(τις|την)?|after/i.test(combined);
  const flexible=after||/ευελικ|flex|οποτε|όποτε|οποιο|whatever/i.test(combined);
  const thisWeekend=/αυτ[οό]\s*το\s*σκ|this weekend/i.test(combined);
  const nextWeekend=/επομεν[οό]\s*σκ|next weekend/i.test(combined);
  if(!anchor&&!thisWeekend&&!nextWeekend&&!/ευελικ|flex|οποτε|όποτε/i.test(combined))return null;

  let start:Date;
  if(anchor){
    start=isWeekend?nextFriday(anchor,after):new Date(anchor.getTime());
  }else if(thisWeekend){
    const day=now.getUTCDay();
    start=day===5?new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())):day===6?new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())):nextFriday(now,false);
  }else{
    start=nextFriday(now,true);
  }
  const nights=isWeekend||thisWeekend||nextWeekend?2:3,end=new Date(start.getTime()+nights*86400000);
  return{startDate:iso(start),endDate:iso(end),nights,weekend:isWeekend||thisWeekend||nextWeekend,flexible};
}

function inferTraveler(text:string,answer?:string):V50TravelerType|null{
  if(answer==="couple"||answer==="solo"||answer==="family"||answer==="friends")return answer;
  const t=norm([text,answer??""].join(" "));
  if(/παιδ|οικογεν|family|kids|children|paidia|oikogeneia/.test(t))return"family";
  if(/φιλ|παρεα|friends|group|filoi|filous|parea/.test(t))return"friends";
  if(/μονος|μονη|solo|alone|monos|moni/.test(t))return"solo";
  if(/ζευγ|συντροφ|γυναικ|αντρα|wife|husband|partner|couple|zevg|syntrof|gynaik|andra/.test(t))return"couple";
  return null;
}

function inferOutcome(text:string,answer:string|undefined,filters:V50Filters){
  if(answer==="restore"||answer==="stimulating"||answer==="balanced")return answer;
  const t=norm([text,answer??""].join(" "));
  if(/ξεκουρ|ηρεμ|χαλαρ|reset|rest|relax|αποφορ|xekour|ksekour|irem|xalar|apofor/.test(t)||filters.calm>=78)return"restore" as const;
  if(/δραση|περιπετ|ενεργ|adventure|nightlife|party|drasi|peripet|energeia/.test(t)||filters.discovery>=82||filters.nightlife>=78)return"stimulating" as const;
  return"balanced" as const;
}

function inferSocial(text:string,filters:V50Filters){
  const t=norm(text);
  if(/ησυχ|χωρις κοσμο|χωρις πολυ κοσμο|quiet|low crowd|isix|isyx|xwris kosmo/.test(t)||filters.calm>=82)return"quiet" as const;
  if(/nightlife|party|ζωνταν|μπαρ|club|zontan|bar/.test(t)||filters.nightlife>=72)return"lively" as const;
  return"balanced" as const;
}

function inferMustHave(text:string,filters:V50Filters){
  const t=norm(text);
  if(/βουν|ορειν|mountain|chalet|σαλε|φυση|nature|forest|δασ|voun|orein|fysi|das/.test(t)||filters.nature>=88)return"nature" as const;
  if(/θαλασσ|παραλι|beach|sea|νησι|thalass|parali|nisi/.test(t))return"sea" as const;
  if(/πολιτισ|μουσει|ιστορ|culture|museum|heritage|politis|mousei|istor/.test(t))return"culture" as const;
  if(/nightlife|party|club|κλαμπ/.test(t))return"nightlife" as const;
  return"none" as const;
}

function inferAvoid(text:string,friction:string|undefined,filters:V50Filters){
  const t=norm([text,friction??""].join(" "));
  if(/χωρις κοσμο|χωρις πολυ κοσμο|πολυκοσ|τουριστ|crowd|xwris kosmo|xwris poly kosmo|tourist/.test(t)||filters.calm>=88)return"crowds" as const;
  if(/οικονομ|φθην|budget|cheap|κοστος|κόστος|oikonom|fthin|kost/.test(t)||filters.value>=88)return"high-cost" as const;
  if(/κοντα|κοντά|ευκολ|χωρις ταλαιπωρ|short drive|easy access|konta|eukol|efkol|xwris talaipor/.test(t)||friction==="easy-hop")return"long-travel" as const;
  return"none" as const;
}

function inferDistance(friction:string|undefined,text:string){
  if(friction==="easy-hop")return"easy-hop" as const;
  if(friction==="road-trip")return"any" as const;
  const t=norm(text);
  if(/κοντα|κοντά|ευκολ|2 ωρ|3 ωρ|short drive|konta|eukol|efkol/.test(t))return"easy-hop" as const;
  if(/road trip|οδικ|διαδρομ|odiko|diadrom/.test(t))return"any" as const;
  return"any" as const;
}

function inferMoods(text:string,filters:V50Filters):TripRequest["moods"]{
  const t=norm(text),scores:Array<[TripRequest["moods"][number],number]>=[
    ["relax",filters.calm],["food",filters.food],["nature",filters.nature],
    ["culture",filters.discovery*.78],["adventure",filters.discovery],["city",filters.nightlife],
    ["romantic",/ρομαν|ζευγ|couple|partner/.test(t)?90:Math.round((filters.calm+filters.discovery)/2)]
  ];
  if(/βουν|ορειν|mountain|φυση|nature|forest|voun|orein|fysi/.test(t))scores.push(["nature",100],["adventure",84]);
  if(/φαγη|γαστρ|restaurant|food|wine|κρασι|fagito|gastr|krasi/.test(t))scores.push(["food",100]);
  if(/μοναδικ|διαφορετικ|surprise|unique|hidden|monadik|diaforetik/.test(t))scores.push(["adventure",88]);
  if(/ρομαν|ζευγ|couple|partner|romant|zevg|syntrof/.test(t))scores.push(["romantic",96]);
  const best=new Map<TripRequest["moods"][number],number>();
  for(const [m,s] of scores)best.set(m,Math.max(best.get(m)??0,s));
  return [...best.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
}

export function interpretV50Conversation(input:V50ConversationInput,now=new Date()):V50ConversationInterpretation{
  const filters={...defaultFilters,...input.filters};
  const compactText=[input.priorUserText??"",input.userText].filter(Boolean).join(" · ").slice(-1200);
  const dates=parseNaturalWindowV50(compactText,input.answers?.dates,now);
  const travelerType=inferTraveler(compactText,input.answers?.companions);
  const desiredEnergy=inferOutcome(compactText,input.answers?.outcome,filters);
  const socialPreference=inferSocial(compactText,filters);
  const noveltyPreference=/μοναδικ|διαφορετικ|surprise|unique|hidden/i.test(norm(compactText))||filters.discovery>=76?"surprise":"balanced";
  const mustHave=inferMustHave(compactText,filters);
  const terrainIntent=/βουν|ορειν|mountain|chalet|σαλε/i.test(norm(compactText))?"mountain" as const:null;
  const avoid=inferAvoid(compactText,input.answers?.friction,filters);
  const distancePreference=inferDistance(input.answers?.friction,compactText);
  const moods=inferMoods(compactText,filters);
  const signals=[
    dates?"dates":"",
    travelerType?"companions":"",
    desiredEnergy!=="balanced"?"outcome":"",
    socialPreference!=="balanced"?"social":"",
    noveltyPreference==="surprise"?"novelty":"",
    mustHave!=="none"?"must-have":"",
    avoid!=="none"||distancePreference!=="any"?"friction":""
  ].filter(Boolean);
  const confidence=Math.min(.96,.48+signals.length*.075);
  return{
    compactText,startDate:dates?.startDate??null,endDate:dates?.endDate??null,nights:dates?.nights??null,
    weekend:dates?.weekend??false,flexibleDates:dates?.flexible??false,travelerType,desiredEnergy,socialPreference,
    noveltyPreference,mustHave,terrainIntent,avoid,distancePreference,moods,confidence,signals
  };
}

export function nextV50Question(x:V50ConversationInterpretation,answers:V50ConversationInput["answers"]={}):V50Question|null{
  if(!x.startDate||!x.endDate)return{id:"dates",text:"Πότε θέλεις να φύγεις; Μπορείς να μου πεις και φυσικά, π.χ. «το πρώτο ΣΚ μετά τις 10 Οκτωβρίου».",quickReplies:[
    {label:"Αυτό το ΣΚ",value:"αυτό το ΣΚ"},{label:"Επόμενο ΣΚ",value:"επόμενο ΣΚ"},{label:"Είμαι ευέλικτος",value:"ευέλικτες ημερομηνίες"}
  ]};
  if(!x.travelerType)return{id:"companions",text:"Με ποιον θα κάνεις αυτή την απόδραση; Αυτό αλλάζει πολύ το τι θεωρώ καλή λύση.",quickReplies:[
    {label:"Με σύντροφο",value:"couple"},{label:"Μόνος/η",value:"solo"},{label:"Με οικογένεια",value:"family"},{label:"Με φίλους",value:"friends"}
  ]};
  if(x.desiredEnergy==="balanced"&&!answers.outcome)return{id:"outcome",text:"Τι θέλεις να σου δώσει κυρίως αυτό το ταξίδι: reset, εμπειρίες ή λίγο και από τα δύο;",quickReplies:[
    {label:"Να ξεκουραστώ",value:"restore"},{label:"Να ζήσω κάτι διαφορετικό",value:"stimulating"},{label:"Ισορροπία",value:"balanced"}
  ]};
  if(x.distancePreference==="any"&&!answers.friction)return{id:"friction",text:"Πόση μετακίνηση ανέχεσαι για να αξίζει πραγματικά η απόδραση;",quickReplies:[
    {label:"Όσο πιο κοντά γίνεται",value:"easy-hop"},{label:"Μου αρέσει η οδήγηση",value:"road-trip"},{label:"Δεν με περιορίζει",value:"any"}
  ]};
  return null;
}

export function buildV50Trip(input:V50ConversationInput,x:V50ConversationInterpretation):TripRequest{
  if(!x.startDate||!x.endDate||!x.nights||!x.travelerType)throw new Error("v50_trip_incomplete");
  const filters={...defaultFilters,...input.filters},budget=Math.max(150,Math.min(5000,Number(input.budget)||800));
  return{
    origin:(input.origin??"Αθήνα").trim()||"Αθήνα",startDate:x.startDate,endDate:x.endDate,month:"flexible",nights:x.nights,budget,
    moods:x.moods,travelerType:x.travelerType,language:"el",distancePreference:x.distancePreference,
    pace:x.desiredEnergy==="restore"?"slow":x.desiredEnergy==="stimulating"?"full":"balanced",
    hotelStyle:filters.value>=82?"value":"any",avoid:x.avoid,entryMode:"idea",
    groupSize:x.travelerType==="solo"?1:x.travelerType==="couple"?2:4,desiredEnergy:x.desiredEnergy,
    socialPreference:x.socialPreference,noveltyPreference:x.noveltyPreference,mustHave:x.mustHave,
    dateFlexibility:x.flexibleDates?"few-days":"fixed",transportMode:"any",
    stayLocationPreference:x.socialPreference==="quiet"?"outside":"balanced",tripText:x.compactText.slice(0,320)
  };
}
