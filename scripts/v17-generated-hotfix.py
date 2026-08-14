from pathlib import Path
p=Path('lib/decision/v8-matcher.ts')
s=p.read_text()
old='if(d.tags.includes("resort")&&/(?:not a generic resort|generic resort)/i.test(text))delta-=6;'
assert old in s, 'generated resort-tag assumption not found'
p.write_text(s.replace(old,'',1))
