import fs from "node:fs";

const read=(path:string)=>fs.readFileSync(path,"utf8");
const must=(value:boolean,message:string)=>{if(!value)throw new Error(message)};

const home=read("app/page.tsx"),homeEn=read("app/en/page.tsx"),layout=read("app/layout.tsx"),planner=read("app/ai-planner/page.tsx"),plannerEn=read("app/en/ai-planner/page.tsx"),shell=read("components/v31-site-shell.tsx"),client=read("components/v31-ai-planner-client.tsx"),css=read("app/v31-native.css"),sitemap=read("app/sitemap.ts");
const escapeFunnel=read("components/v33-escape-funnel.tsx"),escapeBuilder=read("components/v33-escape-builder-client.tsx");

must(home.includes("V33EscapeFunnel"),"Greek homepage must use V33EscapeFunnel");
must(homeEn.includes("V33EscapeFunnel"),"English homepage must use V33EscapeFunnel");
must(!home.includes("AiGreeceHomeV28"),"Greek homepage must not fall back to V28 shell");
must(layout.includes("v31-native.css"),"V31 support CSS must stay available for legacy production routes");
must(layout.includes("v33-escape.css")&&layout.includes("v33-builder.css"),"V33 production CSS must be loaded globally");
must(planner.includes("V31AiPlannerClient")&&plannerEn.includes("V31AiPlannerClient"),"Both legacy planner routes must keep the streaming planner during V33 migration");
must(client.includes('/api/recommend/stream'),"Planner must call the production recommendation stream");
must(escapeFunnel.includes('/api/recommend/stream'),"V33 escape funnel must use the production recommendation stream");
must(escapeFunnel.includes('slice(0, 3)'),"V33 escape funnel must cap the primary shortlist at three escapes");
must(escapeBuilder.includes('/api/trip-builder'),"V33 selected escape must trigger the verified 360 trip builder");
must(escapeBuilder.includes('/api/guide/email'),"V33 selected escape must retain guide email delivery");
must(escapeBuilder.includes('target=\"_blank\"')&&escapeBuilder.includes('sponsored nofollow noopener'),"Affiliate outbound must open safely in a new tab");
for(const path of ["/ai-planner","/ai-map","/seasonal","/guides","/how-ai-works"]){must(shell.includes(path),`Navigation missing ${path}`)}
for(const path of ["/ai-planner","/en/ai-planner","/seasonal","/en/seasonal","/guides","/en/guides","/how-ai-works","/en/how-ai-works"]){must(sitemap.includes(path),`Sitemap missing ${path}`)}
must(css.includes("@media screen and (max-width:767px)"),"V31 support CSS must include mobile layout");
must(css.includes("wf-planner-grid"),"Legacy planner styles missing");
for(const path of ["app/seasonal/page.tsx","app/en/seasonal/page.tsx","app/guides/page.tsx","app/en/guides/page.tsx","app/how-ai-works/page.tsx","app/en/how-ai-works/page.tsx","app/escape/[slug]/page.tsx"]){must(fs.existsSync(path),`Missing production route ${path}`)}
console.log("V33 escape funnel + V31 support routes smoke: OK");
