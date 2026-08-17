import fs from "node:fs";

const read=(path:string)=>fs.readFileSync(path,"utf8");
const must=(value:boolean,message:string)=>{if(!value)throw new Error(message)};

const home=read("app/page.tsx"),homeEn=read("app/en/page.tsx"),layout=read("app/layout.tsx"),planner=read("app/ai-planner/page.tsx"),plannerEn=read("app/en/ai-planner/page.tsx"),shell=read("components/v31-site-shell.tsx"),client=read("components/v31-ai-planner-client.tsx"),css=read("app/v31-native.css"),sitemap=read("app/sitemap.ts");

must(home.includes("V31NativeHome"),"Greek homepage must use V31NativeHome");
must(homeEn.includes("V31NativeHome"),"English homepage must use V31NativeHome");
must(!home.includes("AiGreeceHomeV28"),"Greek homepage must not fall back to V28 shell");
must(layout.includes("v31-native.css"),"V31 production CSS must be loaded globally");
must(planner.includes("V31AiPlannerClient")&&plannerEn.includes("V31AiPlannerClient"),"Both planner routes must use the streaming V31 planner");
must(client.includes('/api/recommend/stream'),"Planner must call the production recommendation stream");
must(client.includes("consideredDestination"),"Planner must send explicit destination scope");
must(client.includes("recommendations.slice(0,6)"),"Planner must render final recommendation cards");
for(const path of ["/ai-planner","/ai-map","/seasonal","/guides","/how-ai-works"]){must(shell.includes(path),`Navigation missing ${path}`)}
for(const path of ["/ai-planner","/en/ai-planner","/seasonal","/en/seasonal","/guides","/en/guides","/how-ai-works","/en/how-ai-works"]){must(sitemap.includes(path),`Sitemap missing ${path}`)}
must(css.includes("@media screen and (max-width:767px)"),"V31 native CSS must include mobile layout");
must(css.includes("wf-planner-grid"),"V31 planner styles missing");
for(const path of ["app/seasonal/page.tsx","app/en/seasonal/page.tsx","app/guides/page.tsx","app/en/guides/page.tsx","app/how-ai-works/page.tsx","app/en/how-ai-works/page.tsx"]){must(fs.existsSync(path),`Missing production route ${path}`)}
console.log("V31 native production smoke: OK");
