/*
 * Keyless web research adapter for TravelAI.
 * Search transport is a small Vercel-safe TypeScript adaptation inspired by:
 * https://github.com/phukon/duckduckgo_search (MIT)
 *
 * It does not use a search API key. Results are treated as discovery evidence only;
 * downstream AI must cite/support every extracted fact from the returned source snippets/pages.
 */

export type KeylessSearchResult={
  title:string;
  url:string;
  snippet:string;
  host:string;
  query:string;
};

export type PageEvidence={
  url:string;
  title:string;
  text:string;
  jsonLd:Array<{
    name:string|null;
    rating:number|null;
    reviewCount:number|null;
    latitude:number|null;
    longitude:number|null;
    image:string|null;
  }>;
};

const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 TravelAI/1.0";

function decodeHtml(input:string){
  return input
    .replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&nbsp;/gi," ")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)||32))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)||32));
}
function stripTags(input:string){
  return decodeHtml(input.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
}
function unwrap(raw:string){
  const href=decodeHtml(raw);
  try{
    const u=new URL(href,"https://duckduckgo.com");
    const direct=u.searchParams.get("uddg");
    if(direct)return decodeURIComponent(direct);
    if(u.hostname.endsWith("duckduckgo.com")&&u.pathname.startsWith("/l/")){
      const q=u.searchParams.get("uddg");if(q)return decodeURIComponent(q);
    }
    return u.href;
  }catch{return href}
}
function allowedUrl(raw:string){
  try{
    const u=new URL(raw);
    if(!["http:","https:"].includes(u.protocol))return false;
    const h=u.hostname.toLowerCase();
    if(h==="localhost"||h.endsWith(".local")||h==="127.0.0.1"||h==="0.0.0.0"||h==="::1")return false;
    if(/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(h))return false;
    return true;
  }catch{return false}
}
function hostOf(raw:string){try{return new URL(raw).hostname.replace(/^www\./,"")}catch{return""}}

function parseHtmlResults(html:string,query:string){
  const out:KeylessSearchResult[]=[];
  const re=/<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m:RegExpExecArray|null;
  while((m=re.exec(html))&&out.length<12){
    const url=unwrap(m[1]);if(!allowedUrl(url))continue;
    const title=stripTags(m[2]);if(!title)continue;
    const tail=html.slice(re.lastIndex,re.lastIndex+2200);
    const sm=tail.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    const snippet=sm?stripTags(sm[1]):"";
    out.push({title,url,snippet,host:hostOf(url),query});
  }
  return out;
}

function parseLiteResults(html:string,query:string){
  const out:KeylessSearchResult[]=[];
  const re=/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*result-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m:RegExpExecArray|null;
  while((m=re.exec(html))&&out.length<12){
    const url=unwrap(m[1]);if(!allowedUrl(url))continue;
    const title=stripTags(m[2]);if(!title)continue;
    const tail=html.slice(re.lastIndex,re.lastIndex+1600);
    const sm=tail.match(/class=["'][^"']*result-snippet[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
    out.push({title,url,snippet:sm?stripTags(sm[1]):"",host:hostOf(url),query});
  }
  return out;
}

async function searchEndpoint(endpoint:string,query:string,parser:(html:string,q:string)=>KeylessSearchResult[]){
  const body=new URLSearchParams({q:query,kl:"gr-el",p:"1"});
  const r=await fetch(endpoint,{method:"POST",headers:{"user-agent":UA,"accept-language":"el-GR,el;q=0.9,en;q=0.8","content-type":"application/x-www-form-urlencoded"},body,cache:"no-store",signal:AbortSignal.timeout(8500)});
  if(!r.ok)throw new Error("search_"+r.status);
  return parser(await r.text(),query);
}

async function searxSearch(base:string,query:string,maxResults:number):Promise<KeylessSearchResult[]>{
  try{
    const u=new URL("/search",base);
    u.searchParams.set("q",query);
    u.searchParams.set("format","json");
    u.searchParams.set("categories","general");
    u.searchParams.set("language","all");
    u.searchParams.set("safesearch","1");
    const r=await fetch(u,{headers:{"user-agent":UA,"accept":"application/json"},cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(!r.ok)return[];
    const j=await r.json() as any,rows=Array.isArray(j?.results)?j.results:[];
    return rows.flatMap((x:any)=>{
      const url=typeof x?.url==="string"?x.url.trim():"";
      const title=typeof x?.title==="string"?stripTags(x.title):"";
      const snippet=typeof x?.content==="string"?stripTags(x.content):"";
      if(!url||!title||!allowedUrl(url))return[];
      return[{title,url,snippet,host:hostOf(url),query}];
    }).slice(0,maxResults);
  }catch{return[]}
}

export async function keylessWebSearch(query:string,maxResults=8):Promise<KeylessSearchResult[]>{
  const q=query.trim().slice(0,300);if(!q)return[];
  for(const [endpoint,parser] of [
    ["https://html.duckduckgo.com/html/",parseHtmlResults] as const,
    ["https://lite.duckduckgo.com/lite/",parseLiteResults] as const
  ]){
    try{
      const rows=await searchEndpoint(endpoint,q,parser);
      if(rows.length)return rows.slice(0,maxResults);
    }catch{}
  }
  const searxBases=[
    process.env.SEARXNG_URL?.trim(),
    "https://sciresearch1-searxng.hf.space"
  ].filter((x):x is string=>Boolean(x));
  for(const base of searxBases){
    const rows=await searxSearch(base,q,maxResults);
    if(rows.length)return rows;
  }
  return[];
}

function walkJsonLd(value:unknown,out:PageEvidence["jsonLd"]){
  if(Array.isArray(value)){for(const x of value)walkJsonLd(x,out);return}
  if(!value||typeof value!=="object")return;
  const v=value as Record<string,unknown>;
  const ratingObj=(v.aggregateRating&&typeof v.aggregateRating==="object"?v.aggregateRating:null) as Record<string,unknown>|null;
  const geo=(v.geo&&typeof v.geo==="object"?v.geo:null) as Record<string,unknown>|null;
  const num=(x:unknown)=>Number.isFinite(Number(x))?Number(x):null;
  const name=typeof v.name==="string"?v.name.trim().slice(0,180):null;
  const rating=ratingObj?num(ratingObj.ratingValue):null;
  const reviewCount=ratingObj?num(ratingObj.reviewCount??ratingObj.ratingCount):null;
  const latitude=geo?num(geo.latitude):null,longitude=geo?num(geo.longitude):null;
  const image=typeof v.image==="string"?v.image:Array.isArray(v.image)&&typeof v.image[0]==="string"?v.image[0]:null;
  if(name&&(rating!=null||latitude!=null||image))out.push({name,rating,reviewCount,latitude,longitude,image});
  for(const x of Object.values(v))if(x&&typeof x==="object")walkJsonLd(x,out);
}

export async function fetchPageEvidence(url:string):Promise<PageEvidence|null>{
  if(!allowedUrl(url))return null;
  try{
    const r=await fetch(url,{headers:{"user-agent":UA,"accept-language":"el-GR,el;q=0.9,en;q=0.8"},redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!r.ok)return null;
    const type=r.headers.get("content-type")??"";if(!type.includes("text/html"))return null;
    const html=(await r.text()).slice(0,750000);
    const title=stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??"").slice(0,220);
    const jsonLd:PageEvidence["jsonLd"]=[];
    const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m:RegExpExecArray|null,count=0;
    while((m=re.exec(html))&&count++<16){try{walkJsonLd(JSON.parse(decodeHtml(m[1])),jsonLd)}catch{}}
    const body=stripTags(html.replace(/<nav[\s\S]*?<\/nav>/gi," ").replace(/<footer[\s\S]*?<\/footer>/gi," ")).slice(0,12000);
    return{url:r.url,title,text:body,jsonLd:jsonLd.slice(0,20)};
  }catch{return null}
}

export async function researchQueries(queries:string[],perQuery=7){
  const batches=await Promise.all(queries.slice(0,8).map(q=>keylessWebSearch(q,perQuery)));
  const seen=new Set<string>(),out:KeylessSearchResult[]=[];
  for(const rows of batches)for(const row of rows){
    const k=row.url.replace(/\/$/,"");if(seen.has(k))continue;seen.add(k);out.push(row);
  }
  return out;
}

export async function enrichTopPages(results:KeylessSearchResult[],limit=8){
  const priority=[...results].sort((a,b)=>{
    const score=(x:KeylessSearchResult)=>/tripadvisor|booking|google|restaurant|hotel|official|visit|travel/i.test(x.host+" "+x.title)?1:0;
    return score(b)-score(a);
  }).slice(0,limit);
  return (await Promise.all(priority.map(x=>fetchPageEvidence(x.url)))).filter((x):x is PageEvidence=>Boolean(x));
}


export type CommonsPhoto={
  url:string;
  thumbUrl:string;
  title:string;
  credit:string|null;
  sourceUrl:string|null;
};

export async function commonsAreaPhotos(areaName:string,limit=6):Promise<CommonsPhoto[]>{
  const q=areaName.trim();if(!q)return[];
  try{
    const u=new URL("https://commons.wikimedia.org/w/api.php");
    u.searchParams.set("action","query");
    u.searchParams.set("generator","search");
    u.searchParams.set("gsrsearch",q+" Greece");
    u.searchParams.set("gsrnamespace","6");
    u.searchParams.set("gsrlimit",String(Math.max(4,Math.min(12,limit*2))));
    u.searchParams.set("prop","imageinfo");
    u.searchParams.set("iiprop","url|extmetadata");
    u.searchParams.set("iiurlwidth","1600");
    u.searchParams.set("format","json");
    u.searchParams.set("origin","*");
    const r=await fetch(u,{headers:{"user-agent":UA},cache:"no-store",signal:AbortSignal.timeout(7000)});
    if(!r.ok)return[];
    const j=await r.json() as any,pages=Object.values(j?.query?.pages??{}) as any[];
    const out:CommonsPhoto[]=[];
    for(const p of pages){
      const info=p?.imageinfo?.[0],url=typeof info?.url==="string"?info.url:"",thumb=typeof info?.thumburl==="string"?info.thumburl:"";
      if(!url||!thumb)continue;
      const meta=info?.extmetadata??{};
      const rawArtist=typeof meta?.Artist?.value==="string"?meta.Artist.value:"";
      const credit=stripTags([rawArtist,typeof meta?.LicenseShortName?.value==="string"?meta.LicenseShortName.value:""].filter(Boolean).join(" · ")).slice(0,180)||null;
      out.push({
        url,thumbUrl:thumb,
        title:String(p?.title??"").replace(/^File:/,"").slice(0,180),
        credit,
        sourceUrl:typeof info?.descriptionurl==="string"?info.descriptionurl:null
      });
      if(out.length>=limit)break;
    }
    return out;
  }catch{return[]}
}
