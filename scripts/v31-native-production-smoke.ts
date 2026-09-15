import fs from "node:fs";

const read=(path:string)=>fs.readFileSync(path,"utf8");
const must=(value:boolean,message:string)=>{if(!value)throw new Error(message)};

const home=read("app/page.tsx"),homeEn=read("app/en/page.tsx"),layout=read("app/layout.tsx"),planner=read("app/ai-planner/page.tsx"),plannerEn=read("app/en/ai-planner/page.tsx"),shell=read("components/v31-site-shell.tsx"),client=read("components/v31-ai-planner-client.tsx"),css=read("app/v31-native.css"),sitemap=read("app/sitemap.ts");
const currentVersion=home.includes("V38EscapeFunnel")?"v38":home.includes("V36EscapeFunnel")?"v36":"v34";
const escapeFunnelPath=`components/${currentVersion}-escape-funnel.tsx`;
const escapeBuilderPath=currentVersion==="v38"?"components/v38-escape-builder-client.tsx":"components/v34-escape-builder-client.tsx";
const solverPath=currentVersion==="v34"?"app/api/escape/solve/stream/route.ts":"app/api/escape/solve-v36/stream/route.ts";
const rankingPath=currentVersion==="v34"?"lib/decision/solution-ranking-v35.ts":"lib/decision/solution-ranking-v36.ts";
const escapeFunnel=read(escapeFunnelPath),escapeBuilder=read(escapeBuilderPath),escapePage=read("app/escape/[slug]/page.tsx"),solver=read(solverPath),ranking=read(rankingPath),v39Map=fs.existsSync("components/v39-destination-map-workspace.tsx"),v39StayPath="app/escape/[slug]/stay/[offerId]/page.tsx",v39Stay=v39Map&&fs.existsSync(v39StayPath)?read(v39StayPath):"";

must(/V\d+EscapeFunnel/.test(home),"Greek homepage must use the current escape funnel component");
must(/V\d+EscapeFunnel/.test(homeEn),"English homepage must use the current escape funnel component");
must(!home.includes("AiGreeceHomeV28"),"Greek homepage must not fall back to V28 shell");
must(layout.includes("v31-native.css"),"V31 support CSS must stay available for legacy production routes");
must(planner.includes("V31AiPlannerClient")&&plannerEn.includes("V31AiPlannerClient"),"Both legacy planner routes must keep the streaming planner during funnel evolution");
must(client.includes('/api/recommend/stream'),"Legacy planner must still call the legacy production recommendation stream");
must(escapeFunnel.includes('/api/escape/discovery'),"Current escape funnel must understand the traveller before matching");
must(escapeFunnel.includes("resultRail")&&escapeFunnel.includes("solutions.map")&&escapeFunnel.includes("combinedScore"),"Current funnel must expose the real ranked solution set through a compact decision rail");
must(solver.includes("buildEscapeSolutionsV36")||solver.includes("buildEscapeSolutionsV35"),"Current dual-pass inventory reranking route is missing");
must(ranking.includes("combinedScore")&&(ranking.includes("stayScore")||ranking.includes("inventoryScore")),"Current solution ranking must combine destination and real stay/inventory evidence");
must(escapeBuilder.includes('/api/escape/research')&&escapeBuilder.indexOf('/api/escape/research')<escapeBuilder.indexOf('/api/trip-builder'),"Selected escape must research destination before stay-specific trip build");
must(escapeBuilder.includes('/api/guide/email'),"Selected escape must retain Escape Book email delivery");
must(escapeBuilder.includes('target=\"_blank\"')&&escapeBuilder.includes('sponsored nofollow noopener'),"Affiliate outbound must open safely in a new tab");
if(v39Map){
 must(escapePage.includes("V39DestinationMapWorkspace")&&escapePage.includes("preferredOffer")&&escapePage.includes("loadV8StayOffers(slug,start,end,60)"),"V39 destination route must preserve the selected stay while entering the real-inventory map workspace");
 must(v39Stay.includes("V38EscapeBuilderClient")&&v39Stay.includes("selected=loaded.find")&&v39Stay.includes("offerId"),"V39 selected-stay route must pin the exact offer before entering the 360 builder");
}else must(/V\d+EscapeBuilderClient/.test(escapePage)&&escapePage.includes("preferredOffer"),"Destination route must use the active builder and preserve the selected stay");
for(const path of ["/ai-planner","/ai-map","/seasonal","/guides","/how-ai-works"]){must(shell.includes(path),`Navigation missing ${path}`)}
for(const path of ["/ai-planner","/en/ai-planner","/seasonal","/en/seasonal","/guides","/en/guides","/how-ai-works","/en/how-ai-works"]){must(sitemap.includes(path),`Sitemap missing ${path}`)}
must(css.includes("@media screen and (max-width:767px)"),"V31 support CSS must include mobile layout");
must(css.includes("wf-planner-grid"),"Legacy planner styles missing");
for(const path of ["app/seasonal/page.tsx","app/en/seasonal/page.tsx","app/guides/page.tsx","app/en/guides/page.tsx","app/how-ai-works/page.tsx","app/en/how-ai-works/page.tsx","app/escape/[slug]/page.tsx"]){must(fs.existsSync(path),`Missing production route ${path}`)}
console.log(`Current ${currentVersion.toUpperCase()} escape funnel + ${v39Map?"V39 map/stay flow + ":""}V31 support routes smoke: OK`);
