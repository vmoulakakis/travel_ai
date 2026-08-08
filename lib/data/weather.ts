import type { AffiliateDestinationCandidate, WeatherEvidence } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

const NASA_BASE = "https://power.larc.nasa.gov/api/temporal/climatology/point";
const OPEN_METEO_BASE = "https://customer-api.open-meteo.com/v1/forecast";
const monthKeys = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"] as const;
const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));
const round1=(v:number)=>Math.round(v*10)/10;
const finite=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;

type NasaPayload={properties?:{parameter?:Record<string,Record<string,number>>}};
type ForecastPayload={daily?:Record<string,unknown[]>};

function daysByMonth(startDate:string,endDate:string){
  const out=new Map<number,number>();
  let d=new Date(`${startDate}T00:00:00Z`),end=new Date(`${endDate}T00:00:00Z`);
  while(d<end){const m=d.getUTCMonth();out.set(m,(out.get(m)??0)+1);d=new Date(d.getTime()+86400000)}
  return out;
}
function weightedMonthValue(param:Record<string,number>|undefined,weights:Map<number,number>){
  if(!param)return null;let sum=0,days=0;
  for(const[m,w]of weights){const v=finite(param[monthKeys[m]]);if(v==null||v<=-900)continue;sum+=v*w;days+=w}
  return days?sum/days:null;
}
function weatherScore(request:TripRequest,values:{min:number|null;mean:number|null;max:number|null;rain:number|null;wind:number|null;sun:number|null}){
  const max=values.max??values.mean??18,mean=values.mean??max,min=values.min??mean-6;
  const wantsWarm=request.moods.includes("warmth");
  const activeOutdoor=request.moods.some(x=>x==="nature"||x==="adventure");
  const cultureCity=request.moods.some(x=>x==="city"||x==="culture"||x==="food");
  const idealLow=wantsWarm?22:activeOutdoor?14:cultureCity?13:16;
  const idealHigh=wantsWarm?31:activeOutdoor?29:30;
  let tempScore=max>=idealLow&&max<=idealHigh?96:max<idealLow?clamp(96-(idealLow-max)*8):clamp(96-(max-idealHigh)*5);
  if(min<4)tempScore-=Math.min(25,(4-min)*4);
  const rain=values.rain??2.5,rainScore=clamp(100-rain*16);
  const windKmh=(values.wind??4)*3.6,windScore=clamp(100-Math.max(0,windKmh-14)*2.4);
  const sun=values.sun??3.5,sunScore=clamp(30+sun*13);
  let score=tempScore*.42+rainScore*.25+sunScore*.22+windScore*.11;
  if(wantsWarm&&max<20)score-=25;
  if(request.distancePreference==="island"&&max<18)score-=12;
  return Math.round(clamp(score));
}
function summary(request:TripRequest,score:number,values:{min:number|null;mean:number|null;max:number|null;rain:number|null;wind:number|null;sun:number|null},source:"forecast"|"climatology"){
  const lang=request.language==="en"?"en":"el";
  const range=values.max!=null?`${Math.round(values.min??values.mean??0)}–${Math.round(values.max)}°C`:lang==="el"?"χωρίς θερμοκρασία":"temperature unavailable";
  const rain=values.rain!=null?`${round1(values.rain)} mm/day`:lang==="el"?"χωρίς βροχή":"rain unavailable";
  if(lang==="en")return `${source==="forecast"?"Forecast":"Typical climate"}: ${range}, ${rain}. Weather fit ${score}/100 for this trip.`;
  return `${source==="forecast"?"Πρόγνωση":"Τυπικό κλίμα"}: ${range}, ${rain}. Weather fit ${score}/100 για αυτό το ταξίδι.`;
}

async function forecastWeather(request:TripRequest,lat:number,lon:number):Promise<WeatherEvidence|null>{
  const key=process.env.OPEN_METEO_API_KEY;if(!key)return null;
  const today=new Date();today.setUTCHours(0,0,0,0);const start=new Date(`${request.startDate}T00:00:00Z`);
  const daysAhead=Math.round((start.getTime()-today.getTime())/86400000);if(daysAhead<0||daysAhead>15)return null;
  const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:request.startDate,end_date:request.endDate,daily:"temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,sunshine_duration,wind_speed_10m_max",timezone:"auto",apikey:key});
  try{
    const response=await fetch(`${OPEN_METEO_BASE}?${params}`,{next:{revalidate:1800},signal:AbortSignal.timeout(4500)});if(!response.ok)return null;
    const payload=await response.json() as ForecastPayload,d=payload.daily??{};
    const nums=(k:string)=>(Array.isArray(d[k])?d[k]:[]).map(finite).filter((x):x is number=>x!=null);
    const avg=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
    const maxs=nums("temperature_2m_max"),mins=nums("temperature_2m_min"),means=nums("temperature_2m_mean"),rain=nums("precipitation_sum"),sun=nums("sunshine_duration"),wind=nums("wind_speed_10m_max");
    const values={min:mins.length?Math.min(...mins):null,mean:avg(means),max:maxs.length?Math.max(...maxs):null,rain:avg(rain),wind:avg(wind)?.valueOf()??null,sun:avg(sun)?.valueOf()!=null?(avg(sun) as number)/3600:null};
    const score=weatherScore(request,{...values,wind:values.wind==null?null:values.wind/3.6});
    const good=maxs.length?maxs.filter((x,i)=>{const p=rain[i]??0;return x>=14&&x<=32&&p<=5}).length:null;
    return{source:"forecast",sourceLabel:"Open-Meteo forecast",score,confidence:"HIGH",typical:false,temperatureMinC:values.min==null?null:round1(values.min),temperatureMeanC:values.mean==null?null:round1(values.mean),temperatureMaxC:values.max==null?null:round1(values.max),precipitationMmDay:values.rain==null?null:round1(values.rain),windKmh:values.wind==null?null:round1(values.wind),sunSignal:values.sun==null?null:round1(values.sun),goodWeatherDays:good,totalDays:maxs.length||null,summary:summary(request,score,{...values,wind:values.wind==null?null:values.wind/3.6},"forecast"),researchedAt:new Date().toISOString()};
  }catch{return null}
}

