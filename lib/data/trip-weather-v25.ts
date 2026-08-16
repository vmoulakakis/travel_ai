import { getWeatherEvidence } from "@/lib/data/weather";
import type { DailyWeatherV25 } from "@/lib/trip-builder/types-v25";
import type { TripRequest } from "@/lib/validation/trip";

const DAY=86_400_000;
const iso=(value:number)=>new Date(value).toISOString().slice(0,10);
const finite=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;
const round1=(value:number)=>Math.round(value*10)/10;

type ForecastPayload={daily?:{time?:unknown[];weather_code?:unknown[];temperature_2m_max?:unknown[];temperature_2m_min?:unknown[];precipitation_probability_max?:unknown[];precipitation_sum?:unknown[];wind_speed_10m_max?:unknown[]}};

function weatherWord(code:number|null,language:"el"|"en"){
 if(code==null)return language==="el"?"χωρίς σαφή πρόγνωση":"forecast unclear";
 if(code===0)return language==="el"?"αίθριος":"clear";
 if(code<=3)return language==="el"?"λίγες νεφώσεις":"partly cloudy";
 if(code<=48)return language==="el"?"ομίχλη / χαμηλή νέφωση":"fog or low cloud";
 if(code<=67)return language==="el"?"βροχή":"rain";
 if(code<=77)return language==="el"?"χιονόπτωση":"snow";
 if(code<=82)return language==="el"?"μπόρες":"showers";
 return language==="el"?"πιθανές καταιγίδες":"possible thunderstorms";
}
function dateList(start:string,end:string){const out:string[]=[];for(let t=Date.parse(`${start}T00:00:00Z`),last=Date.parse(`${end}T00:00:00Z`);t<=last;t+=DAY)out.push(iso(t));return out}
function scoreDays(days:DailyWeatherV25[]){if(!days.length)return null;const scored=days.map(day=>{const max=day.temperatureMaxC??20,min=day.temperatureMinC??14,rain=day.precipitationProbability??Math.min(100,(day.precipitationMm??0)*14),wind=day.windKmh??18;let score=90;if(max<16)score-=(16-max)*5;if(max>34)score-=(max-34)*4;if(min<8)score-=(8-min)*2;score-=rain*.22;score-=Math.max(0,wind-28)*.8;return Math.max(0,Math.min(100,score))});return Math.round(scored.reduce((a,b)=>a+b,0)/scored.length)}
function label(score:number|null,source:DailyWeatherV25["source"],language:"el"|"en"){
 if(score==null)return language==="el"?"Δεν υπάρχει ασφαλές weather signal":"No safe weather signal";
 const quality=score>=82?(language==="el"?"πολύ καλό":"very good"):score>=68?(language==="el"?"καλό":"good"):score>=52?(language==="el"?"μικτό":"mixed"):(language==="el"?"αδύναμο":"weak");
 const kind=source==="forecast"?(language==="el"?"πρόγνωση":"forecast"):(language==="el"?"τυπική εποχική εικόνα":"typical seasonal picture");return`${quality} · ${kind}`;
}

async function liveForecast(trip:TripRequest,lat:number,lon:number):Promise<DailyWeatherV25[]|null>{
 const today=Date.parse(`${new Date().toISOString().slice(0,10)}T00:00:00Z`),start=Date.parse(`${trip.startDate}T00:00:00Z`),end=Date.parse(`${trip.endDate}T00:00:00Z`),daysAhead=Math.floor((start-today)/DAY),endAhead=Math.ceil((end-today)/DAY);
 if(daysAhead<0||endAhead>16)return null;
 const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:trip.startDate,end_date:trip.endDate,daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max",timezone:"auto"});
 try{const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{cache:"no-store",signal:AbortSignal.timeout(5000)});if(!response.ok)return null;const payload=await response.json() as ForecastPayload,d=payload.daily??{},times=Array.isArray(d.time)?d.time:[];return times.map((raw,index)=>{const date=String(raw),code=finite(d.weather_code?.[index]),min=finite(d.temperature_2m_min?.[index]),max=finite(d.temperature_2m_max?.[index]),prob=finite(d.precipitation_probability_max?.[index]),rain=finite(d.precipitation_sum?.[index]),wind=finite(d.wind_speed_10m_max?.[index]),language=trip.language==="en"?"en":"el";return{date,source:"forecast",confidence:"HIGH",temperatureMinC:min==null?null:round1(min),temperatureMaxC:max==null?null:round1(max),precipitationProbability:prob==null?null:Math.round(prob),precipitationMm:rain==null?null:round1(rain),windKmh:wind==null?null:round1(wind),weatherCode:code==null?null:Math.round(code),summary:language==="el"?`${weatherWord(code,language)}, ${min==null?"?":Math.round(min)}–${max==null?"?":Math.round(max)}°C${prob==null?"":` · βροχή ${Math.round(prob)}%`}`:`${weatherWord(code,language)}, ${min==null?"?":Math.round(min)}–${max==null?"?":Math.round(max)}°C${prob==null?"":` · rain ${Math.round(prob)}%`}`};})}catch{return null}
}

export async function getDailyTripWeatherV25(trip:TripRequest,lat:number,lon:number){
 const language=trip.language==="en"?"en":"el",forecast=await liveForecast(trip,lat,lon);if(forecast?.length){const score=scoreDays(forecast);return{days:forecast,score,label:label(score,"forecast",language)}}
 const evidence=await getWeatherEvidence(trip,{latitude:lat,longitude:lon} as never),dates=dateList(trip.startDate,trip.endDate),days:DailyWeatherV25[]=dates.map(date=>({date,source:evidence.source==="unavailable"?"unavailable":"typical",confidence:evidence.confidence,temperatureMinC:evidence.temperatureMinC??null,temperatureMaxC:evidence.temperatureMaxC??null,precipitationProbability:null,precipitationMm:evidence.precipitationMmDay??null,windKmh:evidence.windKmh??null,weatherCode:null,summary:evidence.source==="unavailable"?evidence.summary:(language==="el"?`Τυπική εποχική εικόνα: ${evidence.temperatureMinC==null?"?":Math.round(evidence.temperatureMinC)}–${evidence.temperatureMaxC==null?"?":Math.round(evidence.temperatureMaxC)}°C. Δεν είναι ημερήσια πρόγνωση.`:`Typical seasonal picture: ${evidence.temperatureMinC==null?"?":Math.round(evidence.temperatureMinC)}–${evidence.temperatureMaxC==null?"?":Math.round(evidence.temperatureMaxC)}°C. This is not a daily forecast.`)}));
 const score=evidence.source==="unavailable"?null:evidence.score;return{days,score,label:label(score,days[0]?.source??"unavailable",language)}
}
