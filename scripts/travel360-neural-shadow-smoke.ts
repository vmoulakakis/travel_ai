import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const code=readFileSync("scripts/travel360_train_neural_shadow.py","utf8");
for(const s of ["SUPABASE_SERVICE_ROLE_KEY","travel_knowledge_entities_v44","source_ref","normalize_embeddings=True","qa_status","shadow_not_live","entity_type"])assert.ok(code.includes(s),s);
assert.ok(!code.includes("INSERT INTO")&&!code.includes("upsert("),"no production training writes");
console.log("TRAVEL360_NEURAL_SHADOW_PIPELINE_CONTRACT_OK");
