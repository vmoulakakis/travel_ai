import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="ai-aliexpress-vmdb-worker";
const REPOSITORY_ID="1377347382";
const REPOSITORY="vmoulakakis/ai_aliexpress";
const ALLOWED=new Set([
  "vmoulakakis/ai_aliexpress/.github/workflows/deep-aliexpress-shortlist.yml@refs/heads/main",
  "vmoulakakis/ai_aliexpress/.github/workflows/deep-marketplace-research.yml@refs/heads/main"
]);
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

async function authorize(req:Request){
  const h=req.headers.get("authorization")||"";
  if(!h.startsWith("Bearer "))throw new Error("missing_bearer");
  const {payload}=await jwtVerify(h.slice(7),JWKS,{issuer:ISSUER,audience:AUDIENCE});
  if(String(payload.repository_id||"")!==REPOSITORY_ID)throw new Error("repository_id_not_allowed");
  if(String(payload.repository||"")!==REPOSITORY)throw new Error("repository_not_allowed");
  if(String(payload.ref||"")!=="refs/heads/main")throw new Error("ref_not_allowed");
  if(!ALLOWED.has(String(payload.workflow_ref||"")))throw new Error("workflow_not_allowed");
}

async function deepseek(system:string,payload:unknown,maxTokens:number){
  const key=process.env.DEEPSEEK_API_KEY;
  if(!key)return null;
  const model=process.env.DEEPSEEK_PRIMARY_MODEL||process.env.DEEPSEEK_COUNCIL_MODEL||process.env.DEEPSEEK_MODEL||"deepseek-v4-pro";
  const r=await fetch("https://api.deepseek.com/chat/completions",{
    method:"POST",
    headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},
    body:JSON.stringify({
      model,
      temperature:.05,
      max_tokens:maxTokens,
      response_format:{type:"json_object"},
      thinking:{type:"disabled"},
      reasoning_effort:"low",
      messages:[
        {role:"system",content:system},
        {role:"user",content:`Return one complete compact JSON object only. Input:\n${JSON.stringify(payload)}`}
      ]
    }),
    signal:AbortSignal.timeout(120000)
  });
  const raw=await r.text();
  if(!r.ok)throw new Error(`deepseek_${r.status}:${raw.slice(0,500)}`);
  const j=JSON.parse(raw),choice=j?.choices?.[0]||{},content=String(choice?.message?.content||"");
  if(!content.trim())throw new Error("deepseek_empty");
  if(String(choice.finish_reason||"")==="length")throw new Error("deepseek_truncated");
  return {provider:"deepseek",model,data:JSON.parse(content),usage:j?.usage||{}};
}

async function openai(system:string,payload:unknown,maxTokens:number){
  const key=process.env.OPENAI_API_KEY;
  if(!key)return null;
  const model=process.env.OPENAI_AGENT_MODEL||process.env.OPENAI_COUNCIL_MODEL||process.env.OPENAI_VERIFY_MODEL||"gpt-5-mini";
  const r=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},
    body:JSON.stringify({
      model,
      instructions:system,
      input:`Return one complete compact JSON object only. Input:\n${JSON.stringify(payload)}`,
      max_output_tokens:maxTokens,
      text:{format:{type:"json_object"}}
    }),
    signal:AbortSignal.timeout(120000)
  });
  const raw=await r.text();
  if(!r.ok)throw new Error(`openai_${r.status}:${raw.slice(0,500)}`);
  const j=JSON.parse(raw);
  const content=String(j.output_text||"");
  if(!content.trim())throw new Error("openai_empty");
  return {provider:"openai",model,data:JSON.parse(content),usage:j?.usage||{}};
}

export async function GET(){
  return NextResponse.json({
    ok:true,
    service:"ai-aliexpress-research-bridge",
    providers:{
      deepseek:Boolean(process.env.DEEPSEEK_API_KEY),
      openai:Boolean(process.env.OPENAI_API_KEY)
    }
  });
}

export async function POST(req:Request){
  try{
    await authorize(req);
    const body=await req.json();
    const system=String(body.system||"").slice(0,16000);
    if(!system)throw new Error("system_required");
    const payload=body.payload;
    const maxTokens=Math.min(Math.max(Number(body.max_tokens||3000),500),5000);
    const result=await deepseek(system,payload,maxTokens)||await openai(system,payload,maxTokens);
    if(!result)throw new Error("no_ai_provider_configured");
    return NextResponse.json({ok:true,...result});
  }catch(e){
    return NextResponse.json({ok:false,error:String(e instanceof Error?e.message:e)},{status:401});
  }
}
