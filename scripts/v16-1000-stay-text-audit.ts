import assert from "node:assert/strict";
import { evaluateStayOfferV16,parseStayConstraintsV16 } from "@/lib/decision/stay-constraints-v16";
import type { StayConstraintKind,V8StayOffer } from "@/lib/decision/v8-types";

type Case={text:string;hard:StayConstraintKind[];soft?:StayConstraintKind[];label:string};
const hardTemplates:Case[]=[
 {text:"θέλω κατάλυμα μπροστά στη θάλασσα μόνο",hard:["BEACHFRONT"],label:"el-beachfront"},
 {text:"ξενοδοχείο πάνω στην παραλία οπωσδήποτε",hard:["BEACHFRONT"],label:"el-on-beach"},
 {text:"μπροστά στην παραλία μόνο",hard:["BEACHFRONT"],label:"el-scoped-only"},
 {text:"thelo katalyma mprosta sti thalassa mono",hard:["BEACHFRONT"],label:"greeklish-beachfront"},
 {text:"hotel beachfront only",hard:["BEACHFRONT"],label:"en-beachfront"},
 {text:"κατάλυμα κοντά στην παραλία μόνο",hard:["NEAR_BEACH"],label:"el-near"},
 {text:"stay near the beach only",hard:["NEAR_BEACH"],label:"en-near"},
 {text:"θέλω ξενοδοχείο με πρωινό οπωσδήποτε",hard:["BREAKFAST"],label:"el-breakfast"},
 {text:"hotel with breakfast only",hard:["BREAKFAST"],label:"en-breakfast"},
 {text:"θέλω ξενοδοχείο μπροστά στη θάλασσα μόνο και πρωινό οπωσδήποτε",hard:["BEACHFRONT","BREAKFAST"],label:"el-multi"},
];
const softTemplates:Case[]=[
 {text:"θα ήθελα θέα θάλασσα αν γίνεται",hard:[],soft:["SEA_VIEW"],label:"soft-seaview"},
 {text:"μου αρέσει να έχει πισίνα",hard:[],soft:["POOL"],label:"soft-pool"},
 {text:"κοντά στην παραλία θα ήταν ωραία",hard:[],soft:["NEAR_BEACH"],label:"soft-near"},
 {text:"parking αν γίνεται",hard:[],soft:["PARKING"],label:"soft-parking"},
 {text:"pet friendly θα ήταν καλό",hard:[],soft:["PET_FRIENDLY"],label:"soft-pet"},
];
const adversarial:Case[]=[
 {text:"μόνο Ελλάδα, κατάλυμα με πρωινό αν γίνεται",hard:[],soft:["BREAKFAST"],label:"only-country"},
 {text:"μόνο νησί, ξενοδοχείο με πισίνα αν υπάρχει",hard:[],soft:["POOL"],label:"only-island"},
 {text:"θέλω κατάλυμα, μόνο αν αξίζει, κοντά στην παραλία",hard:[],soft:["NEAR_BEACH"],label:"only-if-worth"},
 {text:"μόνο για ζευγάρι, θα ήθελα θέα θάλασσα",hard:[],soft:["SEA_VIEW"],label:"only-couple"},
 {text:"only Greece, hotel with breakfast if possible",hard:[],soft:["BREAKFAST"],label:"only-greece-en"},
];
const fillers=["για τέσσερις νύχτες","με ήσυχο ρυθμό","για δύο άτομα","τον Σεπτέμβριο","χωρίς να τρέχω","με καλό φαγητό","για χαλάρωση","με ωραία ατμόσφαιρα"];
const offer=(name:string,details:string):V8StayOffer=>({sourceProductId:name,propertyName:name,description:"generic offer",trackingUrl:"https://go.linkwi.se/z/1-0/CD104/?lnkurl=x",validFrom:"2026-08-01T00:00:00Z",validTo:"2026-12-01T00:00:00Z",raw:{details}});
const canonical=(items:StayConstraintKind[])=>[...items].sort().join("|");
let hardCases=0,softCases=0,falseHard=0,evidenceChecks=0;
const all=[...hardTemplates,...softTemplates,...adversarial];
for(let i=0;i<1000;i+=1){
 const base=all[i%all.length],suffix=fillers[(i*7+3)%fillers.length],prefix=i%4===0?"Λοιπόν, ":i%4===1?"":i%4===2?"ιδανικά ":"για το ταξίδι μου ",text=`${prefix}${base.text} ${suffix}`.trim(),parsed=parseStayConstraintsV16(text);
 try{assert.equal(canonical(parsed.hard),canonical(base.hard),`${base.label}: wrong hard set for ${text}`);for(const expected of base.soft??[])assert.ok(parsed.soft.includes(expected),`${base.label}: missing soft ${expected}`);}catch(error){console.error("V16_STAY_TEXT_CASE_FAIL",JSON.stringify({i,label:base.label,text,expectedHard:base.hard,actualHard:parsed.hard,actualSoft:parsed.soft}));throw error;}
 if(base.hard.length)hardCases+=1;else softCases+=1;if(!base.hard.length&&parsed.hard.length)falseHard+=1;
 if(parsed.hard.includes("BEACHFRONT")){
  const nameOnly=offer(`Beach Hotel ${i}`,"Άνετα δωμάτια και πρωινό."),explicit=offer(`Coastal Stay ${i}`,"Το κατάλυμα βρίσκεται ακριβώς μπροστά στην παραλία.");
  assert.equal(evaluateStayOfferV16(nameOnly,parsed).passed,false,"hotel name alone must never prove beachfront");
  if(parsed.hard.length===1)assert.equal(evaluateStayOfferV16(explicit,parsed).passed,true,"explicit beachfront evidence must pass a beachfront-only requirement");
  evidenceChecks+=2;
 }
}
assert.equal(falseHard,0);
console.log("V16_1000_STAY_TEXT_AUDIT_OK",JSON.stringify({cases:1000,hardCases,softOrAdversarialCases:softCases,falseHard,evidenceChecks,templates:all.length}));
