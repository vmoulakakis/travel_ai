from pathlib import Path

p=Path('lib/ai/intent-v8.ts'); s=p.read_text()
old='const base=structuredIntent(request),text=request.tripText?.trim();if(!text||text.length<3)return base;const fallback=base.semantic??deterministicSemanticIntentV18(text);'
new='const base=structuredIntent(request),text=request.tripText?.trim();if(!text||text.length<3)return base;const fallback=base.semantic??deterministicSemanticIntentV18(text),normalized=normalizedFreeText(text),clauseCount=(normalized.match(/(?:,| και | and | αλλα | but | ομως | however | χωρις | without )/g)??[]).length,semanticConflict=V8_DIMENSIONS.some(d=>(fallback.positive[d]??0)>.25&&(fallback.negative[d]??0)>.25),complexTradeoff=semanticConflict||clauseCount>=3;'
assert old in s;s=s.replace(old,new,1)
old='context:{task:"intent",text,deterministicConfidence:.55,hardConstraintRisk:false,contradictorySignals:true,forceSemantic:true}'
new='context:{task:"intent",text,deterministicConfidence:fallback.confidence,hardConstraintRisk:false,contradictorySignals:complexTradeoff,forceSemantic:true}'
assert old in s;s=s.replace(old,new,1)
p.write_text(s)

p=Path('lib/ai/travel-orchestrator-v15.ts'); s=p.read_text()
anchor='import { canonicalRankingInputsV19 } from "@/lib/decision/canonical-ranking-v19";'
assert anchor in s;s=s.replace(anchor,anchor+'\nimport { semanticNeedsClarificationV19 } from "@/lib/ai/semantic-policy-v19";',1)
anchor='const catalog=allDestinations.filter(destination=>destination.countryCode==="GR"),{hardConstraint,constrainedCatalog,rankingTrip}=canonicalRankingInputsV19(trip,catalog);'
assert anchor in s
insert=anchor+'\n  const hasHardSemanticContext=Boolean(hardConstraint||stayRequirements.hard.length||stayRequirements.soft.length);\n  if(semanticNeedsClarificationV19(intent,trip.tripText,hasHardSemanticContext)){\n   signal("understand:clarify",24,{agent:"intent-constraint",confidence:intent.semantic?.confidence??0});\n   writeRecommendationAudit({sessionId,status:"no-result",stage:"intent-clarification",timingsMs:{...timings,total:Date.now()-started},intentSource:intent.source,hardConstraint:hardConstraint?.id??null,stayRequirements:stayRequirementAudit(stayRequirements),llmBudget:llmBudget.snapshot(),catalogSize:catalog.length,auditor:{roles}});\n   throw new TravelDecisionError(422,trip.language==="en"?"I could not understand the free-text note with enough confidence. Add one concrete thing you want or want to avoid, for example: beach/swimming, quiet, good food, or no nightlife.":"Δεν κατάλαβα το ελεύθερο κείμενο με αρκετή βεβαιότητα. Γράψε ένα συγκεκριμένο πράγμα που θέλεις ή δεν θέλεις, π.χ. «μπάνια», «ήσυχα», «καλό φαγητό» ή «όχι nightlife».","intent-clarification");\n  }'
s=s.replace(anchor,insert,1)
p.write_text(s)

p=Path('scripts/v19-10000-semantic-match-audit.ts'); s=p.read_text()
anchor='import { deterministicSemanticIntentV18,structuredIntent } from "../lib/ai/intent-v8";'
assert anchor in s;s=s.replace(anchor,anchor+'\nimport { semanticNeedsClarificationV19 } from "../lib/ai/semantic-policy-v19";',1)
anchor=' const catalog=(await loadV8DestinationCatalog()).filter(x=>x.countryCode==="GR");'
assert anchor in s
insert=anchor+'\n const vague=structuredIntent(profile("κάτι καλό")),bania=structuredIntent(profile("θελω μπασια"));\n assert.equal(semanticNeedsClarificationV19(vague,"κάτι καλό",false),true,"vague free text must ask for clarification instead of being ignored");\n assert.equal(semanticNeedsClarificationV19(bania,"θελω μπασια",false),false,"recoverable swimming typo must not trigger clarification");\n assert.ok((bania.semantic?.positive.beach??0)>=.62,"μπασια must recover toward μπάνια / beach intent");\n assert.equal(semanticNeedsClarificationV19(vague,"μόνο Κρήτη",true),false,"understood hard geography must not ask an unrelated clarification");'
s=s.replace(anchor,insert,1)
p.write_text(s)
