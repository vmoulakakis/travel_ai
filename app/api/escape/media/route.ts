import { NextResponse } from "next/server";

const text=(value:unknown)=>typeof value==="string"?value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim():"";
type Item={imageUrl:string;originalUrl:string;sourceUrl:string;title:string;description:string;license:string;attribution:string};
type CommonsPayload={query?:{pages?:Record<string,{title?:string;imageinfo?:Array<{url?:string;thumburl?:string;mime?:string;descriptionurl?:string;extmetadata?:Record<string,{value?:string}>}>}>}};

const GENERIC=new Set(["landscape","travel","tourism","coast","coastal","sunset","old","town","evening","europe","european","mountain","mountains","village","winter","night","street","dramatic","island","mediterranean","green","city","photo","photography"]);
const NON_PHOTO=/\b(map|flag|logo|coat of arms|diagram|poster|ticket|icon|painting|painted|artwork|oil on canvas|watercolou?r|drawing|engraving|illustration|manuscript|pinacoteca|museum collection|sculpture|mosaic|fresco)\b/i;
const tokens=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(/[^a-z0-9]+/).filter(token=>token.length>=4&&!GENERIC.has(token));
const normalize=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

async function searchCommons(query:string,anchors:string[]){
 const endpoint=new URL("https://commons.wikimedia.org/w/api.php");
 endpoint.search=new URLSearchParams({action:"query",format:"json",origin:"*",generator:"search",gsrsearch:query,gsrnamespace:"6",gsrlimit:"18",prop:"imageinfo",iiprop:"url|mime|extmetadata",iiurlwidth:"2000"}).toString();
 const response=await fetch(endpoint,{headers:{"user-agent":"TravelAI/34 cinematic-destination-media"},next:{revalidate:86400},signal:AbortSignal.timeout(6500)});
 if(!response.ok)return[] as Item[];
 const payload=await response.json() as CommonsPayload;
 return Object.values(payload.query?.pages??{}).flatMap(page=>{
  const info=page.imageinfo?.[0];
  if(!info||!info.url||String(info.mime||"").toLowerCase()!=="image/jpeg")return[];
  const meta=info.extmetadata??{},license=text(meta.LicenseShortName?.value),artist=text(meta.Artist?.value),credit=text(meta.Credit?.value),description=text(meta.ImageDescription?.value||meta.ObjectName?.value),categories=text(meta.Categories?.value);
  const title=(page.title||"").replace(/^File:/,"");
  const searchable=normalize(`${title} ${description} ${categories}`);
  if(NON_PHOTO.test(searchable))return[];
  if(anchors.length&&!anchors.some(anchor=>searchable.includes(anchor)))return[];
  return[{imageUrl:info.thumburl||info.url,originalUrl:info.url,sourceUrl:info.descriptionurl||info.url,title,description,license:license||"Wikimedia Commons",attribution:artist||credit||"Wikimedia Commons"}];
 });
}

export async function GET(request:Request){
 const url=new URL(request.url),destination=(url.searchParams.get("destination")||"").trim().slice(0,100);
 if(destination.length<2)return NextResponse.json({ok:false,error:"destination_required"},{status:400});
 try{
  const anchors=tokens(destination);
  const primary=anchors.length?anchors.slice(0,3).join(" "):destination;
  const queries=[`${primary} travel photography`,`${primary} landscape photography`,`${destination} tourism photo`];
  const collected:Item[]=[];const seen=new Set<string>();
  for(const query of queries){
   const rows=await searchCommons(query,anchors).catch(()=>[]);
   for(const row of rows){if(seen.has(row.originalUrl))continue;seen.add(row.originalUrl);collected.push(row);if(collected.length>=6)break}
   if(collected.length>=6)break;
  }
  return NextResponse.json({ok:true,destination,items:collected.slice(0,6)},{headers:{"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}});
 }catch{return NextResponse.json({ok:true,destination,items:[]},{headers:{"Cache-Control":"public, s-maxage=1800"}})}
}
