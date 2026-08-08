import type { AffiliateDestinationCandidate, SemanticMatchData, GuruScoreBreakdown, SemanticModelState } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

export const DIM = {
  relax:0,romantic:1,food:2,warmth:3,city:4,nature:5,adventure:6,culture:7,luxury:8,boutique:9,resort:10,value:11,
  family:12,couple:13,solo:14,friends:15,lowEffort:16,warmClimate:17,allWeather:18,beachSeason:19,nightlife:20,wellness:21,shortBreak:22,shoulderSeason:23
} as const;

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const sigmoid=(x:number)=>1/(1+Math.exp(-x));
const tanh=(x:number)=>Math.tanh(x);

export function encodeTripSemantics(request: TripRequest): number[] {
  const v=Array(24).fill(.22) as number[];
  const moodMap:Record<string,number>={relax:DIM.relax,romantic:DIM.romantic,food:DIM.food,warmth:DIM.warmth,city:DIM.city,nature:DIM.nature,adventure:DIM.adventure,culture:DIM.culture};
  for(const mood of request.moods){const i=moodMap[mood];if(i!==undefined)v[i]=1;}
  v[DIM.family]=request.travelerType==="family"?1:.3;
  v[DIM.couple]=request.travelerType==="couple"?1:.35;
  v[DIM.solo]=request.travelerType==="solo"?1:.3;
  v[DIM.friends]=request.travelerType==="friends"?1:.35;
  v[DIM.luxury]=request.hotelStyle==="luxury"?1:request.hotelStyle==="boutique"?.72:.35;
  v[DIM.boutique]=request.hotelStyle==="boutique"?1:request.moods.includes("romantic")?.72:.28;
  v[DIM.resort]=request.hotelStyle==="resort"?1:request.moods.includes("relax")?.62:.25;
  v[DIM.value]=request.hotelStyle==="value"||request.avoid==="high-cost"?1:request.budget<=500?.78:.42;
  v[DIM.lowEffort]=request.distancePreference==="nearby"?1:request.distancePreference==="easy-hop"?.9:request.avoid==="long-travel"?.88:.45;
  v[DIM.warmClimate]=request.moods.includes("warmth")?1:request.distancePreference==="island"?.72:.4;
  const month=Number(request.startDate.slice(5,7));
  const offPeak=month<=4||month>=10;
  v[DIM.allWeather]=offPeak?.82:.48;
  v[DIM.beachSeason]=request.moods.includes("warmth")||request.distancePreference==="island"?.92:.22;
  v[DIM.nightlife]=request.travelerType==="friends"&&request.moods.includes("city")?.82:.25;
  v[DIM.wellness]=request.moods.includes("relax")?.78:request.hotelStyle==="luxury"?.55:.25;
  v[DIM.shortBreak]=request.nights<=4?1:request.nights<=6?.68:.35;
  v[DIM.shoulderSeason]=offPeak?1:.45;
  if(request.avoid==="crowds"){v[DIM.nightlife]*=.65;v[DIM.city]*=.85;v[DIM.nature]=Math.max(v[DIM.nature],.68);v[DIM.relax]=Math.max(v[DIM.relax],.68);}
  if(request.pace==="slow"){v[DIM.relax]=Math.max(v[DIM.relax],.75);v[DIM.lowEffort]=Math.max(v[DIM.lowEffort],.72);}
  if(request.pace==="full"){v[DIM.city]=Math.max(v[DIM.city],.62);v[DIM.culture]=Math.max(v[DIM.culture],.62);v[DIM.adventure]=Math.max(v[DIM.adventure],.55);}
  return v.map(x=>Number(clamp(x).toFixed(4)));
}

export function cosineSimilarity(a:number[],b:number[]):number{
  if(a.length!==24||b.length!==24)return .5;
  let dot=0,aa=0,bb=0;for(let i=0;i<24;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}
  if(!aa||!bb)return .5;return clamp(dot/(Math.sqrt(aa)*Math.sqrt(bb)));
}

function learningSignal(learning:Record<string,unknown>|undefined):number{
  if(!learning)return .5;
  const selections=Number(learning.selections??0),clicks=Number(learning.outbound_clicks??0),conversions=Number(learning.conversions??0),reward=Number(learning.reward??0);
  const volume=selections+clicks+conversions;
  if(volume<5)return .5;
  return clamp(.45 + Math.min(.18,clicks/Math.max(1,selections)*.16)+Math.min(.22,conversions/Math.max(1,clicks)*.22)+Math.min(.12,reward/100));
}

