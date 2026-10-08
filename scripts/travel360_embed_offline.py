#!/usr/bin/env python3
"""Offline TravelAI 360 embedding preparation. Never runs in production or writes directly to Supabase.
Reads a provenance-tagged corpus JSONL, encodes EL/EN passages locally, writes JSONL for reviewed import.
Prerequisites: pip install sentence-transformers==5.1.2; models must be downloaded/reviewed separately.
Usage: python scripts/travel360_embed_offline.py --input corpus.jsonl --output embeddings.jsonl
"""
import argparse, hashlib, json, pathlib, sys
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True);p.add_argument("--output",required=True)
    p.add_argument("--model",default="intfloat/multilingual-e5-small")
    p.add_argument("--limit",type=int,default=2000)
    p.add_argument("--local-files-only",action="store_true",default=False)
    args=p.parse_args()
    if args.limit<1 or args.limit>20000: raise ValueError("limit must be 1..20000")
    inp=pathlib.Path(args.input).resolve();out=pathlib.Path(args.output).resolve()
    if inp==out: raise ValueError("input and output must differ")
    rows=[]; seen=set()
    for idx,line in enumerate(inp.read_text(encoding="utf8").splitlines()):
        if not line.strip():continue
        item=json.loads(line)
        cid=str(item["id"]);content=str(item["content"]).strip()
        if cid in seen:raise ValueError(f"duplicate corpus id: {cid}")
        if not content or len(content)>8000:raise ValueError(f"invalid text for {cid}")
        if item.get("language") not in ("el","en"):raise ValueError(f"unsupported language: {cid}")
        if not item.get("source_refs"):raise ValueError(f"missing source provenance: {cid}")
        seen.add(cid);rows.append((cid,content,item["language"]))
        if len(rows)>args.limit:raise ValueError("limit exceeded")
    if not rows:raise ValueError("empty corpus")
    from sentence_transformers import SentenceTransformer
    model=SentenceTransformer(args.model,local_files_only=args.local_files_only)
    vectors=model.encode(["passage: "+text for _,text,_ in rows],batch_size=16,show_progress_bar=False,normalize_embeddings=True)
    if vectors.shape[1]!=384:raise ValueError(f"dimension mismatch: {vectors.shape[1]} != 384")
    with out.open("w",encoding="utf8") as fh:
        for (cid,txt,lang),vec in zip(rows,vectors):
            fh.write(json.dumps({"corpus_id":cid,"language":lang,"model_id":args.model,"input_hash":hashlib.sha256(txt.encode("utf8")).hexdigest(),"embedding":vec.tolist(),"qa_status":"shadow"},ensure_ascii=False)+"\n")
    print(json.dumps({"encoded":len(rows),"dimensions":int(vectors.shape[1]),"destination":str(out),"activation":"shadow-only"}))
if __name__=="__main__":main()
