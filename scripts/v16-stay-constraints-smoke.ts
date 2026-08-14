import assert from "node:assert/strict";
import { evaluateStayOfferV16,parseStayConstraintsV16 } from "@/lib/decision/stay-constraints-v16";
import type { V8StayOffer } from "@/lib/decision/v8-types";

const offer=(name:string,details:string):V8StayOffer=>({sourceProductId:name,propertyName:name,description:"generic hotel offer",trackingUrl:"https://go.linkwi.se/z/1-0/CD104/?lnkurl=x",validFrom:"2026-08-01T00:00:00Z",validTo:"2026-12-01T00:00:00Z",raw:{details}});

const beachfrontOnly=parseStayConstraintsV16("θελω μπροστα στην θαλασσα καταλυμα μονο");
assert.deepEqual(beachfrontOnly.hard,["BEACHFRONT"]);
assert.equal(beachfrontOnly.confidence,"HIGH");

const greeklish=parseStayConstraintsV16("thelo katalyma mprosta sti thalassa mono");
assert.ok(greeklish.hard.includes("BEACHFRONT"));

const seaViewSoft=parseStayConstraintsV16("θέλω θέα θάλασσα αν γίνεται");
assert.ok(seaViewSoft.soft.includes("SEA_VIEW"));
assert.equal(seaViewSoft.hard.includes("SEA_VIEW"),false);

const nameOnly=offer("5* Amazing Beach Hotel","Μεγάλα δωμάτια και πρωινό.");
assert.equal(evaluateStayOfferV16(nameOnly,beachfrontOnly).passed,false,"Beach in hotel name must not prove beachfront");

const explicit=offer("Coastal Hotel","Το ξενοδοχείο βρίσκεται ακριβώς μπροστά στην παραλία και προσφέρει πρωινό.");
assert.equal(evaluateStayOfferV16(explicit,beachfrontOnly).passed,true);

const nearOnly=parseStayConstraintsV16("κατάλυμα κοντά στην παραλία μόνο");
const near=offer("Near Stay","Το κατάλυμα βρίσκεται 150 μέτρα από την παραλία.");
assert.equal(evaluateStayOfferV16(near,nearOnly).passed,true);

const multiple=parseStayConstraintsV16("θέλω ξενοδοχείο μπροστά στη θάλασσα μόνο και πρωινό οπωσδήποτε");
assert.ok(multiple.hard.includes("BEACHFRONT"));
assert.ok(multiple.hard.includes("BREAKFAST"));
assert.equal(evaluateStayOfferV16(offer("Sea Stay","Βρίσκεται πάνω στην παραλία."),multiple).passed,false,"Every hard requirement must pass");
assert.equal(evaluateStayOfferV16(offer("Sea Stay","Βρίσκεται πάνω στην παραλία. Περιλαμβάνει πρωινό."),multiple).passed,true);

console.log("V16_STAY_CONSTRAINTS_OK",JSON.stringify({beachfrontOnly,greeklish,seaViewSoft,multiple}));
