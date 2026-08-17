const normalizeOrigin=(value:string)=>{try{return new URL(value.trim()).origin}catch{return""}};

function configuredOrigins(){
 const raw=[process.env.NEXT_PUBLIC_WEBFLOW_ORIGIN??"",process.env.WEBFLOW_ALLOWED_ORIGINS??""].join(",");
 return new Set(raw.split(",").map(normalizeOrigin).filter(Boolean));
}

function isLocalDevOrigin(origin:string){
 if(process.env.NODE_ENV==="production")return false;
 try{const url=new URL(origin);return url.hostname==="localhost"||url.hostname==="127.0.0.1"}catch{return false}
}

export function webflowCorsHeadersV31(request:Request,methods="GET, POST, OPTIONS"){
 const origin=request.headers.get("origin")??"",normalized=normalizeOrigin(origin),allowed=configuredOrigins();
 const headers:Record<string,string>={"vary":"Origin","access-control-allow-methods":methods,"access-control-allow-headers":"Content-Type, Accept","access-control-max-age":"86400"};
 if(normalized&&(allowed.has(normalized)||isLocalDevOrigin(normalized)))headers["access-control-allow-origin"]=normalized;
 return headers;
}

export function webflowPreflightV31(request:Request,methods="GET, POST, OPTIONS"){
 return new Response(null,{status:204,headers:webflowCorsHeadersV31(request,methods)});
}
