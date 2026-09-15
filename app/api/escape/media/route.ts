import { NextResponse } from "next/server";

const text=(value:unknown)=>typeof value==="string"?value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim():"";

export async function GET(request:Request){
 const url=new URL(request.url),destination=(url.searchParams.get("destination")||"").trim().slice(0,80);
 if(destination.length<2)return NextResponse.json({ok:false,error:"destination_required"},{status:400});
 const endpoint=new URL("https://commons.wikimedia.org/w/api.php");
 endpoint.search=new URLSearchParams({action:"query",format:"json",origin:"*",generator:"search",gsrsearch:`${destination} travel landscape`,gsrnamespace:"6",gsrlimit:"8",prop:"imageinfo",iiprop:"url|mime|extmetadata",iiurlwidth:"1800"}).toString();
 try{
  const response=await fetch(endpoint,{headers:{"user-agent":"TravelAI/34 destination-media"},next:{revalidate:86400},signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw new Error("media_source_unavailable");
  const payload=await response.json() as {query?:{pages?:Record<string,{title?:string;imageinfo?:Array<{url?:string;thumburl?:string;mime?:string;descriptionurl?:string;extmetadata?:Record<string,{value?:string}>}>}>}};
  const pages=Object.values(payload.query?.pages??{});const items=pages.flatMap(page=>{const info=page.imageinfo?.[0];if(!info||!info.url||!String(info.mime||"").startsWith("image/"))return[];const meta=info.extmetadata??{},license=text(meta.LicenseShortName?.value),artist=text(meta.Artist?.value),credit=text(meta.Credit?.value),description=text(meta.ImageDescription?.value||meta.ObjectName?.value);return[{imageUrl:info.thumburl||info.url,originalUrl:info.url,sourceUrl:info.descriptionurl||info.url,title:(page.title||"").replace(/^File:/,""),description,license:license||"Wikimedia Commons",attribution:artist||credit||"Wikimedia Commons"}]});
  return NextResponse.json({ok:true,destination,items:items.slice(0,5)},{headers:{"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}});
 }catch{return NextResponse.json({ok:true,destination,items:[]},{headers:{"Cache-Control":"public, s-maxage=1800"}})}
}
