#!/usr/bin/env python3
"""Minimal-cost real TravelAI 360 relevance evaluation with OpenAI or DeepSeek.
Strict hard caps; no keys saved to repository and no Supabase mutations.
This is a small LLM judge/evaluation experiment, NOT neural network training.
Usage: TRAVELAI_LLM_PROVIDER=deepseek DEEPSEEK_API_KEY=... python scripts/travel360_llm_budget_eval.py
Requires Python stdlib only.
"""
import json,os,urllib.request,urllib.error
PROVIDERS={
 "deepseek":("DEEPSEEK_API_KEY","https://api.deepseek.com/chat/completions","deepseek-chat"),
 "openai":("OPENAI_API_KEY","https://api.openai.com/v1/chat/completions","gpt-4o-mini")
}
SCENARIOS=[
 {"query":"Οκτώβριο ζευγάρι φύση και καλό φαγητό, χωρίς να βασιστούμε σε καλοκαιρινές παραλίες",
 "candidates":[{"area":"Αμοργός","evidence":"summer_island; nature food romantic"},{"area":"Άνδρος","evidence":"shoulder_island; nature food"},{"area":"Παξοί","evidence":"shoulder_island; nature food romantic"}]},
 {"query":"Οικογένεια θέλει νησί με πολιτισμό και φύση εκτός αιχμής",
 "candidates":[{"area":"Άνδρος","evidence":"family culture nature shoulder_island"},{"area":"Νάξος","evidence":"family culture nature summer_island"},{"area":"Αμοργός","evidence":"nature culture summer_island"}]}
]
def main():
 provider=os.getenv("TRAVELAI_LLM_PROVIDER","deepseek").lower()
 if provider not in PROVIDERS:raise RuntimeError("unknown provider")
 env,url,model=PROVIDERS[provider];key=os.environ.get(env)
 if not key:raise RuntimeError(f"Missing {env}. Store in protected runtime secrets, never in source.")
 total=0;results=[]
 for s in SCENARIOS[:1]:
  prompt="Κατάταξε ΜΟΝΟ τα δοθέντα πραγματικά χαρακτηριστικά περιοχών για το ερώτημα. Απάντησε μία γραμμή: περιοχή|σύντομη αιτία|τι λείπει από τα δεδομένα. ΜΗΝ εφευρίσκεις καιρό, διαθεσιμότητα, αξιολογήσεις ή πρόσβαση.\n"+json.dumps(s,ensure_ascii=False)
  body={"model":model,"messages":[{"role":"system","content":"You are a provenance-focused Greek travel relevance evaluator. Do not invent facts."},{"role":"user","content":prompt}],"temperature":0,"max_tokens":100,"stream":False}
  req=urllib.request.Request(url,data=json.dumps(body).encode(),headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
  with urllib.request.urlopen(req,timeout=35) as rsp:data=json.load(rsp)
  usage=data.get("usage") or {};used=int(usage.get("total_tokens") or 0);total+=used
  if total>1000:raise RuntimeError("Token budget exceeded. Stop immediately.")
  answer=(data["choices"][0]["message"]["content"] or "").strip()
  results.append({"query":s["query"],"answer":answer,"total_tokens":used})
 print(json.dumps({"provider":provider,"model":model,"token_budget_max":1000,"total_tokens":total,"scenarios":results,"phase":"ranking_evaluation_not_finetuning"},ensure_ascii=False))
if __name__=="__main__":main()
