import type { AffiliateDestinationCandidate, GuruRecommendation, GuruScoreBreakdown, SemanticModelState } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";
import { computeNeuralCandidateScore, DIM } from "@/lib/decision/semantic-matcher";

export type RankedAffiliateCandidate={candidate:AffiliateDestinationCandidate;score:number;distanceKm:number|null;breakdown:GuruScoreBreakdown};
const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,v)),round=(v:number)=>Math.round(v);
const originCoordinates:Record<string,[number,number]>={athens:[37.9838,23.7275],athina:[37.9838,23.7275],"αθήνα":[37.9838,23.7275],thessaloniki:[40.6401,22.9444],"θεσσαλονίκη":[40.6401,22.9444],patra:[38.2466,21.7346],"πάτρα":[38.2466,21.7346],heraklion:[35.3387,25.1442],"ηράκλειο":[35.3387,25.1442],chania:[35.5138,24.018],"χανιά":[35.5138,24.018]};
const intentWords:Record<TripRequest["moods"][number],string[]>={relax:["spa","wellness","quiet","retreat","ηρεμ","σπα"],romantic:["boutique","suite","romantic","adults","villa","honeymoon","μπουτίκ","σουίτα","βίλα"],food:["restaurant","gastronomy","breakfast","tavern","food","wine","εστιατόρ","πρωινό","κρασί","γαστρο"],warmth:["beach","sea","seaside","island","παραλία","θάλασσα","νησί"],city:["city","center","centre","urban","old town","κέντρο","πόλη","παλιά πόλη"],nature:["mountain","forest","lake","nature","village","βουνό","δάσος","λίμνη","χωριό","φύση"],adventure:["mountain","hiking","outdoor","surf","diving","πεζοπο","κατάδυ"],culture:["historic","old town","museum","heritage","traditional","ιστορ","παραδοσιακ","παλιά πόλη"]};
function haversine(a:[number,number],b:[number,number]){const r=6371,rad=(x:number)=>x*Math.PI/180,dLat=rad(b[0]-a[0]),dLon=rad(b[1]-a[1]),q=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;return 2*r*Math.asin(Math.sqrt(q))}
function originPoint(origin:string){return originCoordinates[origin.trim().toLowerCase()]??null}
function textFor(c:AffiliateDestinationCandidate){return`${c.locationLabel} ${c.semanticText??""} ${c.topOffers.map(o=>`${o.propertyName} ${o.description??""}`).join(" ")}`.toLowerCase()}
function keywordFit(request:TripRequest,c:AffiliateDestinationCandidate){const hay=textFor(c);let hits=0,possible=0;for(const mood of request.moods){const words=intentWords[mood];possible+=Math.min(words.length,4);hits+=words.filter(w=>hay.includes(w)).length}return clamp(43+(hits/Math.max(1,possible))*54)}
function valueFit(request:TripRequest,c:AffiliateDestinationCandidate){if(c.minPrice==null)return 52;const ratio=c.minPrice/Math.max(1,request.budget);let score=ratio<=.18?100:ratio<=.4?92:ratio<=.65?82:ratio<=1?68:ratio<=1.4?46:22;if(request.avoid==="high-cost")score=clamp(score+10);if(request.hotelStyle==="value")score=clamp(score+10);return score}
function dealFit(c:AffiliateDestinationCandidate){const d=c.maxDiscount??0;return d>0?clamp(45+d*.8):42}
function luxuryFit(request:TripRequest,c:AffiliateDestinationCandidate){const semanticLuxury=(c.semanticProfile?.vector?.[DIM.luxury]??.4)*100;const density=c.activeOfferCount?c.fiveStarOfferCount/c.activeOfferCount:0;let score=.58*semanticLuxury+.42*clamp(28+c.fiveStarOfferCount*8+density*30);if(request.hotelStyle==="luxury")score+=8;if(request.hotelStyle==="value")score-=6;return clamp(score)}
function effortFit(request:TripRequest,c:AffiliateDestinationCandidate){const origin=originPoint(request.origin);if(!origin||c.latitude==null||c.longitude==null)return{score:58,distance:null};const distance=haversine(origin,[c.latitude,c.longitude]),pref=request.distancePreference??"any";let divisor=request.nights<=3?9:13;if(pref==="nearby")divisor=4.2;if(pref==="easy-hop")divisor=7.5;if(pref==="island")divisor=9;let score=clamp(100-distance/divisor);if(request.pace==="slow")score=clamp(score+5);if(request.avoid==="long-travel")score=clamp(score+10);return{score,distance}}
function seasonalityFit(request:TripRequest,c:AffiliateDestinationCandidate,periodSupply:number){
  const profile=c.semanticProfile?.vector,beachDependency=(profile?.[DIM.beachSeason]??.35)*100,shoulder=(profile?.[DIM.shoulderSeason]??.5)*100,allWeather=(profile?.[DIM.allWeather]??.5)*100;
  const month=Number(request.startDate.slice(5,7)),offSeason=month>=11||month<=3,shoulderMonth=month===4||month===5||month===9||month===10;
  const weather=c.weather?.score;
  let score=weather==null?.48*shoulder+.32*allWeather+.20*periodSupply:.50*weather+.23*shoulder+.17*allWeather+.10*periodSupply;
  const nonSummerIntent=request.moods.some(x=>x==="nature"||x==="culture"||x==="adventure"||x==="city"||x==="food");
  if(offSeason&&beachDependency>=72&&!nonSummerIntent)score=Math.min(score,44);
  if(offSeason&&beachDependency>=72&&request.moods.includes("warmth"))score=Math.min(score,32);
  if(shoulderMonth&&beachDependency>=80&&weather!=null&&weather<62&&!nonSummerIntent)score-=10;
  if(request.moods.includes("warmth")&&c.weather?.temperatureMeanC!=null&&c.weather.temperatureMeanC<19)score-=22;
  if(c.weather?.source==="unavailable")score=Math.min(score,52);
  return clamp(score)
}
function avoidancePenalty(request:TripRequest,b:GuruScoreBreakdown){if(request.avoid==="long-travel")return(100-b.effort)*.08;if(request.avoid==="high-cost")return(100-b.value)*.08;if(request.avoid==="crowds")return Math.max(0,b.demand-68)*.06;return 0}
function feedPriceLabel(c:AffiliateDestinationCandidate){if(c.minPrice==null)return"Price not supplied";const prefix=c.currency?`${c.currency} `:"feed price ";return`${prefix}${Math.round(c.minPrice)}${c.medianPrice!=null&&c.medianPrice!==c.minPrice?`–${Math.round(c.medianPrice)}`:""}`}
function roleFor(i:number,r:RankedAffiliateCandidate){if(i===0)return"GURU PICK";const b=r.breakdown;if(b.semantic>=88&&b.weather>=72)return"BEST MATCH";if(b.weather>=84)return"WEATHER FIT";if(b.value>=88)return"BEST VALUE";if(b.effort>=86)return"EASY ESCAPE";if(r.candidate.fiveStarOfferCount>=5&&b.luxury>=78)return"LUXURY DEPTH";return i===1?"SMART ALTERNATIVE":"WILDCARD"}
function normalizeLabel(value:string){return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim()}
function samePlaceGroup(a:AffiliateDestinationCandidate,b:AffiliateDestinationCandidate){const x=normalizeLabel(a.locationLabel),y=normalizeLabel(b.locationLabel);if(x===y||x.includes(y)||y.includes(x))return true;const xa=x.split(" ").filter(v=>v.length>3),ya=y.split(" ").filter(v=>v.length>3);return xa.filter(v=>ya.includes(v)).length>=2}

