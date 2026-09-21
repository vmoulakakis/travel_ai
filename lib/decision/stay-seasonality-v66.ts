export type SeasonalStayFit={
  score:number;
  band:"excellent"|"strong"|"neutral"|"weak";
  archetypes:string[];
  reason:string;
};

export type SeasonalStayInput={
  month:number;
  propertyName:string;
  description?:string|null;
  category?:string|null;
  location?:string|null;
  destinationSlug?:string|null;
  destinationSeasonProfile?:string|null;
  destinationTags?:readonly string[]|null;
};

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const norm=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const has=(text:string,re:RegExp)=>re.test(text);

const RX={
  beach:/beach|sea\s?view|seaside|waterfront|coast|shore|παραλ|θαλασσ|αιγιαλ|παραθαλασσ/,
  resort:/resort|holiday village|all inclusive|club hotel|θερετρ|all inclusive/,
  pool:/pool|πισιν/,
  mountain:/mountain|alpine|forest|fir|stone house|mountain view|βουνο|ορειν|δασ|ελατ|πετριν/,
  chalet:/chalet|cabin|lodge|fireplace|τζακι|σαλε|ξενωνα|guesthouse/,
  ski:/ski|snow|χιονο|πιστα|χιονοδρομ/,
  spa:/spa|wellness|thermal|sauna|hamam|hammam|massage|ευεξ|θερμ|σαουνα|μασαζ/,
  boutique:/boutique|design hotel|heritage|historic|μπουτικ|αρχοντικ|παραδοσιακ/,
  city:/city|centre|center|downtown|urban|old town|κεντρ|πολη/,
  apartment:/apartment|studio|suite|villa|kitchen|διαμερισ|στούντιο|στουντιο|βιλα|κουζιν/,
  nature:/garden|nature|trail|rural|farm|vineyard|view|κηπ|φυσ|μονοπατ|αγροτ|αμπελ|θεα/
};

function archetypes(text:string){
  const out:string[]=[];
  for(const [key,re] of Object.entries(RX))if(has(text,re))out.push(key);
  return out;
}

function destinationKind(input:SeasonalStayInput){
  const profile=norm(input.destinationSeasonProfile??"");
  const slug=norm(input.destinationSlug??"");
  const tags=new Set(input.destinationTags??[]);
  const mountainSlugs=new Set(["arachova","kalavryta","metsovo","zagori","karpenisi","vytina","palaios agios athanasios","pelion","pilion"]);
  const mixedSlugs=new Set(["pelion","pilion"]);
  if(mixedSlugs.has(slug))return "mixed_mountain_sea";
  if(profile.includes("mountain")||mountainSlugs.has(slug))return "mountain";
  if(profile.includes("summer island")||profile.includes("summer_island"))return "summer_island";
  if(profile.includes("shoulder island")||profile.includes("shoulder_island"))return "shoulder_island";
  if(profile.includes("city med")||profile.includes("city_med")||profile.includes("coast city")||profile.includes("coast_city"))return "coast_city";
  if(profile.includes("city"))return "city";
  if(tags.has("beach")&&tags.has("nature"))return "coast_nature";
  if(tags.has("beach"))return "coast";
  if(tags.has("city"))return "city";
  if(tags.has("nature"))return "nature";
  return "generic";
}

function band(score:number):SeasonalStayFit["band"]{
  return score>=84?"excellent":score>=72?"strong":score>=52?"neutral":"weak";
}

