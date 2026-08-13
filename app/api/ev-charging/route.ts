import { NextResponse } from "next/server";

export const runtime="nodejs";export const dynamic="force-dynamic";
const propertyClaim=/(electric vehicle|\bev\b|ηλεκτρικ(?:ο|ού|ων)|φορτιστ(?:ής|η)|charging (?:point|station|facility)|car charg)/i;
const radians=(value:number)=>value*Math.PI/180;
function distanceKm(aLat:number,aLon:number,bLat:number,bLon:number){const dLat=radians(bLat-aLat),dLon=radians(bLon-aLon),x=Math.sin(dLat/2)**2+Math.cos(radians(aLat))*Math.cos(radians(bLat))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}

type Element={id:number;lat?:number;lon?:number;center?:{lat?:number;lon?:number};tags?:Record<string,string>};
export async function POST(request:Request){
 try{
  const body=await request.json() as Record<string,unknown>,description=String(body.description??""),lat=body.latitude==null||body.latitude===""?Number.NaN:Number(body.latitude),lon=body.longitude==null||body.longitude===""?Number.NaN:Number(body.longitude);
  if(propertyClaim.test(description))return NextResponse.json({status:"AT_PROPERTY",source:"merchant-feed",checkedAt:new Date().toISOString()},{headers:{"cache-control":"private, max-age=3600"}});
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return NextResponse.json({status:"UNVERIFIED",source:"none"});
  const query=`[out:json][timeout:8];nwr(around:5000,${lat},${lon})["amenity"="charging_station"]["motorcar"!="no"];out center tags 20;`;
  const response=await fetch(process.env.OVERPASS_API_URL??"https://overpass-api.de/api/interpreter",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","user-agent":"travel-guru/1.0"},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw new Error(`Overpass ${response.status}`);
  const payload=await response.json() as {elements?:Element[]},stations=(payload.elements??[]).map(item=>{const stationLat=item.lat??item.center?.lat,stationLon=item.lon??item.center?.lon;if(stationLat==null||stationLon==null)return null;return{name:item.tags?.name||item.tags?.operator||"EV charging station",distanceKm:distanceKm(lat,lon,stationLat,stationLon),operator:item.tags?.operator??null,access:item.tags?.access??null,sockets:Object.keys(item.tags??{}).filter(key=>key.startsWith("socket:")&&!key.includes(":output"))}}).filter((item):item is NonNullable<typeof item>=>item!==null&&item.access!=="private"&&item.access!=="no").sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,3);
  return NextResponse.json(stations.length?{status:"NEARBY",source:"openstreetmap",checkedAt:new Date().toISOString(),nearest:stations[0],stations}:{status:"UNVERIFIED",source:"openstreetmap",checkedAt:new Date().toISOString()},{headers:{"cache-control":"private, max-age=21600"}});
 }catch{return NextResponse.json({status:"UNAVAILABLE",source:"unavailable"},{status:503,headers:{"cache-control":"no-store"}})}
}
