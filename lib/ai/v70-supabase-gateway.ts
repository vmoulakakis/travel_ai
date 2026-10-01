export type V70GatewayPayload=Record<string,unknown>;

const baseUrl=()=>process.env.SUPABASE_V70_BACKEND_URL??`${(process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co").replace(/\/$/,"")}/functions/v1/travel-v70-backend`;
const appSecret=()=>process.env.SUPABASE_INGEST_SECRET??"";

export async function callV70Backend<T>(action:string,payload:V70GatewayPayload={},timeoutMs=7000):Promise<T>{
 const secret=appSecret();
 if(!secret)throw new Error("SUPABASE_INGEST_SECRET is required for V70 backend gateway");
 const response=await fetch(baseUrl(),{
  method:"POST",
  headers:{"content-type":"application/json","x-ingest-secret":secret},
  body:JSON.stringify({action,payload}),
  cache:"no-store",
  signal:AbortSignal.timeout(timeoutMs)
 });
 if(!response.ok){const text=await response.text().catch(()=>"");throw new Error(`V70 backend gateway ${response.status}: ${text.slice(0,500)}`)}
 return await response.json() as T;
}

export function v70GatewayConfigured(){return Boolean(appSecret())}
export function v70GatewayUrl(){return baseUrl()}
