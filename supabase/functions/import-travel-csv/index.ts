import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
async function sha256(v:string){const d=new TextEncoder().encode(v);const h=await crypto.subtle.digest("SHA-256",d);return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function parseCsv(input:string){const rows:string[][]=[];let row:string[]=[];let cell="";let q=false;for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(q&&input[i+1]==='"'){cell+='"';i++}else q=!q}else if(c===','&&!q){row.push(cell);cell=""}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);cell="";if(row.some(x=>x.trim()!==""))rows.push(row);row=[]}else cell+=c}if(cell.length||row.length){row.push(cell);if(row.some(x=>x.trim()!==""))rows.push(row)}return rows}
const clean=(v:string|undefined)=>{const s=(v??"").trim();return s||null};
const n=(v:string|undefined)=>{const x=Number((v??"").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:null};
const b=(v:string|undefined)=>["1","true","yes","y","available","in stock"].includes((v??"").trim().toLowerCase());
function asJson(v:string|undefined,fallback:unknown={}){try{return v?JSON.parse(v):fallback}catch{return fallback}}

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"POST CSV only"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const auth={apikey:key,Authorization:`Bearer ${key}`};const provided=req.headers.get("x-ingest-secret")??"";
 const sec=await fetch(`${base}/rest/v1/app_secrets?name=eq.ingest_api&select=sha256&limit=1`,{headers:auth});const stored=sec.ok?(await sec.json())?.[0]?.sha256:null;
 if(!stored||!provided||await sha256(provided)!==stored)return json({error:"Unauthorized"},401);
 const csv=await req.text();if(!csv.trim())return json({error:"Empty CSV"},400);
 const matrix=parseCsv(csv);if(matrix.length<2)return json({error:"CSV requires header and at least one row"},400);
 const headers=matrix[0].map(x=>x.trim().toLowerCase().replace(/\s+/g,"_"));const objects=matrix.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
 const requested=(req.headers.get("x-dataset")||new URL(req.url).searchParams.get("dataset")||"auto").toLowerCase();
 const dataset=requested==="auto"?(headers.includes("product_id")?"product_feed":headers.includes("destination_id")&&headers.includes("evidence_type")?"evidence":headers.includes("country")&&headers.includes("name")?"destinations":"raw"):requested;
 const fileName=req.headers.get("x-file-name")||"upload.csv";
 const jobInsert=await fetch(`${base}/rest/v1/import_jobs`,{method:"POST",headers:{...auth,"content-type":"application/json",Prefer:"return=representation"},body:JSON.stringify({kind:dataset,file_name:fileName,source:"csv-edge-import",status:"processing",row_count:objects.length})});
 if(!jobInsert.ok)return json({error:"Could not create import job",detail:await jobInsert.text()},500);const job=(await jobInsert.json())[0];
 let accepted=0,rejected=0;const audit:any[]=[];
 if(dataset==="product_feed"){
   const normalized=objects.map((x:any,i)=>({source_product_id:String(x.product_id||x.model_name||`csv-${job.id}-${i+1}`),model_name:clean(x.model_name),name:String(x.product_name||x.name||x.model_name||"Unnamed product"),description:clean(x.description),source_category:clean(x.category),brand:clean(x.brand_name||x.brand),tracking_url:clean(x.tracking_url),image_url:clean(x.image_url||x.thumb_url),in_stock:b(x.in_stock),availability:clean(x.availability),valid_from:clean(x.valid_from),valid_to:clean(x.valid_to),on_sale:b(x.on_sale),currency:clean(x.currency),price:n(x.price),full_price:n(x.full_price),discount:n(x.discount),demand_proxy:n(x.times_bought),size:clean(x.size),colour:clean(x.colour),variations:asJson(x.variations,null),observed_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
   const up=await fetch(`${base}/rest/v1/product_feed_items?on_conflict=source_product_id`,{method:"POST",headers:{...auth,"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(normalized)});if(!up.ok)return json({error:"Product upsert failed",detail:await up.text()},500);accepted=normalized.length;audit.push(...objects.map((x:any,i)=>({import_job_id:job.id,row_number:i+2,payload:x,normalized:normalized[i],accepted:true})));
 } else if(dataset==="destinations"){
   const normalized=objects.map((x:any)=>({id:String(x.id||x.destination_id||x.name||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name:String(x.name||x.destination_name||""),country:String(x.country||""),region:clean(x.region)||"europe",ideal_nights_min:n(x.ideal_nights_min)||2,ideal_nights_max:n(x.ideal_nights_max)||5,budget_low:n(x.budget_low)||250,budget_high:n(x.budget_high)||800,season:asJson(x.season,{}),moods:asJson(x.moods,{}),traveler_fit:asJson(x.traveler_fit,{}),travel_effort:n(x.travel_effort)||60,warmth:asJson(x.warmth,{}),tags:(x.tags||"").split(/[|;]/).map((s:string)=>s.trim()).filter(Boolean),evidence_status:clean(x.evidence_status)||"seed-estimate",evidence_note:clean(x.evidence_note)||"Imported from CSV; verify before booking claims.",image_url:clean(x.image_url),enabled:true,updated_at:new Date().toISOString()})).filter((x:any)=>x.id&&x.name&&x.country);
   const up=await fetch(`${base}/rest/v1/destinations?on_conflict=id`,{method:"POST",headers:{...auth,"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(normalized)});if(!up.ok)return json({error:"Destination upsert failed",detail:await up.text()},500);accepted=normalized.length;rejected=objects.length-accepted;
 } else if(dataset==="evidence"){
   const normalized=objects.map((x:any)=>({destination_id:clean(x.destination_id),evidence_type:clean(x.evidence_type)||"general",source_name:clean(x.source_name)||"CSV import",source_url:clean(x.source_url),payload:asJson(x.payload,{}),observed_at:clean(x.observed_at)||new Date().toISOString(),valid_until:clean(x.valid_until),confidence:n(x.confidence)})).filter((x:any)=>x.destination_id);
   const ins=await fetch(`${base}/rest/v1/travel_evidence`,{method:"POST",headers:{...auth,"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(normalized)});if(!ins.ok)return json({error:"Evidence insert failed",detail:await ins.text()},500);accepted=normalized.length;rejected=objects.length-accepted;
 } else accepted=objects.length;
 if(!audit.length)audit.push(...objects.map((x:any,i)=>({import_job_id:job.id,row_number:i+2,payload:x,accepted:true})));
 if(audit.length)await fetch(`${base}/rest/v1/import_rows`,{method:"POST",headers:{...auth,"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(audit.slice(0,10000))});
 await fetch(`${base}/rest/v1/import_jobs?id=eq.${job.id}`,{method:"PATCH",headers:{...auth,"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({status:"completed",accepted_count:accepted,rejected_count:rejected,completed_at:new Date().toISOString(),diagnostics:{headers,dataset}})});
 return json({jobId:job.id,dataset,rows:objects.length,accepted,rejected});
});