async function climatologyWeather(request:TripRequest,lat:number,lon:number):Promise<WeatherEvidence>{
  const weights=daysByMonth(request.startDate,request.endDate);
  const params=new URLSearchParams({parameters:"T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,WS10M,ALLSKY_SFC_SW_DWN",community:"AG",longitude:String(Math.round(lon*100)/100),latitude:String(Math.round(lat*100)/100),format:"JSON",start:"2015",end:"2024"});
  try{
    const response=await fetch(`${NASA_BASE}?${params}`,{next:{revalidate:604800},signal:AbortSignal.timeout(5500)});if(!response.ok)throw new Error(`NASA POWER ${response.status}`);
    const payload=await response.json() as NasaPayload,p=payload.properties?.parameter??{};
    const values={min:weightedMonthValue(p.T2M_MIN,weights),mean:weightedMonthValue(p.T2M,weights),max:weightedMonthValue(p.T2M_MAX,weights),rain:weightedMonthValue(p.PRECTOTCORR,weights),wind:weightedMonthValue(p.WS10M,weights),sun:weightedMonthValue(p.ALLSKY_SFC_SW_DWN,weights)};
    const score=weatherScore(request,values);
    return{source:"climatology",sourceLabel:"NASA POWER 2015–2024 climatology",score,confidence:"MEDIUM",typical:true,temperatureMinC:values.min==null?null:round1(values.min),temperatureMeanC:values.mean==null?null:round1(values.mean),temperatureMaxC:values.max==null?null:round1(values.max),precipitationMmDay:values.rain==null?null:round1(values.rain),windKmh:values.wind==null?null:round1(values.wind*3.6),sunSignal:values.sun==null?null:round1(values.sun),goodWeatherDays:null,totalDays:Array.from(weights.values()).reduce((a,b)=>a+b,0),summary:summary(request,score,values,"climatology"),researchedAt:new Date().toISOString()};
  }catch{return{source:"unavailable",sourceLabel:"weather unavailable",score:50,confidence:"LOW",typical:true,summary:request.language==="en"?"Weather evidence is unavailable; this destination is not boosted by weather.":"Δεν υπάρχουν διαθέσιμα weather δεδομένα· ο προορισμός δεν ενισχύεται από τον καιρό.",researchedAt:new Date().toISOString()}}
}

export async function getWeatherEvidence(request:TripRequest,candidate:AffiliateDestinationCandidate):Promise<WeatherEvidence>{
  if(candidate.latitude==null||candidate.longitude==null)return{source:"unavailable",sourceLabel:"coordinates unavailable",score:45,confidence:"LOW",typical:true,summary:request.language==="en"?"No coordinates for weather screening.":"Δεν υπάρχουν συντεταγμένες για weather screening.",researchedAt:new Date().toISOString()};
  const forecast=await forecastWeather(request,candidate.latitude,candidate.longitude);if(forecast)return forecast;
  return climatologyWeather(request,candidate.latitude,candidate.longitude);
}

export async function enrichCandidatesWithWeather(request:TripRequest,candidates:AffiliateDestinationCandidate[],max=24):Promise<AffiliateDestinationCandidate[]>{
  const selected=candidates.slice(0,max);
  const results:AffiliateDestinationCandidate[]=[];
  for(let i=0;i<selected.length;i+=6){
    const chunk=selected.slice(i,i+6);
    const weather=await Promise.all(chunk.map(c=>getWeatherEvidence(request,c)));
    chunk.forEach((candidate,index)=>results.push({...candidate,weather:weather[index]}));
  }
  return results;
}

export function weatherGate(request:TripRequest,candidates:AffiliateDestinationCandidate[]):AffiliateDestinationCandidate[]{
  const wantsWarm=request.moods.includes("warmth");
  const threshold=wantsWarm?62:48;
  const good=candidates.filter(c=>(c.weather?.score??0)>=threshold);
  if(good.length>=7)return good;
  return [...candidates].sort((a,b)=>(b.weather?.score??0)-(a.weather?.score??0)).slice(0,Math.max(7,good.length));
}
