import { NextResponse } from "next/server";
import { parseTripRequest } from "@/lib/validation/trip";
import { loadV8DestinationCatalog,loadV8StayOffers } from "@/lib/data/destination-v8";
import { getLocalIntelligenceV38 } from "@/lib/data/local-intelligence-v38";
import { getDailyTripWeatherV25 } from "@/lib/data/trip-weather-v25";
import { createLLMRequestBudgetV16,generateJsonWithRoutingV16 } from "@/lib/ai/model-router-v9";
import { loadTravelerContextV45,travelerProfileKeyFromRequest } from "@/lib/ai/travel-intelligence-v45";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=15;

const slugPattern=/^[a-z0-9-]{2,80}$/i,idPattern=/^[a-zA-Z0-9:_-]{1,180}$/;
const clip=(v:unknown,n:number)=>typeof v==="string"?v.trim().slice(0,n):"";
const summer=(start:string,end:string)=>{for(let t=Date.parse(`${start}T00:00:00Z`),last=Date.parse(`${end}T00:00:00Z`);t<=last;t+=86400000){const m=new Date(t).getUTCMonth()+1;if(m>=6&&m<=9)return true}return false};

async function within<T>(promise:Promise<T>,ms:number):Promise<T|null>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([promise,new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),ms)})])}
 finally{if(timer)clearTimeout(timer)}
}

const isSlow=(s:string)=>/slow|slower|quiet|relax|ηρεμ|χαλαρ|ξεκουρ|λιγοτερ|λιγότερ/i.test(s);
const isFull=(s:string)=>/full|active|adventure|γεματ|δραστ|περισσοτερ|περισσότερ/i.test(s);
const asksFood=(s:string)=>/food|restaurant|eat|φαγη|εστιατορ|ταβερν|γαστρο/i.test(s);
const asksNearby=(s:string)=>/near|nearby|around|κοντα|κοντά|γυρω|γύρω|visit|δω|μερη|μέρη|αξιοθε/i.test(s);
const asksWeather=(s:string)=>/weather|temperature|rain|καιρ|θερμοκρα|βροχ/i.test(s);

