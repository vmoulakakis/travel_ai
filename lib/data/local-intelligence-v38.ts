import { getTripadvisorBundleV25 } from "@/lib/data/tripadvisor-v25";

export type LocalPlaceKindV38="restaurant"|"nightlife"|"attraction"|"museum"|"beach"|"cafe";
export type LocalPlaceSourceV38="Tripadvisor"|"Google Places"|"Foursquare"|"OpenStreetMap"|"Wikivoyage";
export type GuestConfidenceV38="HIGH"|"MEDIUM"|"LOW"|"INSUFFICIENT";
export interface GuestSignalV38{sampleSize:number;avgRating:number|null;recommendRate:number|null;aiScore:number|null;confidence:GuestConfidenceV38;}
export interface LocalPlaceV38{
 id:string;name:string;kind:LocalPlaceKindV38;source:LocalPlaceSourceV38;rating:number|null;ratingCount:number|null;ranking:number|null;address:string|null;url:string|null;imageUrl:string|null;latitude:number|null;longitude:number|null;distanceKm:number|null;internalSignal:GuestSignalV38|null;
}
export interface LocalIntelligenceV38{
 status:"live"|"partial"|"fallback"|"unavailable";
 providers:string[];
 sourceDisclosure:string;
 destinationSignal:GuestSignalV38|null;
 restaurants:LocalPlaceV38[];
 nightlife:LocalPlaceV38[];
 attractions:LocalPlaceV38[];
 museums:LocalPlaceV38[];
 beaches:LocalPlaceV38[];
 cafes:LocalPlaceV38[];
}

type FirstPartyRow={subject_kind?:string;subject_key?:string;sample_size?:number|string;avg_rating?:number|string|null;recommend_rate?:number|string|null;ai_score?:number|string|null;confidence?:GuestConfidenceV38};
type GooglePlace={id?:string;displayName?:{text?:string};formattedAddress?:string;location?:{latitude?:number;longitude?:number};rating?:number;userRatingCount?:number;websiteUri?:string;googleMapsUri?:string;primaryType?:string};
type GooglePayload={places?:GooglePlace[]};
type FsqPhoto={prefix?:string;suffix?:string};
type FsqPlace={fsq_place_id?:string;name?:string;latitude?:number;longitude?:number;address?:string;locality?:string;rating?:number;website?:string;photos?:FsqPhoto[]};
type FsqPayload={results?:FsqPlace[]};
type OverpassElement={id?:number;lat?:number;lon?:number;center?:{lat?:number;lon?:number};tags?:Record<string,string>};
type OverpassPayload={elements?:OverpassElement[]};
type WikiSearchPayload={query?:{search?:Array<{title?:string}>}};
type WikiParsePayload={parse?:{title?:string;wikitext?:string}};

const clean=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
const numeric=(v:unknown)=>{if(v==null||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null};
const normalize=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9α-ω]+/gi," ").replace(/\s+/g," ").trim();
const subjectKey=(kind:string,name:string)=>`${kind}:${normalize(name).replace(/\s+/g,"-").slice(0,80)}`;
function haversine(lat1:number,lon1:number,lat2:number,lon2:number){const r=6371,p=Math.PI/180,dLat=(lat2-lat1)*p,dLon=(lon2-lon1)*p,a=Math.sin(dLat/2)**2+Math.cos(lat1*p)*Math.cos(lat2*p)*Math.sin(dLon/2)**2;return 2*r*Math.asin(Math.sqrt(a))}
function signal(row?:FirstPartyRow):GuestSignalV38|null{if(!row)return null;const sampleSize=Math.max(0,Math.round(numeric(row.sample_size)??0)),aiScore=numeric(row.ai_score);return{sampleSize,avgRating:numeric(row.avg_rating),recommendRate:numeric(row.recommend_rate),aiScore:aiScore==null?null:Math.round(aiScore),confidence:row.confidence??"INSUFFICIENT"}}
function ratingScore(p:LocalPlaceV38){if(p.rating==null)return -1;const count=Math.max(0,p.ratingCount??0),quality=p.rating/5,confidence=Math.min(1,Math.log10(count+10)/3.4);return quality*.82+confidence*.18}
function rank(rows:LocalPlaceV38[],limit=8){return[...rows].sort((a,b)=>{
 const ai=(b.internalSignal?.aiScore??-1)-(a.internalSignal?.aiScore??-1);if(Math.abs(ai)>=8)return ai;
 const rs=ratingScore(b)-ratingScore(a);if(Math.abs(rs)>.005)return rs;
 if(a.ranking!=null&&b.ranking!=null)return a.ranking-b.ranking;if(a.ranking!=null)return-1;if(b.ranking!=null)return 1;
 return(a.distanceKm??999)-(b.distanceKm??999);
 }).slice(0,limit)}
