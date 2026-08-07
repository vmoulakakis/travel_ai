import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FEED_URL="https://affiliate.linkwi.se/feeds/1.2/CD104/programs-all/columns-product_id,model_name,product_name,description,category,brand_name,tracking_url,thumb_url,image_url,in_stock,availability,valid_from,valid_to,on_sale,currency,price,full_price,discount,city,times_bought,longitude,latitude,address,size,colour,custom,extra_images,variations/catinc-25,29,63,147,89,99,109/catex-0/proginc-0/progex-0/feed.json";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const txt=(v:unknown)=>{if(v===null||v===undefined)return null;const s=String(v).trim();return s||null};
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:null};
const bool=(v:unknown)=>v===true||v===1||v==="1"||["true","yes","y"].includes(String(v??"").toLowerCase());
const relevant=(x:Record<string,unknown>)=>/(travel|trip|luggage|suitcase|cabin|backpack|bag|adapter|charger|power bank|packing|organizer|beach|umbrella|rain|ferry|flight|airline|hotel|tour|experience|insurance|vpn|βαλίτ|ταξιδ|σακίδιο|αποσκευ|αντάπτορ)/i.test([x.product_name,x.model_name,x.description,x.category,x.brand_name].map(v=>String(v??"")).join(" "));
async function sha256(v:string){const data=new TextEncoder().encode(v);const hash=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("")}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST"&&req.method!=="GET") return json({error:"Method not allowed"},405);
  const base=Deno.env.get("SUPABASE_URL");const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!key) return json({error:"Supabase runtime credentials missing"},500);
  const auth={apikey:key,Authorization:`Bearer ${key}`};
  const provided=req.headers.get("x-ingest-secret")??"";
  const secretRes=await fetch(`${base}/rest/v1/app_secrets?name=eq.ingest_api&select=sha256&limit=1`,{headers:auth});
  const stored=secretRes.ok?(await secretRes.json())?.[0]?.sha256:null;
  if(!stored||!provided||await sha256(provided)!==stored) return json({error:"Unauthorized"},401);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);
  try{
    const source=await fetch(FEED_URL,{headers:{"user-agent":"travel-ai-ingestor/2.0"},signal:controller.signal});
    if(!source.ok) return json({error:`Feed fetch failed: ${source.status}`},502);
    const payload=await source.json();const items=Array.isArray(payload)?payload:[];
    const rows=items.filter((v:unknown)=>v&&typeof v==="object"&&relevant(v as Record<string,unknown>)).slice(0,5000).map((item:Record<string,unknown>)=>({source_product_id:String(item.product_id??item.model_name??crypto.randomUUID()),model_name:txt(item.model_name),name:String(item.product_name??item.model_name??"Unnamed travel product"),description:txt(item.description),source_category:txt(item.category),brand:txt(item.brand_name),tracking_url:txt(item.tracking_url),image_url:txt(item.image_url??item.thumb_url),in_stock:bool(item.in_stock),availability:txt(item.availability),valid_from:txt(item.valid_from),valid_to:txt(item.valid_to),on_sale:bool(item.on_sale),currency:txt(item.currency),price:num(item.price),full_price:num(item.full_price),discount:num(item.discount),demand_proxy:num(item.times_bought),size:txt(item.size),colour:txt(item.colour),variations:item.variations??null,observed_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
    if(rows.length){const upsert=await fetch(`${base}/rest/v1/product_feed_items?on_conflict=source_product_id`,{method:"POST",headers:{...auth,"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});if(!upsert.ok)return json({error:"Upsert failed",detail:await upsert.text()},500)}
    return json({version:2,fetched:items.length,relevant:rows.length,stored:rows.length,at:new Date().toISOString()});
  }catch(e){return json({error:e instanceof Error?e.message:"Ingestion failed"},500)}finally{clearTimeout(timeout)}
});
