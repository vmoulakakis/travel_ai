import { destinationSeeds } from "@/lib/data/destinations";
import type { DestinationSeed, MonthKey, TripRecommendation } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

const clamp = (v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));
const round = (v:number)=>Math.round(v);
function monthFor(r:TripRequest,d:DestinationSeed):MonthKey { if(r.month!=="flexible") return r.month; return (Object.entries(d.season) as [MonthKey,number][]).sort((a,b)=>b[1]-a[1])[0][0]; }
function durationScore(r:TripRequest,d:DestinationSeed){ const [min,max]=d.idealNights; if(r.nights>=min&&r.nights<=max)return 100; const x=r.nights<min?min-r.nights:r.nights-max; return clamp(100-x*20); }
function budgetScore(r:TripRequest,d:DestinationSeed){ const [low,high]=d.budgetBand; if(r.budget>=low&&r.budget<=high)return 100; if(r.budget<low)return clamp(100-((low-r.budget)/low)*130); return 92; }
function intentScore(r:TripRequest,d:DestinationSeed){ const values=r.moods.map(m=>d.moods[m]); return values.reduce((a,b)=>a+b,0)/values.length; }
function evidenceScore(d:DestinationSeed){ return d.evidenceStatus==="verified"?100:d.evidenceStatus==="stale"?55:68; }
function refinementBonus(r:TripRequest,d:DestinationSeed,m:MonthKey){ switch(r.refinement){case"cheaper":return clamp(100-d.budgetBand[0]/8);case"warmer":return d.warmth[m];case"closer":return d.region==="domestic"?100:d.region==="near-europe"?82:60;case"shorter":return d.idealNights[0]<=3?95:65;case"romantic":return d.moods.romantic;case"adventurous":return d.moods.adventure;default:return 0;} }
function confidence(d:DestinationSeed,s:number):TripRecommendation["confidence"]{ if(d.evidenceStatus==="verified"&&s>=82)return"HIGH"; if(d.evidenceStatus==="stale")return"LOW"; return s>=78?"MEDIUM":"LOW"; }
function similarity(a:DestinationSeed,b:DestinationSeed){ let p=0; if(a.country===b.country)p+=34; if(a.region===b.region)p+=8; p+=a.tags.filter(t=>b.tags.includes(t)).length*8; return p; }
function role(i:number,r:TripRequest,d:DestinationSeed,m:MonthKey){ if(i===0)return"BEST MATCH"; if(r.refinement==="warmer"||d.warmth[m]>86)return"WARMER OPTION"; if(d.budgetBand[0]<=r.budget*.75)return"SMART VALUE"; if(d.travelEffort>=86)return"LOWER EFFORT"; return i===1?"STRONG ALTERNATIVE":"WILDCARD"; }

export function recommendTrips(request:TripRequest,destinations:DestinationSeed[]=destinationSeeds):TripRecommendation[]{
  const scored=destinations.map(destination=>{
    const month=monthFor(request,destination); const constraints=(durationScore(request,destination)+destination.travelerFit[request.travelerType])/2; const intent=intentScore(request,destination); const season=destination.season[month]; const transport=destination.travelEffort; const budget=budgetScore(request,destination); const evidence=evidenceScore(destination); const refinement=refinementBonus(request,destination,month);
    const eligible=!(request.budget<destination.budgetBand[0]*.62)&&season>=48&&!(destination.evidenceStatus==="stale"&&request.month!=="september");
    const base=constraints*.25+intent*.2+season*.2+transport*.15+budget*.12+evidence*.08; return {destination,month,constraints,intent,season,transport,budget,evidence,score:clamp(base+(request.refinement?refinement*.09:0)),eligible};
  }).filter(x=>x.eligible).sort((a,b)=>b.score-a.score);
  const selected:typeof scored=[];
  for(const c of scored){ const adjusted=c.score-selected.reduce((p,x)=>p+similarity(c.destination,x.destination),0)*.36; if(adjusted<48&&selected.length>=2)continue; selected.push({...c,score:adjusted}); if(selected.length===3)break; }
  if(selected.length<3) for(const c of scored){ if(!selected.some(x=>x.destination.id===c.destination.id))selected.push(c); if(selected.length===3)break; }
  return selected.slice(0,3).map((x,i)=>({ destinationId:x.destination.id,destination:x.destination.name,country:x.destination.country,role:role(i,request,x.destination,x.month),score:round(x.score),confidence:confidence(x.destination,x.score),reason:`${x.destination.name} matches ${request.nights} nights and your ${request.moods.join(" + ")} intent well for ${x.month}.`,tags:x.destination.tags.slice(0,3),estimatedBudget:`≈ €${x.destination.budgetBand[0]}–€${x.destination.budgetBand[1]} pp (planning estimate)`,freshness:x.destination.evidenceStatus,risk:x.destination.evidenceNote,imageUrl:x.destination.imageUrl,breakdown:{constraints:round(x.constraints),intent:round(x.intent),season:round(x.season),transport:round(x.transport),budget:round(x.budget),evidence:round(x.evidence)}}));
}