function merge(rows:LocalPlaceV38[],signals:Map<string,GuestSignalV38>){const seen=new Map<string,LocalPlaceV38>();for(const row of rows){const coordMatch=row.latitude!=null&&row.longitude!=null?[...seen.entries()].find(([,x])=>x.kind===row.kind&&x.latitude!=null&&x.longitude!=null&&haversine(row.latitude as number,row.longitude as number,x.latitude as number,x.longitude as number)<.08):null,key=coordMatch?.[0]??`${row.kind}:${normalize(row.name)}`,internal=signals.get(subjectKey(row.kind,row.name))??null,next={...row,internalSignal:internal};const existing=seen.get(key);if(!existing){seen.set(key,next);continue}const nextHasRating=next.rating!=null,oldHasRating=existing.rating!=null;if((nextHasRating&&!oldHasRating)||(next.ratingCount??0)>(existing.ratingCount??0))seen.set(key,{...next,imageUrl:next.imageUrl??existing.imageUrl,url:next.url??existing.url,address:next.address??existing.address});else if(!existing.imageUrl&&next.imageUrl)seen.set(key,{...existing,imageUrl:next.imageUrl})}return[...seen.values()]}

async function loadGuestSignals(destinationSlug:string){const base=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!base||!key)return{map:new Map<string,GuestSignalV38>(),destination:null as GuestSignalV38|null};try{const response=await fetch(`${base.replace(/\/$/,"")}/rest/v1/rpc/get_ai_guest_signals_v38`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_destination_slug:destinationSlug}),cache:"no-store",signal:AbortSignal.timeout(4500)});if(!response.ok)return{map:new Map<string,GuestSignalV38>(),destination:null};const data=await response.json() as FirstPartyRow[],map=new Map<string,GuestSignalV38>();let destination:GuestSignalV38|null=null;for(const row of data){const s=signal(row);if(!s)continue;if(row.subject_kind==="destination")destination=s;if(row.subject_key)map.set(row.subject_key,s)}return{map,destination}}catch{return{map:new Map<string,GuestSignalV38>(),destination:null}}}

async function googleSearch(kind:LocalPlaceKindV38,type:string,lat:number,lon:number,language:string){const key=process.env.GOOGLE_PLACES_API_KEY;if(!key)return[] as LocalPlaceV38[];try{const response=await fetch("https://places.googleapis.com/v1/places:searchNearby",{method:"POST",headers:{"content-type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.primaryType"},body:JSON.stringify({includedTypes:[type],maxResultCount:10,rankPreference:"POPULARITY",languageCode:language==="el"?"el":"en",locationRestriction:{circle:{center:{latitude:lat,longitude:lon},radius:22000}}}),next:{revalidate:21600},signal:AbortSignal.timeout(6000)});if(!response.ok)return[];const payload=await response.json() as GooglePayload;return(payload.places??[]).flatMap((p,index)=>{const name=clean(p.displayName?.text),id=clean(p.id);if(!name||!id)return[];const plat=numeric(p.location?.latitude),plon=numeric(p.location?.longitude);return[{id:`google:${id}`,name,kind,source:"Google Places" as const,rating:numeric(p.rating),ratingCount:numeric(p.userRatingCount),ranking:index+1,address:clean(p.formattedAddress),url:clean(p.googleMapsUri)??clean(p.websiteUri),imageUrl:null,latitude:plat,longitude:plon,distanceKm:plat!=null&&plon!=null?haversine(lat,lon,plat,plon):null,internalSignal:null}]})}catch{return[]}}