export async function POST(request:Request){
 try{
  const body=await request.json() as Record<string,unknown>,message=clip(body.message,600),slug=clip(body.slug,80).toLowerCase(),offerId=clip(body.offerId,180),parsed=parseTripRequest(body.trip);
  if(!message||!slugPattern.test(slug)||!idPattern.test(offerId)||!parsed.success)return NextResponse.json({message:"Invalid agent request"},{status:400});
  const trip=parsed.data,profileKey=travelerProfileKeyFromRequest(request);
  const base=await within(Promise.all([loadV8DestinationCatalog(),loadV8StayOffers(slug,trip.startDate,trip.endDate,60),profileKey?loadTravelerContextV45(profileKey):Promise.resolve(null)]),2800);
  if(!base)return NextResponse.json({reply:trip.language==="en"?"I got that. I’m keeping your selected stay fixed and I’ll apply the change without blocking the trip flow.":"Το πήρα. Κρατάω το επιλεγμένο κατάλυμα σταθερό και εφαρμόζω την αλλαγή χωρίς να μπλοκάρω τη ροή του ταξιδιού.",preferenceTags:[],grounded:false,degraded:true},{headers:{"cache-control":"no-store","x-travel-agent-mode":"fast-fallback"}});
  const[catalog,offers,travelerMemory]=base,destination=catalog.find(x=>x.slug===slug),stay=offers.find(x=>x.sourceProductId===offerId);
  if(!destination||!stay)return NextResponse.json({reply:trip.language==="en"?"I kept your trip context. This stay is no longer available in the current inventory, so I can continue with the destination or help you choose another verified stay.":"Κράτησα το πλαίσιο του ταξιδιού σου. Αυτό το κατάλυμα δεν εμφανίζεται πλέον στο τρέχον inventory, οπότε μπορώ να συνεχίσω με τον προορισμό ή να σου βρω άλλο επιβεβαιωμένο stay.",preferenceTags:[],grounded:false,degraded:true},{status:200,headers:{"cache-control":"no-store","x-travel-agent-mode":"inventory-changed"}});
  const destinationName=trip.language==="en"?destination.nameEn:destination.nameEl;
  const fallbackBase=trip.language==="en"?`I’ve kept your selected stay (${stay.propertyName}) fixed. I’ll adjust the trip around it without making you choose accommodation again.`:`Κρατάω σταθερό το επιλεγμένο κατάλυμα (${stay.propertyName}). Θα προσαρμόσω το ταξίδι γύρω του χωρίς να σε βάλω να ξαναδιαλέξεις κατάλυμα.`;

  if(isSlow(message))return NextResponse.json({reply:trip.language==="en"?`Done. I’ll slow the itinerary around ${stay.propertyName}: fewer stops, more breathing room and no marathon days.`:`Έγινε. Κατεβάζω τον ρυθμό γύρω από το ${stay.propertyName}: λιγότερες στάσεις, περισσότερο κενό και χωρίς ημέρες-μαραθώνιο.`,preferenceTags:["slow","quiet","relax"],grounded:true,degraded:false},{headers:{"cache-control":"no-store","x-travel-agent-mode":"instant"}});
  if(isFull(message))return NextResponse.json({reply:trip.language==="en"?`Done. I’ll make the plan fuller around ${stay.propertyName}, while keeping travel time realistic.`:`Έγινε. Γεμίζω περισσότερο το πρόγραμμα γύρω από το ${stay.propertyName}, αλλά κρατάω ρεαλιστικούς χρόνους μετακίνησης.`,preferenceTags:["full","active"],grounded:true,degraded:false},{headers:{"cache-control":"no-store","x-travel-agent-mode":"instant"}});

  const lat=stay.latitude??destination.latitude,lon=stay.longitude??destination.longitude;
  const[local,weather]=await Promise.all([
   within(getLocalIntelligenceV38({destinationSlug:slug,destinationName,hotelName:stay.propertyName,latitude:lat,longitude:lon,isSummer:summer(trip.startDate,trip.endDate),language:trip.language==="en"?"en":"el"}).catch(()=>null),2200),
   within(getDailyTripWeatherV25(trip,lat,lon).catch(()=>null),2200)
  ]);
  const safeLocal=local??null,safeWeather=weather??null;
  const places=safeLocal?[...safeLocal.attractions.slice(0,4),...safeLocal.restaurants.slice(0,4),...safeLocal.nightlife.slice(0,3),...safeLocal.beaches.slice(0,3)].map(p=>({name:p.name,kind:p.kind,rating:p.rating,reviews:p.ratingCount,distanceKm:p.distanceKm,address:p.address,source:p.source})):[];
  const weatherText=safeWeather?.days.map(d=>`${d.date}: ${d.summary}${d.temperatureMaxC!=null?`, ${d.temperatureMaxC}C`:""}`).join(" | ")??"";

  if(asksWeather(message)){
   const days=safeWeather?.days.slice(0,3)??[];
   const reply=days.length?(trip.language==="en"?`Verified forecast for the trip: ${days.map(d=>`${d.date} ${d.summary}${d.temperatureMaxC!=null?` ${d.temperatureMaxC}°C`:""}`).join(" · ")}.`:`Επαληθευμένη πρόγνωση για το ταξίδι: ${days.map(d=>`${d.date} ${d.summary}${d.temperatureMaxC!=null?` ${d.temperatureMaxC}°C`:""}`).join(" · ")}.`):(trip.language==="en"?"The forecast is not confirmed yet for these dates. I’ll keep the rest of your plan intact and add weather guidance when verified data is available.":"Η πρόγνωση δεν έχει επιβεβαιωθεί ακόμη για αυτές τις ημερομηνίες. Κρατάω κανονικά το υπόλοιπο πλάνο και θα χρησιμοποιήσω καιρικά στοιχεία μόνο όταν είναι επαληθευμένα.");
   return NextResponse.json({reply,preferenceTags:[],grounded:days.length>0,degraded:!days.length},{headers:{"cache-control":"no-store","x-travel-agent-mode":"grounded-fast"}});
  }
  if(asksFood(message)&&safeLocal){
   const rows=safeLocal.restaurants.filter(p=>p.name).slice(0,3);
   if(rows.length){const reply=(trip.language==="en"?"Near your selected stay, I can ground the food plan around: ":"Κοντά στο επιλεγμένο stay μπορώ να στηρίξω το φαγητό στα: ")+rows.map(p=>`${p.name}${p.rating!=null?` ${p.rating.toFixed(1)}★`:""}${p.ratingCount?` (${p.ratingCount})`:""}`).join(" · ");return NextResponse.json({reply,preferenceTags:["food"],grounded:true,degraded:false,providers:safeLocal.providers},{headers:{"cache-control":"no-store","x-travel-agent-mode":"grounded-fast"}})}
  }
  if(asksNearby(message)&&safeLocal){
   const rows=[...safeLocal.attractions,...safeLocal.beaches,...safeLocal.museums].filter(p=>p.name).slice(0,3);
   if(rows.length){const reply=(trip.language==="en"?"Useful verified options around your stay: ":"Χρήσιμες επαληθευμένες επιλογές γύρω από το stay: ")+rows.map(p=>`${p.name}${p.distanceKm!=null?` · ${p.distanceKm.toFixed(1)} km`:""}${p.rating!=null?` · ${p.rating.toFixed(1)}★`:""}`).join(" | ");return NextResponse.json({reply,preferenceTags:[],grounded:true,degraded:false,providers:safeLocal.providers},{headers:{"cache-control":"no-store","x-travel-agent-mode":"grounded-fast"}})}
  }

  const system="You are the Travel Agent inside a Greek travel decision product. Answer as a concise expert concierge. Use only the supplied grounded trip/stay/weather/place context. Persistent traveler memory is a soft preference prior only: the current message and current trip always win, and remembered preferences may never create facts or override explicit current constraints. Never invent ratings, events, availability, prices or review claims. Do not give external links. Keep the selected accommodation fixed unless the user explicitly asks to reconsider it. If evidence is missing, say so. Reply in the user's language.";
  const routed=await within(generateJsonWithRoutingV16<{reply:string;preferenceTags:string[]}>({
   context:{task:"research",text:message,deterministicConfidence:.72,forceSemantic:true},budget:createLLMRequestBudgetV16(),preference:"critical",
   system,
   prompt:JSON.stringify({message,trip:{origin:trip.origin,startDate:trip.startDate,endDate:trip.endDate,nights:trip.nights,budget:trip.budget,moods:trip.moods,travelerType:trip.travelerType,pace:trip.pace},travelerMemory:travelerMemory?{learnedPreferences:travelerMemory.learnedPreferences??{},confidence:travelerMemory.confidence??0}:null,destination:destinationName,stay:{name:stay.propertyName,city:stay.city,address:stay.address,price:stay.price,currency:stay.currency},weather:weatherText,nearbyPlaces:places,providers:safeLocal?.providers??[]}),
   validate:value=>typeof value.reply==="string"&&value.reply.trim()?{reply:value.reply.trim().slice(0,900),preferenceTags:Array.isArray(value.preferenceTags)?value.preferenceTags.filter((x):x is string=>typeof x==="string").slice(0,6):[]}:null
  }),1800);
  return NextResponse.json({reply:routed?.value.reply??fallbackBase,preferenceTags:routed?.value.preferenceTags??[],grounded:Boolean(safeLocal||safeWeather),degraded:!routed,providers:safeLocal?.providers??[]},{headers:{"cache-control":"no-store","x-travel-agent-mode":routed?"semantic-bounded":"fast-fallback"}});
 }catch{
  return NextResponse.json({reply:"Κράτησα την επιλογή σου και το ταξίδι συνεχίζει κανονικά. Μπορείς να αλλάξεις ρυθμό, δραστηριότητες ή προτεραιότητες χωρίς να ξαναστήσουμε το πλάνο από την αρχή.",preferenceTags:[],grounded:false,degraded:true},{status:200,headers:{"cache-control":"no-store","x-travel-agent-mode":"fail-safe"}})
 }
}
