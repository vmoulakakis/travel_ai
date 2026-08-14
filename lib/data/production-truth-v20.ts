const PRODUCTION_TRUTH_URL=process.env.SUPABASE_PRODUCTION_TRUTH_V20_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/production-truth-v20";

export interface ProductionTruthV20{
  version:20;
  release:"V20";
  source:"production-truth-v20";
  checkedAt:string;
  evidenceCoveragePercent:number;
  availabilitySemantics:"TRI_STATE_STOCK_TRUTH"|"EXPLICIT_STOCK_TRUTH";
  evidenceDepth:"BROAD"|"PARTIAL"|"LIMITED";
  truth:{
    activeGreekDestinations?:number;
    stayPlaces?:number;
    activeStayLocalities?:number;
    eligibleStayOffers?:number;
    confirmedStockOffers?:number;
    unknownStockOffers?:number;
    verifiedEvidenceRows?:number;
    verifiedEvidenceDestinations?:number;
    routeEvidenceRows?:number;
    travelEvidenceRows?:number;
    checkedAt?:string;
  };
}

export async function loadProductionTruthV20():Promise<ProductionTruthV20>{
  const headers:Record<string,string>={"user-agent":"travel-guru/1.0","accept":"application/json"};
  const secret=process.env.SUPABASE_INGEST_SECRET;if(secret)headers["x-app-secret"]=secret;
  const response=await fetch(PRODUCTION_TRUTH_URL,{cache:"no-store",headers,signal:AbortSignal.timeout(6500)});
  if(!response.ok)throw new Error(`Production truth ${response.status}`);
  const payload=await response.json() as ProductionTruthV20;
  if(payload.version!==20||payload.release!=="V20"||!payload.truth)throw new Error("Invalid V20 production truth payload");
  return payload;
}
