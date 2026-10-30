import "server-only";

export type PublishedMicroplace={
 id:string;name_el:string;name_en:string|null;region_el:string|null;
 latitude:number;longitude:number;kind:string|null;hook_el:string|null;
 access_el:string|null;source_url:string|null;source_label:string|null;
 seasons:string[]|null;activities:string[]|null;last_verified_at:string|null;
 verification_status:string;
};

const base=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"";
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";
function approvedSlug(s:string):boolean {return /^[a-z0-9-]{2,90}$/.test(s);}
async function queryPublished(params:Record<string,string>):Promise<PublishedMicroplace[]>{
 const host=base(),secret=key();
 if(!host||!secret)return [];
 const url=new URL("/rest/v1/greece_unseen_places_v1",host);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 url.searchParams.set("verification_status","eq.verified");
 url.searchParams.set("select","id,name_el,name_en,region_el,latitude,longitude,kind,hook_el,access_el,source_url,source_label,seasons,activities,last_verified_at,verification_status");
 const res=await fetch(url,{cache:"no-store",headers:{apikey:secret,Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(6500)});
 if(!res.ok)return [];
 const rows=await res.json() as PublishedMicroplace[];
 return rows.filter(x=>x&&approvedSlug(x.id)&&x.latitude>=34&&x.latitude<=42.5&&x.longitude>=19&&x.longitude<=30);
}
export async function getPublishedMicroplace(id:string):Promise<PublishedMicroplace|null>{
 if(!approvedSlug(id))return null;
 try{return (await queryPublished({id:`eq.${id}`,limit:"1"}))[0]??null;}catch{return null;}
}
export async function getPublishedMicroplaceSlugs():Promise<string[]>{
 try{return (await queryPublished({limit:"100"})).map(x=>x.id);}catch{return [];}
}