export function rankAffiliateCandidates(request:TripRequest,candidates:AffiliateDestinationCandidate[],limit=24,model?:SemanticModelState):RankedAffiliateCandidate[]{
  const maxSupply=Math.max(1,...candidates.map(c=>c.activeOfferCount)),maxDemand=Math.max(1,...candidates.map(c=>c.demandScore));
  return candidates.map(candidate=>{
    const supply=clamp(28+72*Math.log1p(candidate.activeOfferCount)/Math.log1p(maxSupply));
    const demand=clamp(25+75*Math.log1p(candidate.demandScore)/Math.log1p(maxDemand));
    const value=valueFit(request,candidate),deal=dealFit(candidate),intent=keywordFit(request,candidate),effort=effortFit(request,candidate),luxury=luxuryFit(request,candidate);
    const semantic=clamp(candidate.semanticScore??intent),stayFit=clamp(candidate.staySemanticScore??semantic),weather=clamp(candidate.weather?.score??58),seasonality=seasonalityFit(request,candidate,supply);
    const partial={semantic:round(semantic),supply:round(supply),value:round(value),demand:round(demand),deal:round(deal),intent:round(intent),effort:round(effort.score),luxury:round(luxury),weather:round(weather),seasonality:round(seasonality),stayFit:round(stayFit)};
    const neural=computeNeuralCandidateScore(candidate,partial,model)*100;
    const breakdown: GuruScoreBreakdown={...partial,neural:round(neural)};
    let expert=.30*semantic+.15*weather+.15*seasonality+.09*value+.08*effort.score+.07*stayFit+.05*supply+.04*luxury+.03*intent+.02*demand+.02*deal;
    if(request.hotelStyle==="luxury")expert+=luxury*.025;if(request.hotelStyle==="value")expert+=value*.025;
    expert-=avoidancePenalty(request,breakdown);
    const score=clamp(expert*.68+neural*.32);
    return{candidate:{...candidate,neuralScore:round(neural)},score,distanceKm:effort.distance,breakdown};
  }).sort((a,b)=>b.score-a.score).slice(0,Math.max(5,limit));
}

