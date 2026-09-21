import { redirect,notFound } from "next/navigation";
import { loadV8DestinationCatalog,loadV8StayOfferById } from "@/lib/data/destination-v8";

export const dynamic="force-dynamic";
type Props={params:Promise<{offerId:string}>;searchParams?:Promise<Record<string,string|string[]|undefined>>};

const norm=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const hav=(a:number,b:number,c:number,d:number)=>{const R=6371,r=(x:number)=>x*Math.PI/180,dp=r(c-a),dl=r(d-b),h=Math.sin(dp/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(h))};

export default async function InternalStayResolver({params,searchParams}:Props){
 const[{offerId},query]=await Promise.all([params,searchParams]);
 const[offer,catalog]=await Promise.all([loadV8StayOfferById(offerId),loadV8DestinationCatalog().catch(()=>[])]);
 if(!offer)notFound();
 const blob=norm([offer.city,offer.address,offer.propertyName].filter(Boolean).join(" "));
 const textual=catalog.filter(d=>d.countryCode==="GR").map(d=>{
  const names=[d.slug,d.nameEl,d.nameEn,d.regionGroup,...d.aliases].map(norm).filter(Boolean);
  const score=names.reduce((best,n)=>Math.max(best,blob.includes(n)?n.length:0),0);
  return{d,score};
 }).sort((a,b)=>b.score-a.score)[0];
 let destination=textual?.score?textual.d:null;
 if(!destination&&offer.latitude!=null&&offer.longitude!=null){
  destination=catalog.filter(d=>d.countryCode==="GR").map(d=>({d,km:hav(offer.latitude!,offer.longitude!,d.latitude,d.longitude)})).sort((a,b)=>a.km-b.km)[0]?.d??null;
 }
 if(!destination)notFound();
 const qs=new URLSearchParams();
 for(const[k,v]of Object.entries(query??{})){if(typeof v==="string")qs.set(k,v)}
 if(!qs.get("dn"))qs.set("dn",offer.city||offer.address||destination.nameEl);
 redirect(`/escape/${encodeURIComponent(destination.slug)}/stay/${encodeURIComponent(offerId)}?${qs.toString()}`);
}
