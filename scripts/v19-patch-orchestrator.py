from pathlib import Path
p=Path('lib/ai/travel-orchestrator-v15.ts')
s=p.read_text()
old='import { geographyConstraint } from "@/lib/decision/geography-constraint";'
new='import { canonicalRankingInputsV19 } from "@/lib/decision/canonical-ranking-v19";'
assert old in s, 'geography import anchor missing'
s=s.replace(old,new,1)
old='const catalog=allDestinations.filter(destination=>destination.countryCode==="GR"),hardConstraint=geographyConstraint(trip,catalog),rankingTrip:TripRequest={...trip,tripText:""};'
new='const catalog=allDestinations.filter(destination=>destination.countryCode==="GR"),{hardConstraint,constrainedCatalog,rankingTrip}=canonicalRankingInputsV19(trip,catalog);'
assert old in s, 'canonical input anchor missing'
s=s.replace(old,new,1)
old='const rawPre=preRankV8(rankingTrip,intent,catalog,Math.max(30,catalog.length)),preAll=applySemanticIntentRankingV18(rawPre,intent).slice(0,30),minimum=(hardConstraint||stayRequirements.hard.length)?1:3;mark("pre-rank");'
new='const rawPre=preRankV8(rankingTrip,intent,constrainedCatalog,Math.max(30,constrainedCatalog.length)),preAll=applySemanticIntentRankingV18(rawPre,intent).slice(0,30),minimum=(hardConstraint||stayRequirements.hard.length)?1:3;mark("pre-rank");'
assert old in s, 'pre-rank anchor missing'
s=s.replace(old,new,1)
p.write_text(s)
