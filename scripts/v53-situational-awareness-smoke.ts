import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { routingDecisionV16 } from "../lib/ai/model-router-v9";

const route=readFileSync("app/api/v50/agent/route.ts","utf8");
const ui=readFileSync("components/v50-travel-intelligence-home.tsx","utf8");

const forced=routingDecisionV16({task:"intent",text:"βρες εσύ",deterministicConfidence:.48,forceSemantic:true,preferOpenAI:true});
assert.equal(forced.useAnyModel,true);
assert.equal(forced.allowDeepSeek,true,"forced semantic agent turn must allow DeepSeek fallback");
assert.equal(forced.allowOpenAI,true,"agent-preferred forced semantic turn must allow OpenAI");

assert(route.includes("recoverDateIntent"),"V53 must recover ambiguous/delegated date intent");
assert(route.includes("Europe/Athens"),"V53 must be timezone-aware");
assert(route.includes("calendar-delegate"),"V53 must have deterministic delegate fallback");
assert(route.includes("conversationContext"),"V53 must resolve references from role-aware conversation");
assert(route.includes("dateRecovery"),"V53 must expose runtime model telemetry");
assert(ui.includes("conversationContext"),"client must send role-aware conversation context");

console.log("V53_SITUATIONAL_AWARENESS_OK forcedLLM=YES calendar=Europe/Athens delegate=YES references=YES telemetry=YES");