import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webflowCorsHeadersV31,webflowPreflightV31 } from "../lib/http/webflow-cors-v31";

process.env.NEXT_PUBLIC_WEBFLOW_ORIGIN="https://ai-greece.webflow.io";
process.env.WEBFLOW_ALLOWED_ORIGINS="https://travel.example.com, https://preview.example.com/path";

const allowed=new Request("https://runtime.example.com/api/ai-map",{headers:{origin:"https://ai-greece.webflow.io"}});
const secondary=new Request("https://runtime.example.com/api/ai-map",{headers:{origin:"https://preview.example.com"}});
const denied=new Request("https://runtime.example.com/api/ai-map",{headers:{origin:"https://evil.example.net"}});

assert.equal(webflowCorsHeadersV31(allowed)["access-control-allow-origin"],"https://ai-greece.webflow.io");
assert.equal(webflowCorsHeadersV31(secondary)["access-control-allow-origin"],"https://preview.example.com");
assert.equal(webflowCorsHeadersV31(denied)["access-control-allow-origin"],undefined);
assert.notEqual(webflowCorsHeadersV31(allowed)["access-control-allow-origin"],"*");
const preflight=webflowPreflightV31(allowed,"GET, OPTIONS");
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get("access-control-allow-methods"),"GET, OPTIONS");

const home=readFileSync("webflow-v31/home.whtml.html","utf8");
const map=readFileSync("webflow-v31/ai-map.whtml.html","utf8");
const planner=readFileSync("webflow-v31/ai-planner.whtml.html","utf8");
const css=readFileSync("webflow-v31/design-system.css","utf8");
const bridge=readFileSync("webflow-v31/runtime-bridge.js","utf8");

for(const [name,html] of [["home",home],["map",map],["planner",planner]] as const){
 assert.equal((html.match(/<main\b/g)??[]).length,1,`${name} must have a single WHTML root`);
 assert.equal((html.match(/<h1\b/g)??[]).length,1,`${name} must have exactly one H1`);
}
assert(home.includes("data-travel-planner-root"));
assert(map.includes("data-ai-map-root")&&map.includes("data-evidence-root"));
assert(planner.includes("data-travel-stream-form")&&planner.includes("data-travel-stream-output"));
assert(css.includes("--wf-aegean-900:#123d3a")&&css.includes("@media screen and (max-width:479px)"));
assert(bridge.includes("/api/ai-map")&&bridge.includes("/api/recommend/stream"));
assert(!/SERVICE_ROLE|OPENAI_API_KEY|DEEPSEEK_API_KEY/.test(bridge),"browser bridge must not contain server secrets");

console.log("V31_WEBFLOW_SMOKE_OK",JSON.stringify({cors:"exact-origin",home:true,map:true,planner:true,responsive:true,secrets:"none"}));
