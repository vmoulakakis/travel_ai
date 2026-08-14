from pathlib import Path
p=Path('lib/decision/v8-matcher.ts')
s=p.read_text()
start=s.index('function freeTextPreferenceAdjustment(')
end=s.index('\n}',start)+2
block=s[start:end]
assert ' return delta;' in block, 'semantic adjustment return not found'
block=block.replace(' return delta;',' return clamp(delta,-5,5);',1)
p.write_text(s[:start]+block+s[end:])
