from pathlib import Path

p=Path('lib/ai/semantic-fallback-v19.ts'); s=p.read_text()
s=s.replace('/παιδ|οικογεν|family|children|kids|paidi|paidak|oikogene/', '/παιδ|οικογεν|family|children|kids|paidi|paidak|oikogene|oikogeniak|pedia/', 1)
s=s.replace('/ρομαντ|ζευγαρ|romantic|romance|couple|zeygar|zeugar/', '/ρομαντ|ζευγαρ|romantic|romance|romantik|couple|zeygar|zeugar/', 1)
old='const negativeCity=any(text,[/(?:οχι|δεν θελω|χωρις).{0,20}(?:πολη|αστικ)/,/(?:not|no|without|oxi).{0,20}(?:city|urban|astik)/]);'
new='const negativeCity=any(text,[/(?:οχι|δεν θελω|χωρις|not|no|without|oxi).{0,24}(?:πολη|αστικ|city|urban|astik)/]);'
assert old in s; s=s.replace(old,new,1)
s=s.replace('if(warmth)pos("warmth",.8);if(explicitCity)pos("city",.86);','if(warmth)pos("warmth",.8);if(explicitCity&&!negativeCity)pos("city",.86);',1)
s=s.replace('dont want a long transfer|do not want a long transfer', 'dont want a long transfer|don t want a long transfer|do not want a long transfer',1)
s=s.replace('(?:πρωτ|priority|first)`)', '(?:πρωτ|priority|first|prota|proteraiotita)`)',1)
p.write_text(s)

p=Path('scripts/v19-10000-semantic-match-audit.ts'); s=p.read_text()
old='function directionOk(t:Template,withText:number,withoutText:number){if(!Number.isFinite(withText)||!Number.isFinite(withoutText))return true;if(t.negative||t.qualifier?.[0]==="avoidCrowds")return withText<=withoutText+.08;if(t.qualifier?.[0]==="easyAccess")return withText>=withoutText-2;return withText>=withoutText-.025}'
new='function directionOk(t:Template,withText:number,withoutText:number){if(!Number.isFinite(withText)||!Number.isFinite(withoutText))return true;if(t.positive)return withText>=withoutText-.025;if(t.negative||t.qualifier?.[0]==="avoidCrowds")return withText<=withoutText+.08;if(t.qualifier?.[0]==="easyAccess")return withText>=withoutText-2;return withText>=withoutText-.025}'
assert old in s; s=s.replace(old,new,1)
anchor='assert(parseOk/Math.max(1,parseTotal)>=.95,`Semantic parse accuracy only ${(parseOk/Math.max(1,parseTotal)*100).toFixed(1)}%`);'
assert anchor in s
extra=anchor+'\n const rate=(name:string)=>byCategory.get(name)!.ok/byCategory.get(name)!.total;\n assert(rate("positive")>=.98,`Positive parse only ${(rate("positive")*100).toFixed(1)}%`);\n assert(rate("negative")>=.98,`Negative parse only ${(rate("negative")*100).toFixed(1)}%`);\n assert(rate("qualifier")>=.98,`Qualifier parse only ${(rate("qualifier")*100).toFixed(1)}%`);\n assert(rate("priority")>=.98,`Priority parse only ${(rate("priority")*100).toFixed(1)}%`);\n assert(rate("mixed")>=.95,`Mixed parse only ${(rate("mixed")*100).toFixed(1)}%`);'
s=s.replace(anchor,extra,1)
p.write_text(s)
