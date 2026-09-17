import fs from "node:fs";

const read=(path:string)=>fs.readFileSync(path,"utf8");
const must=(value:boolean,message:string)=>{if(!value)throw new Error(message)};

const home=read("app/page.tsx"),homeEn=read("app/en/page.tsx"),layout=read("app/layout.tsx"),planner=read("app/ai-planner/page.tsx"),plannerEn=read("app/en/ai-planner/page.tsx"),shell=read("components/v31-site-shell.tsx"),client=read("components/v31-ai-planner-client.tsx"),css=read("app/v31-native.css"),sitemap=read("app/sitemap.ts");
const isV45=home.includes("V45HolidayFinder"),isV40=!isV45&&home.includes("V40DiscoveryExperience"),modern=isV45||isV40,currentVersion=isV45?"v45":isV40?"v42":home.includes("V38EscapeFunnel")?"v38":home.includes("V36EscapeFunnel")?"v36":"v34";
const escapeFunnelPath=isV45?"components/v45-holiday-finder.tsx":isV40?"components/v40-discovery-experience.tsx":`components/${currentVersion}-escape-funnel.tsx`;
const selectedExperiencePath=modern?"components/v40-stay-workspace.tsx":currentVersion==="v38"?"components/v38-escape-builder-client.tsx":"components/v34-escape-builder-client.tsx";
const solverPath=modern?"app/api/escape/solve-v42/route.ts":currentVersion==="v34"?"app/api/escape/solve/stream/route.ts":"app/api/escape/solve-v36/stream/route.ts";
const rankingPath=currentVersion==="v34"?"lib/decision/solution-ranking-v35.ts":"lib/decision/solution-ranking-v36.ts";
const escapeFunnel=read(escapeFunnelPath),selectedExperience=read(selectedExperiencePath),escapePage=read("app/escape/[slug]/page.tsx"),solver=read(solverPath),ranking=read(rankingPath),v39Map=fs.existsSync("components/v39-destination-map-workspace.tsx"),stayPath="app/escape/[slug]/stay/[offerId]/page.tsx",stayRoute=v39Map&&fs.existsSync(stayPath)?read(stayPath):"";

must((isV45&&home.includes("V45HolidayFinder"))||(isV40&&home.includes("V40DiscoveryExperience"))||/V\d+EscapeFunnel/.test(home),"Greek homepage must use the current escape experience");
must((isV45&&homeEn.includes("V45HolidayFinder"))||(isV40&&homeEn.includes("V40DiscoveryExperience"))||/V\d+EscapeFunnel/.test(homeEn),"English homepage must use the current escape experience");
must(!home.includes("AiGreeceHomeV28"),"Greek homepage must not fall back to V28 shell");
must(layout.includes("v31-native.css"),"V31 support CSS must stay available for legacy production routes");
must(planner.includes("V31AiPlannerClient")&&plannerEn.includes("V31AiPlannerClient"),"Both legacy planner routes must keep the streaming planner during funnel evolution");
must(client.includes('/api/recommend/stream'),"Legacy planner must still call the legacy production recommendation stream");
must(escapeFunnel.includes('/api/escape/discovery'),"Current escape experience must understand the traveller before matching");
const modernDestinationFirst=modern
 && escapeFunnel.includes("result?.solutions")
 && escapeFunnel.includes("slice(0,3)")
 && escapeFunnel.includes("destinationUrl")
 && escapeFunnel.includes("/proorismoi/")
 && escapeFunnel.includes("/en/destinations/")
 && escapeFunnel.includes("Destination reveal")
 && escapeFunnel.includes("propertyName")
 && (!isV45||escapeFunnel.includes("sourceProductId"))
 && !escapeFunnel.includes("href={`/escape/${slug}/stay/");
must(modern?modernDestinationFirst:(escapeFunnel.includes("resultRail")&&escapeFunnel.includes("solutions.map")&&escapeFunnel.includes("combinedScore")),"Current discovery experience must expose real ranked destinations/offers before stay selection");
must(modern?(solver.includes("escape-inventory-v42")&&solver.includes("semanticStayScore")&&solver.includes("intentSource")):(solver.includes("buildEscapeSolutionsV36")||solver.includes("buildEscapeSolutionsV35")),"Current inventory reranking route is missing");
must(modern?(solver.includes("destinationScore")&&solver.includes("stayScore")&&solver.includes("valueScore")&&solver.includes("locationScore")):(ranking.includes("combinedScore")&&(ranking.includes("stayScore")||ranking.includes("inventoryScore"))),"Current solution ranking must combine destination and real stay/inventory evidence");
must(modern?(selectedExperience.includes('/api/trip-builder')&&selectedExperience.includes('/api/escape/stay-local')&&selectedExperience.includes('/api/escape/stay-reviews')):(selectedExperience.includes('/api/escape/research')&&selectedExperience.indexOf('/api/escape/research')<selectedExperience.indexOf('/api/trip-builder')),"Selected escape must preserve grounded 360 research and stay-specific trip building");
must(selectedExperience.includes('/api/guide/email'),"Selected escape must retain Escape Book email delivery");
must(selectedExperience.includes('sponsored nofollow noopener'),"Affiliate outbound must open safely and remain explicitly sponsored");
if(v39Map){
 must(escapePage.includes("V39DestinationMapWorkspace")&&escapePage.includes("preferredOffer")&&escapePage.includes("loadV8StayOffers(slug,start,end,60)"),"Destination route must preserve real-inventory map workspace");
 must(stayRoute.includes("selected=loaded.find")&&stayRoute.includes("offerId")&&(stayRoute.includes("V40StayWorkspace")||stayRoute.includes("V38EscapeBuilderClient")),"Selected-stay route must pin the exact offer before entering the active 360 workspace");
}else must(/V\d+EscapeBuilderClient/.test(escapePage)&&escapePage.includes("preferredOffer"),"Destination route must use the active builder and preserve the selected stay");
for(const path of ["/ai-planner","/ai-map","/seasonal","/guides","/how-ai-works"]){must(shell.includes(path),`Navigation missing ${path}`)}
for(const path of ["/ai-planner","/en/ai-planner","/seasonal","/en/seasonal","/guides","/en/guides","/how-ai-works","/en/how-ai-works"]){must(sitemap.includes(path),`Sitemap missing ${path}`)}
must(css.includes("@media screen and (max-width:767px)"),"V31 support CSS must include mobile layout");
must(css.includes("wf-planner-grid"),"Legacy planner styles missing");
for(const path of ["app/seasonal/page.tsx","app/en/seasonal/page.tsx","app/guides/page.tsx","app/en/guides/page.tsx","app/how-ai-works/page.tsx","app/en/how-ai-works/page.tsx","app/escape/[slug]/page.tsx"]){must(fs.existsSync(path),`Missing production route ${path}`)}
console.log(`Current ${currentVersion.toUpperCase()} escape experience + ${v39Map?"map/stay flow + ":""}V31 support routes smoke: OK`);