export function seasonGate(ranked:RankedAffiliateCandidate[]):RankedAffiliateCandidate[]{const ready=ranked.filter(x=>x.breakdown.seasonality>=50&&x.breakdown.semantic>=54);return ready.length>=5?ready:ranked.slice(0,Math.max(5,ready.length))}

export function deterministicGuruFallback(request:TripRequest,ranked:RankedAffiliateCandidate[]):GuruRecommendation[]{
  const selected:RankedAffiliateCandidate[]=[];for(const item of ranked){if(selected.some(s=>samePlaceGroup(item.candidate,s.candidate)))continue;selected.push(item);if(selected.length===5)break}if(selected.length<5){for(const item of ranked){if(selected.some(s=>s.candidate.destinationId===item.candidate.destinationId))continue;selected.push(item);if(selected.length===5)break}}
  return selected.slice(0,5).map((item,index)=>{const c=item.candidate,greek=request.language!=="en",weather=c.weather,profile=c.semanticProfile;const confidence: GuruRecommendation["confidence"]=item.breakdown.semantic>=78&&weather?.confidence!=="LOW"&&c.activeOfferCount>=4?"HIGH":item.breakdown.semantic>=62?"MEDIUM":"LOW";const archetypes=profile?.archetypes??[];
    return{destinationId:c.destinationId,destination:c.locationLabel,country:c.countryHint??(greek?"Προορισμός feed":"Feed location"),role:roleFor(index,item),score:round(item.score),confidence,
      whyThisPlace:greek?`${c.locationLabel}: ${item.breakdown.semantic}% semantic match, ${item.breakdown.weather}% weather fit και ${item.breakdown.seasonality}% season fit για τις συγκεκριμένες ημερομηνίες.`:`${c.locationLabel}: ${item.breakdown.semantic}% semantic match, ${item.breakdown.weather}% weather fit and ${item.breakdown.seasonality}% season fit for these exact dates.`,
      whyNow:greek?`${c.activeOfferCount} tracked stays καλύπτουν ${request.startDate}–${request.endDate}. ${weather?.summary??""}`:`${c.activeOfferCount} tracked stays overlap ${request.startDate}–${request.endDate}. ${weather?.summary??""}`,
      tags:[...archetypes.slice(0,2),item.breakdown.stayFit>=80?"stay fit":"curated",item.breakdown.value>=86?"value":"date-fit"].slice(0,4),imageUrl:c.heroImageUrl,feedPriceLabel:feedPriceLabel(c),propertyCount:c.propertyCount,activeOfferCount:c.activeOfferCount,fiveStarOfferCount:c.fiveStarOfferCount,alternativeOfferCount:c.alternativeOfferCount,demandScore:round(c.demandScore),maxDiscount:c.maxDiscount,latitude:c.latitude,longitude:c.longitude,distanceKm:item.distanceKm==null?null:round(item.distanceKm),breakdown:item.breakdown,offers:c.topOffers.slice(0,5),weather,verifier:{checked:false,passed:true,reason:null,model:null}};
  });
}
