import type { LocalityProfileV23 } from "@/lib/data/locality-profiles-v23";
import { V8_DIMENSIONS,type V8Destination,type V8Dimension } from "@/lib/decision/v8-types";

const map24:Record<V8Dimension,number>={romantic:1,relax:0,food:2,culture:7,city:4,nature:5,beach:19,adventure:6,nightlife:20,family:12,luxury:8,value:11,warmth:17,wellness:21,short_break:22,shoulder_season:23};
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const safeSlug=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,64)||"locality";
function v(locality:LocalityProfileV23,index:number){return clamp(locality.semanticVector[index]??.5)}
function vector16(locality:LocalityProfileV23){return V8_DIMENSIONS.map(d=>v(locality,map24[d]));}
function tags(locality:LocalityProfileV23){const vector=vector16(locality);return V8_DIMENSIONS.filter((_,i)=>vector[i]>=.62);}
function monthFit(locality:LocalityProfileV23){const allWeather=v(locality,18),warm=v(locality,17),beach=v(locality,19),shoulder=v(locality,23),nature=v(locality,5),city=v(locality,4);return Array.from({length:12},(_,i)=>{const m=i+1;let score=55+allWeather*18+city*5;if(m>=6&&m<=9)score+=warm*12+beach*15;if([4,5,9,10].includes(m))score+=shoulder*12+nature*5;if([11,12,1,2].includes(m)&&beach>.65)score-=14;if([7,8].includes(m)&&warm<.35)score-=5;return Math.max(35,Math.min(92,Math.round(score)));});}
function costTier(locality:LocalityProfileV23):1|2|3|4|5{const luxury=v(locality,8),value=v(locality,11);const raw=3+(luxury-.5)*2-(value-.5)*1.4;return Math.max(1,Math.min(5,Math.round(raw))) as 1|2|3|4|5;}
function crowdLevel(locality:LocalityProfileV23):1|2|3|4|5{const city=v(locality,4),night=v(locality,20),relax=v(locality,0);const raw=3+(city-.5)*1.2+(night-.5)*1.1-(relax-.5)*.8;return Math.max(1,Math.min(5,Math.round(raw))) as 1|2|3|4|5;}
function travelerFit(locality:LocalityProfileV23){return{family:v(locality,12),couple:v(locality,13),solo:v(locality,14),friends:v(locality,15)};}

export function buildLocalityCandidateCatalogV24(canonical:V8Destination[],localities:LocalityProfileV23[]):V8Destination[]{
 const bySlug=new Map(canonical.map(d=>[d.slug,d] as const));
 return localities.map((locality,index)=>{const parent=locality.canonicalSlug?bySlug.get(locality.canonicalSlug):undefined,slug=`loc-${safeSlug(locality.localityId)}-${index.toString(36)}`;return{
   slug,nameEl:locality.locationLabel,nameEn:locality.locationLabel,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude:locality.latitude,longitude:locality.longitude,
   regionGroup:parent?.regionGroup??"locality-only",aliases:[locality.locationLabel,...(parent?.aliases??[])],tags:tags(locality),vector:vector16(locality),monthFit:parent?.monthFit??monthFit(locality),
   idealNightsMin:parent?.idealNightsMin??2,idealNightsMax:parent?.idealNightsMax??5,costTier:parent?.costTier??costTier(locality),effortAthens:parent?.effortAthens??"medium",effortThessaloniki:parent?.effortThessaloniki??"medium",
   directFromAthens:parent?.directFromAthens??false,routeConfidence:parent?Math.max(.45,Math.min(.95,parent.routeConfidence*.92)):Math.max(.25,Math.min(.55,locality.profileConfidence*.55)),travelerFit:parent?.travelerFit??travelerFit(locality),
   crowdLevel:parent?.crowdLevel??crowdLevel(locality),hotelRadiusKm:8,knowledgeSource:"locality-profile-v24",seasonProfile:parent?.seasonProfile??"locality-derived",
   localityId:locality.localityId,localityLabel:locality.locationLabel,canonicalParentSlug:locality.canonicalSlug,localityProfileConfidence:locality.profileConfidence,
  };});
}
