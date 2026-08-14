from pathlib import Path

# intent-v8: delegate deterministic fallback to V19 and allow short meaningful text to reach semantic routing.
p=Path('lib/ai/intent-v8.ts'); s=p.read_text()
anchor='import { createLLMRequestBudgetV16,generateJsonWithRoutingV16,type LLMRequestBudgetV16,type ModelTierV16 } from "@/lib/ai/model-router-v9";'
assert anchor in s
s=s.replace(anchor,anchor+'\nimport { deterministicSemanticIntentV19 } from "@/lib/ai/semantic-fallback-v19";',1)
start=s.index('export function deterministicSemanticIntentV18(raw:string):V8SemanticIntent{')
end=s.index('\nfunction semanticFromParsed',start)
s=s[:start]+'export function deterministicSemanticIntentV18(raw:string):V8SemanticIntent{return deterministicSemanticIntentV19(raw);}\n'+s[end:]
assert 'if(!text||text.length<8)return base;' in s
s=s.replace('if(!text||text.length<8)return base;','if(!text||text.length<3)return base;',1)
p.write_text(s)

# geography: add Greeklish forms and preserve hard constraints before sanitization.
p=Path('lib/decision/geography-constraint.ts'); s=p.read_text()
s=s.replace('"only","exclusively","must"]','"only","exclusively","must","mono"]',1)
s=s.replace('"western greece","west greece"]','"western greece","west greece","dytiki ellada","ditiki ellada"]',1)
s=s.replace('phrases:["κρητη","crete"]','phrases:["κρητη","crete","kriti","krhth"]',1)
s=s.replace('phrases:["κυκλαδες","cyclades"]','phrases:["κυκλαδες","cyclades","kyklades","kiklades"]',1)
s=s.replace('["δεν θελω μονο","δεν ζηταω μονο","δεν επιμενω μονο","not only"]','["δεν θελω μονο","δεν ζηταω μονο","δεν επιμενω μονο","not only","den thelo mono","den zitao mono"]',1)
s=s.replace('"not only islands"]);','"not only islands","oxi mono nisi","den thelo mono nisi"]);',1)
s=s.replace('"not an island"]);','"not an island","xoris nisi","xwris nisi","oxi nisi","den thelo nisi"]);',1)
s=s.replace('"want an island"]);','"want an island","mono nisi","thelo nisi mono","thelo nisi"]);',1)
p.write_text(s)

# audit: user's real screenshot typo "μπασια" is treated as likely "μπάνια" (beach/swimming), not generic ambiguity.
p=Path('scripts/v19-10000-semantic-match-audit.ts'); s=p.read_text()
old='{id:"ambiguous-basia",category:"ambiguous",variants:["θελω μπασια","θέλω μπασια","thelo basia"],ambiguous:true},'
new='{id:"beach-basia-typo",category:"positive",variants:["θελω μπασια","θέλω μπασια","θελο μπασια","thelo mpasia"],positive:["beach",.62]},'
assert old in s
s=s.replace(old,new,1)
p.write_text(s)
