type ResearchResult={
 title:string;url:string;snippet:string;source:string;
 rating:number|null;reviewCount:number|null;imageUrl:string|null;
};
type ResearchBundle={
 query:string;results:ResearchResult[];images:Array<{url:string;title:string;sourcePage:string}>;
};

const decode=(s:string)=>s
 .replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'")
 .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ")
 .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g," ").trim();
const strip=(s:string)=>decode(s.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," "));
const safeUrl=(raw:string)=>{
 try{
  const u=new URL(raw);
  if(!/^https?:$/.test(u.protocol))return null;
  const h=u.hostname.toLowerCase();
  if(h==="localhost"||h==="127.0.0.1"||h.endsWith(".local"))return null;
  return u.toString();
 }catch{return null}
};
const host=(u:string)=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch{return""}};
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;

function parseDdg(html:string){
 const rows: Array<{title:string;url:string;snippet:string}>=[];
 const blocks=html.split(/<div[^>]+class="[^"]*result[^"]*"[^>]*>/i).slice(1);
 for(const block of blocks.slice(0,12)){
  const a=block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  if(!a)continue;
  let url=decode(a[1]);
  try{
   const u=new URL(url,"https://html.duckduckgo.com");
   const uddg=u.searchParams.get("uddg");
   if(uddg)url=uddg;
  }catch{}
  const clean=safeUrl(url);if(!clean)continue;
  const sm=block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
  rows.push({title:strip(a[2]),url:clean,snippet:sm?strip(sm[1]):""});
 }
 return rows;
}

async function ddgSearch(query:string){
 try{
  const r=await fetch("https://html.duckduckgo.com/html/?q="+encodeURIComponent(query),{
   headers:{"user-agent":"Mozilla/5.0 TravelAIResearch/1.0","accept-language":"el-GR,el;q=0.9,en;q=0.8"},
   cache:"no-store",signal:AbortSignal.timeout(9000)
  });
  if(!r.ok)return[];
  return parseDdg(await r.text());
 }catch{return[]}
}

function jsonLdObjects(html:string){
 const out:any[]=[];
 const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
 let m:RegExpExecArray|null;
 while((m=re.exec(html))){
  try{
   const x=JSON.parse(m[1].trim());
   if(Array.isArray(x))out.push(...x);
   else if(x?.["@graph"]&&Array.isArray(x["@graph"]))out.push(...x["@graph"]);
   else out.push(x);
  }catch{}
 }
 return out;
}
function extractEvidence(html:string,url:string,title:string,snippet:string):ResearchResult{
 const objs=jsonLdObjects(html);
 let rating:number|null=null,reviewCount:number|null=null;
 for(const o of objs){
  const a=o?.aggregateRating;
  const r=num(a?.ratingValue),n=num(a?.reviewCount??a?.ratingCount);
  if(r!=null&&r>0&&r<=10){rating=r>5?r/2:r;reviewCount=n==null?null:Math.max(0,Math.round(n));break}
 }
 const og=html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)
   ??html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
 return{title, url, snippet, source:host(url),rating,reviewCount,imageUrl:og?safeUrl(decode(og[1])):null};
}
async function enrich(row:{title:string;url:string;snippet:string}){
 try{
  const r=await fetch(row.url,{headers:{"user-agent":"Mozilla/5.0 TravelAIResearch/1.0","accept-language":"el-GR,el;q=0.9,en;q=0.8"},redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(7500)});
  if(!r.ok)return{...row,source:host(row.url),rating:null,reviewCount:null,imageUrl:null};
  const ct=r.headers.get("content-type")??"";if(!ct.includes("text/html"))return{...row,source:host(row.url),rating:null,reviewCount:null,imageUrl:null};
  return extractEvidence((await r.text()).slice(0,900000),row.url,row.title,row.snippet);
 }catch{return{...row,source:host(row.url),rating:null,reviewCount:null,imageUrl:null}}
}

export async function researchWeb(query:string,limit=6):Promise<ResearchResult[]>{
 const rows=await ddgSearch(query);
 const selected=rows.slice(0,Math.max(limit,6));
 const enriched=await Promise.all(selected.map(enrich));
 return enriched.filter(x=>x.title&&x.url).slice(0,limit);
}

export async function commonsImages(query:string,limit=5){
 try{
  const u=new URL("https://commons.wikimedia.org/w/api.php");
  u.searchParams.set("action","query");u.searchParams.set("generator","search");
  u.searchParams.set("gsrsearch",query);u.searchParams.set("gsrnamespace","6");u.searchParams.set("gsrlimit",String(Math.max(limit,6)));
  u.searchParams.set("prop","imageinfo");u.searchParams.set("iiprop","url|extmetadata");u.searchParams.set("iiurlwidth","1400");u.searchParams.set("format","json");u.searchParams.set("origin","*");
  const r=await fetch(u,{next:{revalidate:86400},signal:AbortSignal.timeout(8000)});if(!r.ok)return[];
  const j=await r.json() as any,pages=Object.values(j?.query?.pages??{}) as any[];
  return pages.flatMap(p=>{
   const ii=p?.imageinfo?.[0],url=safeUrl(ii?.thumburl??ii?.url??"");
   if(!url)return[];
   return[{url,title:String(p?.title??query).replace(/^File:/,""),sourcePage:`https://commons.wikimedia.org/?curid=${p.pageid}`}];
  }).slice(0,limit);
 }catch{return[]}
}

export async function researchAreaWeb(args:{hotel:string;area:string}):Promise<ResearchBundle & {
 hotel:ResearchResult[];food:ResearchResult[];drink:ResearchResult[];activities:ResearchResult[];
}>{
 const area=args.area||args.hotel;
 const [hotel,food,drink,activities,images]=await Promise.all([
  researchWeb(`"${args.hotel}" ${area} hotel reviews Tripadvisor`,6),
  researchWeb(`best restaurants ${area} reviews`,7),
  researchWeb(`best bars cafes ${area} reviews`,7),
  researchWeb(`things to do attractions ${area} Tripadvisor`,8),
  commonsImages(`${area} Greece travel`,6)
 ]);
 return{query:area,results:[...hotel,...food,...drink,...activities],images,hotel,food,drink,activities};
}
