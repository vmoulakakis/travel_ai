import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const md=readFileSync("docs/TRAVELAI_360_KNOWLEDGE_FABRIC_LOCKED.md","utf8");
const sql=readFileSync("supabase/migrations/20261008124500_travel360_shadow_knowledge_fabric.sql","utf8");
for(const x of ["Geospatial","Temporal","Experiences","Stays","Traveler Intelligence","Evidence & Trust","Hybrid","nDCG@10","hard eligibility","Escape Book"]){assert.ok(md.toLowerCase().includes(x.toLowerCase()),"Missing 360 domain "+x)}
for(const t of ["travel360_corpus_v1","travel360_embeddings_v1","travel360_eval_scenarios_v1","travel360_eval_runs_v1","travel360_feature_snapshots_v1"]){assert.ok(sql.includes("create table if not exists public."+t),"Missing "+t);assert.ok(sql.includes("alter table public."+t+" enable row level security"),"Missing RLS "+t)}
assert.ok(sql.includes("revoke all on table"),"Service-only exposure protection missing");
assert.ok(sql.includes("embedding extensions.vector(384)"),"Model dimension contract missing");
assert.ok(md.includes("0 populated stay_places.embedding"),"Do not imply trained neural retrieval");
console.log("TRAVEL360_FABRIC_CONTRACT_SMOKE_OK domains=6 shadow_tables=5 activation=disabled");
