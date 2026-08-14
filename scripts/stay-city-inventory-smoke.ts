import assert from "node:assert/strict";
import { buildInventoryDestinationOptionsV15,isJunkStayCityV15,sanitizeStayCityRowsV15 } from "../lib/data/stay-cities-v15";

const rows:Array<Record<string,unknown>>=[
 {city:"all",property_count:485,offer_count:488},
 {city:"Ημερήσια Κρουαζιέρα",property_count:3,offer_count:3},
 {city:"Κρουαζιέρα",property_count:2,offer_count:2},
 {city:"Σαντορίνη",property_count:41,offer_count:41},
 {city:"Φηρά, Σαντορίνη",property_count:8,offer_count:8},
 {city:"Πάρος",property_count:31,offer_count:31},
 {city:"Νάουσα, Πάρος",property_count:6,offer_count:6},
 {city:"Χανιά, Κρήτη",property_count:14,offer_count:14},
 {city:"Χανιά",property_count:4,offer_count:6},
 {city:"Νάξος",property_count:29,offer_count:29},
 {city:"Νάξος",property_count:0,offer_count:0},
];
const destinations=[
 {slug:"santorini",nameEl:"Σαντορίνη",nameEn:"Santorini",aliases:["Thera"]},
 {slug:"paros",nameEl:"Πάρος",nameEn:"Paros",aliases:[]},
 {slug:"chania",nameEl:"Χανιά",nameEn:"Chania",aliases:[]},
 {slug:"naxos",nameEl:"Νάξος",nameEn:"Naxos",aliases:[]},
] as const;

const cleaned=sanitizeStayCityRowsV15(rows);
assert(cleaned.every(city=>city.propertyCount>0&&city.offerCount>0));
assert(!cleaned.some(city=>isJunkStayCityV15(city.value)));
assert(!cleaned.some(city=>/all|κρουαζι/i.test(city.value)));
const options=buildInventoryDestinationOptionsV15(cleaned,destinations,"el");
assert.deepEqual(options.map(option=>option.slug).sort(),["chania","naxos","paros","santorini"]);
assert.equal(options.find(option=>option.slug==="santorini")?.propertyCount,41);
assert(options.find(option=>option.slug==="paros")?.sourceCities.includes("Νάουσα, Πάρος"));
assert.equal(new Set(options.map(option=>option.slug)).size,options.length);
console.log("STAY_CITY_INVENTORY_OK",JSON.stringify({raw:rows.length,cleaned:cleaned.length,options:options.map(({slug,propertyCount})=>({slug,propertyCount}))}));
