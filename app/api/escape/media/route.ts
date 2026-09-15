import { NextResponse } from "next/server";

const text=(value:unknown)=>typeof value==="string"?value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim():"";
type Item={imageUrl:string;originalUrl:string;sourceUrl:string;title:string;description:string;license:string;attribution:string};
type CommonsPayload={query?:{pages?:Record<string,{title?:string;imageinfo?:Array<{url?:string;thumburl?:string;mime?:string;descriptionurl?:string;extmetadata?:Record<string,{value?:string}>}>}>}};

async function searchCommons(query:string){
 const endpoint=new URL("https://commons.wikimedia.org/w/api.php");
 endpoint.search=new URLSearchParams({action:"query",format:"json",origin:"*",generator:"search",gsrsearch:query,gsrnamespace:"6",gsrlimit:"10",prop:"imageinfo",iiprop:"url|mime|extmetadata",iiurlwidth:"2000"}).toString();
 const response=await fetch(endpoint,{headers:{"user-agent":"TravelAI/34 cinematic-destination-media"},next:{revalidate:86400},signal:AbortSignal.timeout(6500)});
 if(!response.ok)return[] as Item[];
 const payload=await response.json() as CommonsPayload;
 return Object.values(payload.query?.pages??{}).flatMap(page=>{
  const info=page.imageinfo?.[0];if(!info||!info.url||!String(info.mime||"").startsWith("image/"))return[];
  const meta=info.extmetadata??{},license=text(meta.LicenseShortName?.value),artist=text(meta.Artist?.value),credit=text(meta.Credit?.value),description=text(meta.ImageDescription?.value||meta.ObjectName?.value);
  const title=(page.title||"").replace(/^File:/,"");
  if(/map|flag|logo|coat of arms|diagram|poster|ticket|icon/i.test(`${title} ${description}`))return[];
  return[{imageUrl:info.thumburl||info.url,originalUrl:info.url,sourceUrl:info.descriptionurl||info.url,title,description,license:license||"Wikimedia Commons",attribution:artist||credit||"Wikimedia Commons"}];
 });
}

export async function GET(request:Request){
 const url=new URL(request.url),destination=(url.searchParams.get("destination")||"").trim().slice(0,100);
 if(destination.length<2)return NextResponse.json({ok:false,error:"destination_required"},{status:400});
 try{
  const queries=[`"${destination}" landscape`,`${destination} travel`,`${destination} tourism`];
  const collected:Item[]=[];const seen=new Set<string>();
  for(const query of queries){
   const rows=await searchCommons(query).catch(()=>[]);
   for(const row of rows){if(seen.has(row.originalUrl))continue;seen.add(row.originalUrl);collected.push(row);if(collected.length>=6)break}
   if(collected.length>=6)break;
  }
  return NextResponse.json({ok:true,destination,items:collected.slice(0,6)},{headers:{"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}});
 }catch{return NextResponse.json({ok:true,destination,items:[]},{headers:{"Cache-Control":"public, s-maxage=1800"}})}
}
