#!/usr/bin/env python3
"""TravelAI 360: reproducible local neural corpus indexing, NOT supervised fine-tuning.

Read existing Supabase knowledge entities (server secret in environment only), keep
provenance, encode all travel entity categories with multilingual-e5-small,
and produce versioned shadow embeddings. Never alters production.
Prerequisites: pip install 'sentence-transformers>=3,<6'
Usage: SUPABASE_SERVICE_ROLE_KEY=... python scripts/travel360_train_neural_shadow.py --output ./artifacts/travel360-shadow.jsonl
"""
import argparse,hashlib,json,os,pathlib,urllib.parse,urllib.request
def load_rows(limit):
 base=os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
 token=os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
 if not base or not token:raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY locally; never commit secrets")
 rows=[]
 for offset in range(0,limit,500):
  params=urllib.parse.urlencode({"select":"id,entity_type,canonical_key,canonical_name,semantic_text,source_ref,active","limit":str(min(500,limit-offset)),"offset":str(offset),"order":"canonical_key.asc"})
  request=urllib.request.Request(base.rstrip("/")+"/rest/v1/travel_knowledge_entities_v44?"+params,headers={"apikey":token,"Authorization":"Bearer "+token})
  with urllib.request.urlopen(request,timeout=30) as response:page=json.load(response)
  rows.extend(page)
  if len(page)<500:break
 return rows
def main():
 p=argparse.ArgumentParser();p.add_argument("--output",required=True);p.add_argument("--limit",type=int,default=3500)
 p.add_argument("--model",default="intfloat/multilingual-e5-small");p.add_argument("--local-files-only",action="store_true")
 a=p.parse_args()
 if not 1<=a.limit<=10000:raise ValueError("limit out of bounds")
 rows=[r for r in load_rows(a.limit) if r.get("active") is not False and r.get("semantic_text") and r.get("source_ref")]
 if not rows:raise RuntimeError("No evidenced semantic corpus")
 from sentence_transformers import SentenceTransformer
 model=SentenceTransformer(a.model,local_files_only=a.local_files_only)
 vectors=model.encode(["passage: "+str(r["semantic_text"]) for r in rows],batch_size=16,normalize_embeddings=True,show_progress_bar=True)
 if vectors.shape[1]!=384:raise ValueError("unexpected embedding dimension")
 path=pathlib.Path(a.output);path.parent.mkdir(parents=True,exist_ok=True)
 with path.open("w",encoding="utf8") as out:
  for row,vec in zip(rows,vectors):
   t=row["semantic_text"]
   item={"entity_id":row["id"],"entity_type":row["entity_type"],"canonical_key":row["canonical_key"],"text_hash":hashlib.sha256(t.encode()).hexdigest(),"model_id":a.model,"dimensions":384,"source_ref":row["source_ref"],"vector":vec.tolist(),"qa_status":"shadow"}
   out.write(json.dumps(item,ensure_ascii=False)+"\n")
 print(json.dumps({"count":len(rows),"by_type":{t:sum(r["entity_type"]==t for r in rows) for t in sorted({r["entity_type"] for r in rows})},"model":a.model,"output":str(path),"status":"shadow_not_live"},ensure_ascii=False))
if __name__=="__main__":main()
