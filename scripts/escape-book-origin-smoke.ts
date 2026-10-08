import assert from "node:assert/strict";
import { sameOrigin } from "../lib/decision/escape-origin-gate";

assert.equal(sameOrigin("Αθήνα","Αθήνα","athens"),true);
assert.equal(sameOrigin("Αθήνα","Athens Center","athens"),true);
assert.equal(sameOrigin("Athens","Αθήνα","athens"),true);
assert.equal(sameOrigin("Αθήνα","Μέτσοβο","metsovo"),false);
assert.equal(sameOrigin("Αθήνα","Πήλιο","pelion"),false);
assert.equal(sameOrigin("Θεσσαλονίκη","Thessaloniki","thessaloniki"),true);
assert.equal(sameOrigin("Θεσσαλονίκη","Χαλκιδική","chalkidiki"),false);
console.log("ESCAPE_BOOK_ORIGIN_GATE_OK");
