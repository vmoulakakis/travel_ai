import { notFound } from "next/navigation";
import { loadV8DestinationCatalog, loadV8StayOffers } from "@/lib/data/destination-v8";
import type { Language, Mood, TravelerType, TripRequest } from "@/lib/validation/trip";
import { V33EscapeBuilderClient } from "@/components/v33-escape-builder-client";

export const dynamic = "force-dynamic";
const iso=/^\d{4}-\d{2}-\d{2}$/;
const validMoods=new Set<Mood>(["relax","romantic","food","warmth","city","nature","adventure","culture"]);
const validTravelers=new Set<TravelerType>(["solo","couple","family","friends"]);
const DAY=86_400_000;

type Props={params:Promise<{slug:string}>;searchParams?:Promise<Record<string,string|string[]|undefined>>};

export default async function EscapePage({params,searchParams}:Props){
 const{slug}=await params,query=await searchParams;
 const catalog=await loadV8DestinationCatalog().catch(()=>[]),destination=catalog.find(item=>item.slug===slug);
 if(!destination)notFound();
 const lang:Language=query?.lang==="en"?"en":"el";
 const startRaw=typeof query?.start==="string"?query.start:"",endRaw=typeof query?.end==="string"?query.end:"";
 const fallbackStart=new Date(Date.now()+3*DAY).toISOString().slice(0,10),fallbackEnd=new Date(Date.now()+6*DAY).toISOString().slice(0,10);
 const start=iso.test(startRaw)?startRaw:fallbackStart,end=iso.test(endRaw)&&Date.parse(endRaw)>Date.parse(start)?endRaw:fallbackEnd;
 const budgetRaw=typeof query?.budget==="string"?Number(query.budget):900,budget=Math.max(150,Math.min(5000,Number.isFinite(budgetRaw)?budgetRaw:900));
 const travelerRaw=typeof query?.travelerType==="string"?query.travelerType:"couple",travelerType:TravelerType=validTravelers.has(travelerRaw as TravelerType)?travelerRaw as TravelerType:"couple";
 const moodRaw=typeof query?.mood==="string"?query.mood:"relax",mood:Mood=validMoods.has(moodRaw as Mood)?moodRaw as Mood:"relax";
 const origin=typeof query?.origin==="string"&&query.origin.trim().length>=2?query.origin.trim().slice(0,80):"Athens";
 const nights=Math.max(1,Math.min(14,Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/DAY)));
 const trip:TripRequest={origin,startDate:start,endDate:end,month:"flexible",nights,budget,moods:[mood],travelerType,language:lang,distancePreference:"any",pace:mood==="relax"?"slow":"balanced",hotelStyle:"any",avoid:"none",entryMode:"idea",groupSize:travelerType==="solo"?1:travelerType==="couple"?2:4,desiredEnergy:mood==="adventure"?"stimulating":mood==="relax"?"restore":"balanced",socialPreference:mood==="romantic"?"quiet":"balanced",noveltyPreference:mood==="adventure"?"surprise":"balanced",mustHave:mood==="warmth"?"sea":"none",dateFlexibility:"few-days",transportMode:"any",stayLocationPreference:"balanced"};
 const offers=(await loadV8StayOffers(slug,start,end,12).catch(()=>[])).filter(offer=>offer.trackingUrl.startsWith("https://go.linkwi.se/")&&offer.trackingUrl.includes("/CD104/")).slice(0,6);
 return <V33EscapeBuilderClient slug={slug} name={destination.nameEl} nameEn={destination.nameEn} trip={trip} offers={offers} lang={lang}/>;
}
