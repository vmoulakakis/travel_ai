export interface SupabaseAdmin { upsert:(table:string,rows:unknown[],onConflict?:string)=>Promise<{ok:boolean;error?:string}> }

export function getSupabaseAdmin():SupabaseAdmin|null{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!serviceRole)return null;
  return { async upsert(table,rows,onConflict){ const endpoint=new URL(`/rest/v1/${table}`,url); if(onConflict)endpoint.searchParams.set("on_conflict",onConflict); const response=await fetch(endpoint,{method:"POST",headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows),cache:"no-store"}); if(!response.ok)return{ok:false,error:await response.text()}; return{ok:true}; } };
}
