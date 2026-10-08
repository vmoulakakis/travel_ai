#!/usr/bin/env python3
"""TravelAI 360 research intake: Wikidata CC0 Greece POIs to reviewed JSONL.
No external API key, no DB writes; obey query.wikidata.org rate limits/UA requirements.
Outputs candidate facts (not reviews or verified open times). Requires Python stdlib only.
"""
import argparse,hashlib,json,time,urllib.parse,urllib.request
SPARQL="""SELECT DISTINCT ?item ?itemLabel ?coord ?typeLabel ?article WHERE {
 ?item wdt:P17 wd:Q41; wdt:P625 ?coord; wdt:P31 ?type.
 VALUES ?type {wd:Q33506 wd:Q570116 wd:Q839954 wd:Q179700 wd:Q23413 wd:Q3375722 wd:Q35509}
 OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://el.wikipedia.org/>. }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "el,en". }
} LIMIT %d"""
TYPES={"museum","archaeological","castle","park","monument","beach","attraction"}
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--output",required=True)
 p.add_argument("--limit",type=int,default=100)
 p.add_argument("--execute",action="store_true",help="Opt-in public read-only request")
 p.add_argument("--user-agent",default="TravelAIResearch/0.1 (research provenance; contact via GitHub vmoulakakis/travel_ai)")
 a=p.parse_args()
 if not 1<=a.limit<=300:raise ValueError("limit must be 1..300")
 query=SPARQL%a.limit
 if not a.execute:
  print(json.dumps({"status":"dry-run","endpoint":"https://query.wikidata.org/sparql","limit":a.limit,"license":"CC0","no_reviews":True}))
  return
 req=urllib.request.Request("https://query.wikidata.org/sparql?"+urllib.parse.urlencode({"query":query,"format":"json"}),headers={"Accept":"application/sparql-results+json","User-Agent":a.user_agent})
 with urllib.request.urlopen(req,timeout=35) as resp:
  obj=json.load(resp)
 rows=[]
 for row in obj.get("results",{}).get("bindings",[]):
  item=row.get("item",{}).get("value","")
  if not item.startswith("http://www.wikidata.org/entity/Q"):continue
  label=row.get("itemLabel",{}).get("value","").strip()
  coord=row.get("coord",{}).get("value","")
  import re
  match=re.fullmatch(r"Point\((-?[\d.]+) (-?[\d.]+)\)",coord)
  if not match or not label:continue
  lon,lat=map(float,match.groups())
  if not 34<=lat<=42.5 or not 19<=lon<=30:continue
  id="wikidata:"+item.rsplit("/",1)[-1]
  rows.append({"id":id,"entity_kind":"poi","name":label,"latitude":lat,"longitude":lon,"source_url":item,"source_refs":[{"url":item,"license":"CC0","publisher":"Wikidata","observed_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}],"claims":[{"predicate":"instance_of","value":row.get("typeLabel",{}).get("value",""),"confidence":"source-observed"}],"status":"unverified-candidate","content_hash":hashlib.sha256((id+label+coord).encode()).hexdigest()})
 with open(a.output,"w",encoding="utf-8") as out:
  for row in rows:out.write(json.dumps(row,ensure_ascii=False)+"\n")
 print(json.dumps({"status":"candidate-extract-only","candidates":len(rows),"output":a.output,"license":"CC0","activated":False}))
if __name__=="__main__":main()
