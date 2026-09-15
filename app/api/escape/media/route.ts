import { NextResponse } from "next/server";

const text=(value:unknown)=>typeof value==="string"?value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim():"";
type Item={imageUrl:string;originalUrl:string;sourceUrl:string;title:string;description:string;license:string;attribution:string};
type Candidate=Item&{visualScore:number};
type CommonsPayload={query?:{pages?:Record<string,{title?:string;imageinfo?:Array<{url?:string;thumburl?:string;mime?:string;descriptionurl?:string;extmetadata?:Record<string,{value?:string}>}>}>}};

const GENERIC=new Set(["landscape","travel","tourism","coast","coastal","sunset","old","town","evening","europe","european","mountain","mountains","village","winter","night","street","dramatic","island","mediterranean","green","city","photo","photography","aerial","drone","panorama","panoramic","view"]);
const NON_PHOTO=/\b(map|flag|logo|coat of arms|diagram|poster|ticket|icon|painting|painted|artwork|oil on canvas|watercolou?r|drawing|engraving|illustration|manuscript|pinacoteca|museum collection|sculpture|mosaic|fresco)\b/i;
const AERIAL=/\b(aerial|drone|bird'?s[- ]?eye|birdseye|from above|panorama|panoramic|elevated view|coastline|cliff|cliffs)\b/i;
const tokens=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(/[^a-z0-9]+/).filter(token=>token.length>=4&&!GENERIC.has(token));
const normalize=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

async function searchCommons(query:string,anchors:string[],preferAerial:boolean){
 const endpoint=new URL("https://commons.wikimedia.org/w/api.php");
 endpoint.search=new URLSearchParams({action:"query",format:"json",origin:"*",generator:"search",gsrsearch:query,gsrnamespace:"6",gsrlimit:"24",prop:"imageinfo",iiprop:"url|mime|extmetadata",iiurlwidth:"2200"}).toString();
 const response=await fetch(endpoint,{headers:{"user-agent":"TravelAI/35 cinematic-aerial-destination-media"},next:{revalidate:86400},signal:AbortSignal.timeout(7000)});
 if(!response.ok)return[] as Candidate[];
 const payload=await response.json() as CommonsPayload;
 return Object.values(payload.query?.pages??{}).flatMap(page=>{
  const info=page.imageinfo?.[0];if(!info||!info.url||String(info.mime||"").toLowerCase()!=="image/jpeg")return[];
  const meta=info.extmetadata??{},license=text(meta.LicenseShortName?.value),artist=text(meta.Artist?.value),credit=text(meta.Credit?.value),description=text(meta.ImageDescription?.value||meta.ObjectName?.value),categories=text(meta.Categories?.value);
  const title=(page.title||"").replace(/^File:/,"");const searchable=normalize(`${title} ${description} ${categories}`);
  if(NON_PHOTO.test(searchable))return[];
  if(anchors.length&&!anchors.some(anchor=>searchable.includes(anchor)))return[];
  const aerial=AERIAL.test(searchable),visualScore=(preferAerial&&aerial?30:0)+(searchable.includes("landscape")?8:0)+(searchable.includes("coast")?7:0)+(searchable.includes("view")?5:0);
  return[{imageUrl:info.thumburl||info.url,originalUrl:info.url,sourceUrl:info.descriptionurl||info.url,title,description,license:license||"Wikimedia Commons",attribution:artist||credit||"Wikimedia Commons",visualScore}];
 });
}

export async function GET(request:Request){
 const url=new URL(request.url),destination=(url.searchParams.get("destination")||"").trim().slice(0,100),mode=url.searchParams.get("mode")==="aerial"?"aerial":"standard";
 if(destination.length<2)return NextResponse.json({ok:false,error:"destination_required"},{status:400});
 try{
  const anchors=tokens(destination),primary=anchors.length?anchors.slice(0,3).join(" "):destination,preferAerial=mode==="aerial";
  const queries=preferAerial?[`${primary} aerial photography`,`${primary} drone panorama`,`${primary} panoramic landscape photography`,`${primary} travel photography`]:[`${primary} travel photography`,`${primary} landscape photography`,`${destination} tourism photo`];
  const collected:Candidate[]=[];const seen=new Set<string>();
  for(const query of queries){const rows=await searchCommons(query,anchors,preferAerial).catch(()=>[]);for(const row of rows){if(seen.has(row.originalUrl))continue;seen.add(row.originalUrl);collected.push(row)}if(collected.length>=12)break;}
  const items=collected.sort((a,b)=>b.visualScore-a.visualScore).slice(0,6).map(({visualScore:_,...item})=>item);
  return NextResponse.json({ok:true,destination,mode,items},{headers:{"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}});
 }catch{return NextResponse.json({ok:true,destination,mode,items:[]},{headers:{"Cache-Control":"public, s-maxage=1800"}})}
}