function defaultNetwork(){
  return {
    hidden:[
      {w:[1.25,.15,.10,.10,.05,.00,.00,.00,1.00,.10,.00,.05],b:-.75},
      {w:[.15,1.05,1.15,.05,.00,.65,.55,.10,.20,.00,.05,.00],b:-1.15},
      {w:[.45,.25,.25,.75,.55,.00,.00,.25,.25,.40,.55,.00],b:-1.20},
      {w:[.60,.55,.45,.00,.00,.10,.10,.75,.45,.15,.00,.25],b:-1.25},
      {w:[.75,.35,.35,.05,.00,.10,.10,.10,.20,.70,.25,.10],b:-1.05},
      {w:[.50,.20,.30,.10,.00,.10,.10,.15,.65,.10,.15,.20],b:-1.10},
      {w:[.30,.55,.40,.05,.00,.10,.10,.10,.25,.20,.00,.65],b:-1.00},
      {w:[.80,.35,.35,.10,.00,.10,.10,.20,.50,.25,.10,.20],b:-1.20}
    ],
    out:[.20,.16,.12,.11,.13,.10,.08,.10],
    bias:-.05
  };
}

function learnedNetwork(model?:SemanticModelState){
  const network=model?.weights && typeof model.weights.network==="object" ? model.weights.network as Record<string,unknown> : null;
  if(!network)return defaultNetwork();
  const hidden=Array.isArray(network.hidden)?network.hidden:[];const out=Array.isArray(network.out)?network.out.map(Number):[];
  if(hidden.length!==8||out.length!==8)return defaultNetwork();
  const parsed=hidden.map(row=>{const r=row&&typeof row==="object"?row as Record<string,unknown>:{};const w=Array.isArray(r.w)?r.w.map(Number):[];return{w:w.length===12?w:Array(12).fill(0),b:Number(r.b??0)}});
  return{hidden:parsed,out,bias:Number(network.bias??0)};
}

export function neuralScore(features:number[],model?:SemanticModelState):number{
  const net=learnedNetwork(model);const x=features.map(clamp);
  const h=net.hidden.map(n=>tanh(n.w.reduce((sum,w,i)=>sum+w*(x[i]??0),n.b)));
  const z=h.reduce((sum,v,i)=>sum+v*(net.out[i]??0),net.bias);
  return clamp(sigmoid(z));
}

export function attachSemanticProfiles(request:TripRequest,candidates:AffiliateDestinationCandidate[],data:SemanticMatchData):AffiliateDestinationCandidate[]{
  const user=encodeTripSemantics(request),destMap=new Map(data.destinations.map(d=>[d.destination_id,d])),stayMap=new Map(data.stays.map(s=>[s.source_product_id,s]));
  return candidates.map(c=>{
    const profile=destMap.get(c.destinationId)??null;
    const semantic=profile?cosineSimilarity(user,profile.vector):.5;
    const offerScores=c.topOffers.map(o=>{const s=stayMap.get(o.sourceProductId);const score=s?cosineSimilarity(user,s.vector):semantic;return{...o,semanticScore:Math.round(score*100)}}).sort((a,b)=>(b.semanticScore??0)-(a.semanticScore??0));
    const topStay=offerScores.slice(0,3);const stayFit=topStay.length?topStay.reduce((sum,o)=>sum+(o.semanticScore??50),0)/topStay.length:semantic*100;
    const bestMedia=profile?.media?.slice().sort((a,b)=>(b.quality??0)-(a.quality??0))[0];
    return{...c,semanticProfile:profile,semanticScore:Math.round(semantic*100),staySemanticScore:Math.round(stayFit),topOffers:offerScores,heroImageUrl:bestMedia?.url??c.heroImageUrl};
  });
}

export function computeNeuralCandidateScore(candidate:AffiliateDestinationCandidate,breakdown:Omit<GuruScoreBreakdown,"neural">,model?:SemanticModelState):number{
  const learning=learningSignal(candidate.semanticProfile?.learning as Record<string,unknown>|undefined);
  const features=[
    (candidate.semanticScore??breakdown.intent)/100,
    breakdown.weather/100,
    breakdown.seasonality/100,
    breakdown.value/100,
    breakdown.demand/100,
    breakdown.effort/100,
    breakdown.supply/100,
    breakdown.luxury/100,
    (candidate.staySemanticScore??breakdown.intent)/100,
    learning,
    candidate.semanticProfile?.confidence??.5,
    breakdown.intent/100
  ];
  const prior=neuralScore(features,model);
  const samples=model?.sample_count??0;
  const learnedWeight=samples>=500?Math.min(.35,.08+Math.log10(samples/500+1)*.18):0;
  const expert=(.31*features[0]+.16*features[1]+.16*features[2]+.09*features[3]+.07*features[5]+.05*features[6]+.05*features[8]+.04*features[7]+.03*features[4]+.04*features[9]);
  return clamp(expert*(1-learnedWeight)+prior*learnedWeight);
}