async function foursquareSearch(kind:LocalPlaceKindV38,query:string,lat:number,lon:number){const key=process.env.FOURSQUARE_API_KEY;if(!key)return[] as LocalPlaceV38[];try{const url=new URL("https://places-api.foursquare.com/places/search");url.searchParams.set("ll",`${lat},${lon}`);url.searchParams.set("radius","22000");url.searchParams.set("query",query);url.searchParams.set("sort","RATING");url.searchParams.set("limit","10");url.searchParams.set("fields","fsq_place_id,name,latitude,longitude,address,locality,rating,website,photos");const response=await fetch(url,{headers:{Authorization:`Bearer ${key}`,"X-Places-Api-Version":"2025-06-17",accept:"application/json"},next:{revalidate:21600},signal:AbortSignal.timeout(6000)});if(!response.ok)return[];const payload=await response.json() as FsqPayload;return(payload.results??[]).flatMap((p,index)=>{const name=clean(p.name),id=clean(p.fsq_place_id);if(!name||!id)return[];const plat=numeric(p.latitude),plon=numeric(p.longitude),photo=p.photos?.[0],imageUrl=photo?.prefix&&photo.suffix?`${photo.prefix}original${photo.suffix}`:null;return[{id:`fsq:${id}`,name,kind,source:"Foursquare" as const,rating:p.rating!=null?Math.max(0,Math.min(5,p.rating/2)):null,ratingCount:null,ranking:index+1,address:[clean(p.address),clean(p.locality)].filter(Boolean).join(", ")||null,url:clean(p.website),imageUrl,latitude:plat,longitude:plon,distanceKm:plat!=null&&plon!=null?haversine(lat,lon,plat,plon):null,internalSignal:null}]})}catch{return[]}}

async function osmFallback(lat:number,lon:number){
 const q=`[out:json][timeout:7];(nwr(around:18000,${lat},${lon})[amenity~"restaurant|cafe|bar|pub|nightclub|biergarten"];nwr(around:18000,${lat},${lon})[tourism~"attraction|museum|gallery|viewpoint"];nwr(around:18000,${lat},${lon})[historic];nwr(around:18000,${lat},${lon})[natural="beach"];);out center tags qt 120;`;
 const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
 for(const endpoint of endpoints){
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","accept":"application/json","user-agent":"TravelAI/61 local-intelligence"},body:new URLSearchParams({data:q}),next:{revalidate:43200},signal:AbortSignal.timeout(6500)});
   if(!response.ok)continue;
   const payload=await response.json() as OverpassPayload;
   const rows=(payload.elements??[]).flatMap((e,index)=>{
    const tags=e.tags??{},name=clean(tags.name)||clean(tags["name:en"])||clean(tags["name:el"]);if(!name)return[];
    const raw=tags.amenity??tags.tourism??(tags.natural==="beach"?"beach":tags.historic?"historic":"");
    const kind:LocalPlaceKindV38=raw==="restaurant"?"restaurant":raw==="cafe"?"cafe":["bar","pub","nightclub","biergarten"].includes(raw)?"nightlife":["museum","gallery"].includes(raw)?"museum":raw==="beach"?"beach":"attraction";
    const plat=numeric(e.lat??e.center?.lat),plon=numeric(e.lon??e.center?.lon);
    return[{id:`osm:${e.id??index}`,name,kind,source:"OpenStreetMap" as const,rating:null,ratingCount:null,ranking:null,address:[tags["addr:street"],tags["addr:housenumber"],tags["addr:city"]].filter(Boolean).join(" ")||null,url:clean(tags.website)??clean(tags["contact:website"]),imageUrl:null,latitude:plat,longitude:plon,distanceKm:plat!=null&&plon!=null?haversine(lat,lon,plat,plon):null,internalSignal:null}];
   });
   if(rows.length)return rows;
  }catch{}
 }
 return[] as LocalPlaceV38[];
}

