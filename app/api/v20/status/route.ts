import { NextResponse } from "next/server";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { loadActiveStayCitiesV15 } from "@/lib/data/stay-cities-v15";
import { loadProductionTruthV20 } from "@/lib/data/production-truth-v20";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  const commit=process.env.VERCEL_GIT_COMMIT_SHA??"local";
  const environment=process.env.VERCEL_ENV??process.env.NODE_ENV??"unknown";
  const [catalogResult,localityResult,truthResult]=await Promise.allSettled([
    loadV8DestinationCatalog(),
    loadActiveStayCitiesV15(300),
    loadProductionTruthV20(),
  ]);
  const catalog=catalogResult.status==="fulfilled"?catalogResult.value:[];
  const greekDestinationCount=catalog.filter(item=>item.countryCode==="GR").length;
  const rawActiveStayLocalities=localityResult.status==="fulfilled"?localityResult.value.length:0;
  const truth=truthResult.status==="fulfilled"?truthResult.value:null;
  const productionTruthReady=Boolean(truth);
  const ok=greekDestinationCount>=20&&rawActiveStayLocalities>0&&productionTruthReady;

  return NextResponse.json({
    ok,
    release:"V20",
    version:"20.0",
    architecture:"production-truth-and-evidence-coverage",
    commit,
    commitShort:commit==="local"?"local":commit.slice(0,8),
    environment,
    checkedAt:new Date().toISOString(),
    checks:{
      greekDestinationCount,
      rawActiveStayLocalities,
      productionTruthReady,
      triStateAvailability:true,
      privilegedInventoryRpcPublic:false,
      evidenceCoveragePercent:truth?.evidenceCoveragePercent??null,
      evidenceDepth:truth?.evidenceDepth??"UNAVAILABLE",
      unknownStockOffers:truth?.truth.unknownStockOffers??null,
      confirmedStockOffers:truth?.truth.confirmedStockOffers??null,
      verifiedEvidenceDestinations:truth?.truth.verifiedEvidenceDestinations??null,
      routeEvidenceRows:truth?.truth.routeEvidenceRows??null,
      travelEvidenceRows:truth?.truth.travelEvidenceRows??null,
    },
    truth,
  },{status:ok?200:503,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
