import assert from "node:assert/strict";
import { readFileSync,existsSync } from "node:fs";

const read=(path:string)=>readFileSync(path,"utf8");
const shell=read("components/v31-site-shell.tsx"),home=read("components/v31-native-home.tsx"),map=read("components/stay-product-map-v32.tsx"),data=read("lib/data/stay-product-map-v32.ts"),api=read("app/api/stay-map/route.ts"),sitemap=read("app/sitemap.ts"),css=read("app/v32-product-map.css");

assert(existsSync("app/stays-map/page.tsx")&&existsSync("app/en/stays-map/page.tsx"),"V32 requires bilingual stay map routes");
assert(shell.includes("/stays-map")&&shell.includes("wf-mobile-menu"),"navigation must expose Stay Map and a mobile menu");
assert(home.includes("v32-app-grid")&&home.includes("PRODUCT MAP")&&home.includes("/stays-map"),"home must act as a multipage app hub");
assert(map.includes("maps.googleapis.com/maps/api/js")&&map.includes("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),"Google Maps progressive enhancement missing");
assert(map.includes("tile.openstreetmap.org")&&map.includes('setEngine("osm")'),"OpenStreetMap fail-safe fallback missing");
assert(map.includes("stay-price-marker")&&map.includes("trackingUrl")&&map.includes("/api/stay-map?limit=240"),"real product marker wiring missing");
assert(data.includes("stay-product-map-v32")&&data.includes("latitude")&&data.includes("longitude"),"safe product map data adapter missing");
assert(!map.includes("SUPABASE_SERVICE_ROLE_KEY")&&!api.includes("SUPABASE_SERVICE_ROLE_KEY"),"server credentials must never enter the browser/API surface");
assert(sitemap.includes('pair("/stays-map","/en/stays-map"'),"stay map hreflang sitemap pair missing");
assert(css.includes(".wf-mobile-menu")&&css.includes(".stay-map-workspace")&&css.includes(".stay-price-marker"),"responsive product-map design system missing");
console.log("V32 multipage + product-map smoke passed");
