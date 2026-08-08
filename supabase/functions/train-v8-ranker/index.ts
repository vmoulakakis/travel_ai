import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const sigmoid=(x:number)=>1/(1+Math.exp(-Math.max(-20,Math.min(20,x))));
async function sha256(v:string){const data=new TextEncoder().encode(v),hash=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function vec(v:unknown){if(typeof v!=="string")return[];return v.replace(/^\[/,"").replace(/\]$/,"").split(",").map(Number).filter(Number.isFinite).slice(0,12)}
function init(){const hidden=Array.from({length:8},(_,j)=>({w:Array.from({length:12},(_,i)=>(((j+3)*(i+5)%17)-8)/80),b:0}));return{hidden,out:[.12,-.08,.10,.06,.09,-.05,.07,.11],bias:0}}
function forward(net:ReturnType<typeof init>,x:number[]){const h=net.hidden.map(n=>Math.tanh(n.b+n.w.reduce((s,w,i)=>s+w*(x[i]??0),0))),z=net.bias+net.out.reduce((s,w,i)=>s+w*h[i],0);return{h,p:sigmoid(z)}}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const secret=req.headers.get("x-match-secret")||"",sr=await fetch(`${base}/rest/v1/app_secrets?name=eq.ingest_api&select=sha256`,{headers:{apikey:key,Authorization:`Bearer ${key}`}}),secrets=await sr.json().catch(()=>[]) as Array<{sha256?:string}>;if(!secret||!secrets[0]?.sha256||await sha256(secret)!==secrets[0].sha256)return json({error:"Unauthorized"},401);
 const r=await fetch(`${base}/rest/v1/v8_match_training_examples?select=pair_features,reward,last_outcome_at&order=last_outcome_at.asc&limit=10000`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});if(!r.ok)return json({error:"Training data unavailable",detail:await r.text()},502);
 const rows=await r.json() as Array<{pair_features?:string;reward?:number}>;const data=rows.map((row,i)=>({x:vec(row.pair_features),y:Number(row.reward??0)>=.5?1:0,i})).filter(x=>x.x.length===12),positives=data.filter(x=>x.y===1).length,negatives=data.length-positives;
 if(data.length<500||positives<60||negatives<200)return json({trained:false,activated:false,reason:"insufficient_balanced_labels",samples:data.length,positives,negatives,minSamples:500,minPositives:60});
 const train=data.filter(x=>x.i%5!==0),valid=data.filter(x=>x.i%5===0),net=init(),lr=.018,l2=.00035,positiveWeight=Math.min(5,Math.max(1,negatives/Math.max(1,positives))),epochs=22;
 for(let epoch=0;epoch<epochs;epoch++)for(const row of train){const{h,p}=forward(net,row.x),weight=row.y?positiveWeight:1,err=(p-row.y)*weight,old=[...net.out];for(let j=0;j<8;j++){net.out[j]-=lr*(err*h[j]+l2*net.out[j]);const delta=(1-h[j]*h[j])*err*old[j];for(let i=0;i<12;i++)net.hidden[j].w[i]-=lr*(delta*row.x[i]+l2*net.hidden[j].w[i]);net.hidden[j].b-=lr*delta;}net.bias-=lr*err;}
 let tp=0,tn=0,fp=0,fn=0,loss=0;for(const row of valid){const p=forward(net,row.x).p,pred=p>=.5?1:0;if(row.y===1&&pred===1)tp++;else if(row.y===0&&pred===0)tn++;else if(row.y===0)fp++;else fn++;loss+=-(row.y*Math.log(Math.max(1e-6,p))+(1-row.y)*Math.log(Math.max(1e-6,1-p)));}
 const tpr=tp/Math.max(1,tp+fn),tnr=tn/Math.max(1,tn+fp),balancedAccuracy=(tpr+tnr)/2,validationLoss=loss/Math.max(1,valid.length),activated=balancedAccuracy>=.75,weights={network:net,blend_max:.15,min_samples:500,min_validation_score:.75,positive_weight:positiveWeight};
 const patch=await fetch(`${base}/rest/v1/matching_model_versions?model_version=eq.v8-destination-ranker`,{method:"PATCH",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({weights,sample_count:data.length,validation_score:balancedAccuracy,trained_at:new Date().toISOString(),active:activated})});if(!patch.ok)return json({error:"Model update failed",detail:await patch.text()},502);
 return json({trained:true,activated,samples:data.length,positives,negatives,epochs,balancedAccuracy,validationLoss,gate:.75});
});