export function seasonalStayFit(input:SeasonalStayInput):SeasonalStayFit{
  const month=Math.max(1,Math.min(12,Math.round(input.month||1)));
  const text=norm([input.propertyName,input.description??"",input.category??"",input.location??""].join(" "));
  const a=archetypes(text),kind=destinationKind(input),summer=[6,7,8,9].includes(month),winter=[12,1,2].includes(month),shoulder=[3,4,5,10,11].includes(month);
  let score=60;
  const reasons:string[]=[];
  const add=(n:number,label:string)=>{score+=n;if(n>=8)reasons.push(label)};
  const sub=(n:number)=>{score-=n};

  if(kind==="mixed_mountain_sea"){
    if(winter){
      if(a.includes("mountain")||a.includes("chalet")||a.includes("ski"))add(24,"mountain/winter character");
      if(a.includes("spa"))add(12,"wellness fit");
      if(a.includes("boutique"))add(8,"traditional/boutique base");
      if(a.includes("beach")||a.includes("pool")||a.includes("resort"))sub(14);
    }else if(summer){
      if(a.includes("beach"))add(24,"sea access");
      if(a.includes("pool")||a.includes("resort"))add(16,"summer facilities");
      if(a.includes("nature")||a.includes("boutique")||a.includes("chalet"))add(9,"Pelion nature base");
    }else{
      if(a.includes("nature")||a.includes("boutique")||a.includes("chalet"))add(18,"shoulder-season nature base");
      if(a.includes("spa"))add(10,"wellness fit");
      if(a.includes("beach"))add(6,"coastal flexibility");
    }
  }else if(kind==="mountain"){
    if(winter){
      if(a.includes("mountain")||a.includes("chalet")||a.includes("ski"))add(26,"winter mountain base");
      if(a.includes("spa"))add(12,"winter wellness");
      if(a.includes("boutique"))add(8,"traditional mountain character");
      if(a.includes("beach")||a.includes("resort")||a.includes("pool"))sub(18);
    }else if(shoulder){
      if(a.includes("nature")||a.includes("chalet")||a.includes("boutique"))add(18,"hiking/shoulder-season base");
      if(a.includes("spa"))add(8,"wellness fit");
      if(a.includes("ski"))sub(8);
    }else{
      if(a.includes("nature")||a.includes("boutique"))add(12,"cooler nature base");
      if(a.includes("ski"))sub(12);
      if(a.includes("pool"))add(4,"summer amenity");
    }
  }else if(kind==="summer_island"){
    if(summer){
      if(a.includes("beach"))add(24,"beach access");
      if(a.includes("resort")||a.includes("pool"))add(18,"summer resort facilities");
      if(a.includes("apartment"))add(8,"summer-stay practicality");
      if(a.includes("boutique"))add(8,"island boutique fit");
    }else if(shoulder){
      if(a.includes("boutique")||a.includes("apartment")||a.includes("nature"))add(14,"shoulder-season flexibility");
      if(a.includes("beach"))add(8,"coastal access");
      if(a.includes("resort")||a.includes("pool"))add(3,"season-dependent facilities");
    }else{
      if(a.includes("boutique")||a.includes("city")||a.includes("apartment"))add(10,"off-season practical base");
      if(a.includes("resort")||a.includes("pool")||a.includes("beach"))sub(16);
    }
  }else if(kind==="shoulder_island"){
    if(summer){
      if(a.includes("beach")||a.includes("pool")||a.includes("resort"))add(18,"summer island fit");
      if(a.includes("boutique")||a.includes("apartment"))add(8,"flexible island base");
    }else if(shoulder){
      if(a.includes("boutique")||a.includes("nature")||a.includes("apartment"))add(18,"shoulder-season island fit");
      if(a.includes("beach"))add(10,"coastal access");
    }else{
      if(a.includes("boutique")||a.includes("apartment"))add(10,"off-season practical base");
      if(a.includes("resort")||a.includes("pool"))sub(12);
    }
  }else if(kind==="coast_city"||kind==="coast_nature"||kind==="coast"){
    if(summer){
      if(a.includes("beach")||a.includes("resort")||a.includes("pool"))add(18,"summer coastal fit");
      if(a.includes("boutique")||a.includes("city"))add(7,"walkable/coastal base");
    }else if(shoulder){
      if(a.includes("boutique")||a.includes("city")||a.includes("nature"))add(14,"shoulder-season flexibility");
      if(a.includes("beach"))add(7,"coastal access");
      if(a.includes("spa"))add(6,"wellness fit");
    }else{
      if(a.includes("city")||a.includes("boutique")||a.includes("spa"))add(14,"winter-friendly base");
      if(a.includes("resort")||a.includes("pool"))sub(8);
    }
  }else if(kind==="city"){
    if(a.includes("city")||a.includes("boutique"))add(16,"all-year city base");
    if(a.includes("apartment"))add(7,"city-stay practicality");
    if(winter&&a.includes("spa"))add(8,"winter wellness");
    if(winter&&(a.includes("resort")||a.includes("beach")))sub(5);
  }else{
    if(shoulder&&(a.includes("nature")||a.includes("boutique")))add(10,"shoulder-season flexibility");
    if(summer&&(a.includes("beach")||a.includes("pool")))add(10,"summer facilities");
    if(winter&&(a.includes("spa")||a.includes("chalet")))add(10,"winter comfort");
  }

  if(a.length===0)score+=2;
  score=clamp(Math.round(score),20,100);
  return{
    score,
    band:band(score),
    archetypes:a,
    reason:reasons.length?reasons.slice(0,2).join(" + "):"seasonally neutral accommodation"
  };
}
