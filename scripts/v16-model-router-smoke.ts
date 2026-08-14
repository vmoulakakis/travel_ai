import assert from "node:assert/strict";
import { createLLMRequestBudgetV16,routingDecisionV16,semanticRiskV16 } from "@/lib/ai/model-router-v9";

const clear=routingDecisionV16({task:"intent",text:"θέλω ήσυχο ταξίδι και καλό φαγητό",deterministicConfidence:.97});
assert.equal(clear.useAnyModel,false);

const ambiguous=routingDecisionV16({task:"intent",text:"κάτι ωραίο αλλά όχι πολύ αυτό, ίσως κάπως αλλιώς",deterministicConfidence:.62});
assert.equal(ambiguous.useAnyModel,true);
assert.equal(ambiguous.allowOpenAI,false);

const hard=routingDecisionV16({task:"stay-constraints",text:"θέλω κατάλυμα μπροστά στη θάλασσα μόνο, χωρίς εξαίρεση",deterministicConfidence:.52,hardConstraintRisk:true});
assert.equal(hard.allowDeepSeek,true);
assert.ok(semanticRiskV16({task:"stay-constraints",text:"μόνο και χωρίς εξαίρεση",deterministicConfidence:.1,hardConstraintRisk:true,contradictorySignals:true})>=.9);
const hardest=routingDecisionV16({task:"verification",text:"μόνο και χωρίς εξαίρεση",deterministicConfidence:.1,hardConstraintRisk:true,contradictorySignals:true});
assert.equal(hardest.allowOpenAI,true);

process.env.LLM_MAX_FREE_CALLS_PER_REQUEST="2";
process.env.LLM_MAX_PAID_CALLS_PER_REQUEST="2";
process.env.LLM_MAX_OPENAI_CALLS_PER_REQUEST="1";
process.env.LLM_MAX_RESERVED_OUTPUT_TOKENS_PER_REQUEST="500";
const budget=createLLMRequestBudgetV16();
const free={tier:"free" as const,model:{} as never,maxOutputTokens:100,timeoutMs:1000,label:"free"};
const deep={tier:"deepseek" as const,model:{} as never,maxOutputTokens:120,timeoutMs:1000,label:"deepseek"};
const open={tier:"openai" as const,model:{} as never,maxOutputTokens:120,timeoutMs:1000,label:"openai"};
assert.equal(budget.reserve(free,2),true);
assert.equal(budget.reserve(free,1),false,"free turn ceiling must hold");
assert.equal(budget.reserve(open,1),true);
assert.equal(budget.reserve(open,1),false,"OpenAI default request ceiling must hold");
assert.equal(budget.reserve(deep,1),true);
assert.equal(budget.reserve(deep,1),false,"paid call ceiling must include OpenAI + DeepSeek together");
assert.ok(budget.snapshot().reservedOutputTokens<=500);

console.log("V16_MODEL_ROUTER_OK",JSON.stringify({clear,ambiguous,hard,hardest,budget:budget.snapshot()}));