const wikiClean=(v:string)=>v.replace(/<!--[^]*?-->/g," ").replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g,"$2").replace(/\[\[([^\]]+)\]\]/g,"$1").replace(/<[^>]+>/g," ").replace(/'{2,}/g,"").replace(/\{\{[^{}]*\}\}/g," ").replace(/\s+/g," ").trim();
function localityHint(hotelName?:string|null){
 const head=(hotelName??"").split("✦")[0]?.trim()??"";
 const pieces=head.split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
 return pieces.length>1?pieces[pieces.length-1]:null;
}
async function wikiSearchTitle(host:string,query:string){
 try{
  const url=new URL(`https://${host}/w/api.php`);
  url.search=new URLSearchParams({action:"query",list:"search",srsearch:query,srlimit:"1",format:"json",formatversion:"2",origin:"*"}).toString();
  const response=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(3500)});
  if(!response.ok)return null;
  const payload=await response.json() as WikiSearchPayload;
  return clean(payload.query?.search?.[0]?.title);
 }catch{return null}
}
async function wikiWikitext(host:string,title:string){
 try{
  const url=new URL(`https://${host}/w/api.php`);
  url.search=new URLSearchParams({action:"parse",page:title,prop:"wikitext",format:"json",formatversion:"2",origin:"*"}).toString();
  const response=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(4500)});
  if(!response.ok)return null;
  const payload=await response.json() as WikiParsePayload;
  const text=clean(payload.parse?.wikitext);
  return text?{title:clean(payload.parse?.title)??title,text}:null;
 }catch{return null}
}
function wikiListingBlocks(text:string){
 const starts=/\{\{\s*(see|do|eat|drink|listing)\b/gi,out:Array<{type:string;body:string}>=[];let m:RegExpExecArray|null;
 while((m=starts.exec(text))&&out.length<100){
  let depth=0,end=-1;
  for(let i=m.index;i<text.length-1;i+=1){
   const pair=text.slice(i,i+2);
   if(pair==="{{"){depth+=1;i+=1;continue}
   if(pair==="}}"){depth-=1;i+=1;if(depth===0){end=i+1;break}}
  }
  if(end>m.index){out.push({type:m[1].toLowerCase(),body:text.slice(m.index,end+1)});starts.lastIndex=end+1}
 }
 return out;
}
function wikiParam(body:string,key:string){
 const match=new RegExp(`\\|\\s*${key}\\s*=\\s*([^|\\n}]+)`,"i").exec(body);
 return match?wikiClean(match[1]):"";
}
async function wikivoyageFallback(destinationName:string,hotelName:string|null|undefined,lat:number,lon:number,language:string){
 const hosts=[language==="el"?"el.wikivoyage.org":"en.wikivoyage.org","en.wikivoyage.org"].filter((x,i,a)=>a.indexOf(x)===i);
 const queries=[localityHint(hotelName),destinationName].filter((x):x is string=>Boolean(x&&x.length>=2)).filter((x,i,a)=>a.indexOf(x)===i);
 const searched=await Promise.all(hosts.flatMap(host=>queries.map(async query=>({host,title:await wikiSearchTitle(host,query)}))));
 const pages=[...new Map(searched.filter((x):x is {host:string;title:string}=>Boolean(x.title)).map(x=>[`${x.host}:${x.title}`,x])).values()].slice(0,4);
 const parsed=await Promise.all(pages.map(async page=>({host:page.host,page:await wikiWikitext(page.host,page.title)})));
 const rows:LocalPlaceV38[]=[];
 for(const entry of parsed){
  if(!entry.page)continue;
  const pageUrl=`https://${entry.host}/wiki/${encodeURIComponent(entry.page.title.replace(/ /g,"_"))}`;
  for(const [index,listing] of wikiListingBlocks(entry.page.text).entries()){
   const name=wikiParam(listing.body,"name")||wikiParam(listing.body,"alt");if(!name||name.length<2)continue;
   const plat=numeric(wikiParam(listing.body,"lat")),plon=numeric(wikiParam(listing.body,"long")||wikiParam(listing.body,"lon"));
   const listingType=listing.type==="listing"?(wikiParam(listing.body,"type").toLowerCase()||"see"):listing.type;
   const kind:LocalPlaceKindV38=listingType==="eat"?"restaurant":listingType==="drink"?"nightlife":"attraction";
   if(kind==="attraction"&&/school|university|faculty|campus|σχολ|πανεπιστημ/.test(normalize(name)))continue;
   const explicitUrl=wikiParam(listing.body,"url"),url=/^https?:\/\//i.test(explicitUrl)?explicitUrl:pageUrl,sourceRank=listingType==="see"?index+1:listingType==="do"?100+index:index+1;
   rows.push({id:`wikivoyage:${entry.host}:${entry.page.title}:${listing.type}:${index}`,name,kind,source:"Wikivoyage",rating:null,ratingCount:null,ranking:sourceRank,address:wikiParam(listing.body,"address")||null,url,imageUrl:null,latitude:plat,longitude:plon,distanceKm:plat!=null&&plon!=null?haversine(lat,lon,plat,plon):null,internalSignal:null});
  }
 }
 return rows;
}

export async function getLocalIntelligenceV38(args:{destinationSlug:string;destinationName:string;hotelName?:string|null;latitude:number;longitude:number;isSummer:boolean;language:"el"|"en"}):Promise<LocalIntelligenceV38>{
 const providers:string[]=[],rows:LocalPlaceV38[]=[];
 const [tripadvisor,guest,googleRestaurant,googleBar,googleAttraction,googleMuseum,googleBeach,fsRestaurant,fsNight,fsAttraction]=await Promise.all([
  getTripadvisorBundleV25({destinationName:args.destinationName,hotelName:args.hotelName??null,latitude:args.latitude,longitude:args.longitude,isSummer:args.isSummer,language:args.language}),
  loadGuestSignals(args.destinationSlug),
  googleSearch("restaurant","restaurant",args.latitude,args.longitude,args.language),
  googleSearch("nightlife","bar",args.latitude,args.longitude,args.language),
  googleSearch("attraction","tourist_attraction",args.latitude,args.longitude,args.language),
  googleSearch("museum","museum",args.latitude,args.longitude,args.language),
  args.isSummer?googleSearch("beach","beach",args.latitude,args.longitude,args.language):Promise.resolve([]),
  foursquareSearch("restaurant","restaurant",args.latitude,args.longitude),
  foursquareSearch("nightlife","bar nightlife",args.latitude,args.longitude),
  foursquareSearch("attraction","attraction museum landmark",args.latitude,args.longitude),
 ]);
 if(tripadvisor.status==="live"){providers.push("Tripadvisor");const add=(kind:LocalPlaceKindV38,items:typeof tripadvisor.places)=>{for(const p of items)rows.push({id:`ta:${p.locationId}`,name:p.name,kind,source:"Tripadvisor",rating:p.rating,ratingCount:p.reviewCount,ranking:p.ranking,address:p.address,url:p.webUrl,imageUrl:p.imageUrl,latitude:null,longitude:null,distanceKm:null,internalSignal:null})};add("attraction",tripadvisor.places);add("museum",tripadvisor.museums);add("restaurant",tripadvisor.restaurants);add("nightlife",tripadvisor.nightlife);add("beach",tripadvisor.beaches)}
 const google=[...googleRestaurant,...googleBar,...googleAttraction,...googleMuseum,...googleBeach];if(google.length){providers.push("Google Places");rows.push(...google)}
 const fs=[...fsRestaurant,...fsNight,...fsAttraction];if(fs.length){providers.push("Foursquare");rows.push(...fs)}
 let merged=merge(rows,guest.map);
 const missingCore=()=>!merged.some(x=>x.kind==="restaurant"||x.kind==="cafe")||!merged.some(x=>x.kind==="attraction"||x.kind==="museum"||x.kind==="beach")||!merged.some(x=>x.kind==="nightlife");
 if(missingCore()){
  const[osm,wiki]=await Promise.all([osmFallback(args.latitude,args.longitude),wikivoyageFallback(args.destinationName,args.hotelName,args.latitude,args.longitude,args.language)]);
  if(osm.length){providers.push("OpenStreetMap");merged=merge([...merged,...osm],guest.map)}
  if(wiki.length){providers.push("Wikivoyage");merged=merge([...merged,...wiki],guest.map)}
 }
 const by=(kind:LocalPlaceKindV38,limit=8)=>rank(merged.filter(x=>x.kind===kind),limit),status:LocalIntelligenceV38["status"]=providers.some(x=>x==="Tripadvisor"||x==="Google Places"||x==="Foursquare")?(providers.filter(x=>x==="Tripadvisor"||x==="Google Places"||x==="Foursquare").length>=2?"live":"partial"):(providers.some(x=>x==="OpenStreetMap"||x==="Wikivoyage")?"fallback":"unavailable");
 return{status,providers:[...new Set(providers)],sourceDisclosure:"Ratings are shown only when returned by the named rating provider. OpenStreetMap and Wikivoyage are used as public-source POI fallbacks when licensed rating providers return no local data; those fallback places are shown without invented ratings. AI Guest Signal is first-party feedback and remains hidden until at least 3 confirmed responses exist.",destinationSignal:guest.destination,restaurants:by("restaurant"),nightlife:by("nightlife"),attractions:by("attraction"),museums:by("museum"),beaches:by("beach"),cafes:by("cafe")};
}
