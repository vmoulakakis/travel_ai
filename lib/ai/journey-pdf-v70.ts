import {readFile} from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {PDFDocument,type PDFFont,type PDFPage,rgb} from "pdf-lib";
import QRCode from "qrcode";
import type {JourneyRowV70} from "@/lib/ai/journey-store-v70";

type R=Record<string,unknown>;
const rec=(v:unknown):R=>v&&typeof v==="object"&&!Array.isArray(v)?v as R:{};
const arr=(v:unknown):R[]=>Array.isArray(v)?v.filter((x):x is R=>Boolean(x)&&typeof x==="object"&&!Array.isArray(x)):[];
const s=(v:unknown,max=3000)=>typeof v==="string"?v.trim().slice(0,max):"";
const A4:[number,number]=[595.28,841.89],paper=rgb(.97,.96,.92),ink=rgb(.06,.10,.09),muted=rgb(.32,.38,.35),deep=rgb(.03,.09,.075),accent=rgb(.72,.58,.32);
function wrap(text:string,font:PDFFont,size:number,width:number){const words=text.replace(/\s+/g," ").trim().split(" ").filter(Boolean),out:string[]=[];let line="";for(const word of words){const next=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(next,size)<=width)line=next;else{if(line)out.push(line);line=word}}if(line)out.push(line);return out}
function para(page:PDFPage,text:string,font:PDFFont,size:number,x:number,y:number,width:number,maxLines=36,color=ink){const lines=wrap(text,font,size,width).slice(0,maxLines);for(const[i,line]of lines.entries())page.drawText(line,{x,y:y-i*size*1.45,size,font,color});return y-lines.length*size*1.45}
function base(page:PDFPage,label:string,title:string,bold:PDFFont){page.drawRectangle({x:0,y:0,width:A4[0],height:A4[1],color:paper});page.drawRectangle({x:0,y:690,width:A4[0],height:151,color:deep});page.drawText(label.toUpperCase(),{x:42,y:804,size:7,font:bold,color:accent});wrap(title,bold,27,500).slice(0,2).forEach((line,i)=>page.drawText(line,{x:42,y:760-i*32,size:27,font:bold,color:rgb(.98,.98,.96)}))}
export async function renderJourneyPdfV70(journey:JourneyRowV70,origin:string){
 const pdf=await PDFDocument.create();
 pdf.registerFontkit(fontkit);
 const[rb,bb]=await Promise.all([readFile(path.join(process.cwd(),"public/fonts/DejaVuSans.ttf")),readFile(path.join(process.cwd(),"public/fonts/DejaVuSans-Bold.ttf"))]);
 const regular=await pdf.embedFont(rb,{subset:true}),bold=await pdf.embedFont(bb,{subset:true}),plan=rec(journey.itinerary),live=rec(journey.live_state),stay=rec(live.selectedStay),tracking=rec(live.trackingAction),code=s(tracking.code,40),trackingUrl=code?`${origin}/api/v70/track?code=${encodeURIComponent(code)}`:"";
 const cover=pdf.addPage(A4);cover.drawRectangle({x:0,y:0,width:A4[0],height:A4[1],color:deep});cover.drawText("TRAVELAI · V70 JOURNEY",{x:44,y:790,size:8,font:bold,color:accent});let y=690;y=para(cover,journey.destination_name,bold,46,44,y,500,3,rgb(.98,.98,.96))-22;y=para(cover,s(plan.headline,500)||s(plan.summary,500),regular,14,44,y,500,8,rgb(.85,.89,.86))-24;cover.drawText(s(stay.propertyName,200)||"Selected stay",{x:44,y,size:10,font:bold,color:accent});cover.drawText(`${s(journey.trip_context.startDate,20)} → ${s(journey.trip_context.endDate,20)}`,{x:44,y:y-24,size:9,font:regular,color:rgb(.72,.78,.74)});
 const days=arr(plan.days);
 for(const day of days){
  const page=pdf.addPage(A4),title=`Day ${Number(day.day)||""} · ${s(day.title,220)}`;base(page,s(day.date,20)||"PERSONAL ITINERARY",title,bold);let py=646;
  const sections:Array<[string,string]>=[["Rhythm",s(day.rhythm,600)],["Morning",s(day.morning,1200)],["Afternoon",s(day.afternoon,1200)],["Evening",s(day.evening,1200)],["Food",s(day.food,900)],["Mobility",s(day.mobility,800)],["Plan B",s(day.planB,800)]];
  for(const[label,text]of sections){if(!text)continue;page.drawText(label.toUpperCase(),{x:42,y:py,size:6.7,font:bold,color:accent});py=para(page,text,regular,8.3,42,py-14,510,8,ink)-13;if(py<130)break}
  const uncertainty=s(day.uncertainty,700);if(uncertainty){page.drawText("UNCERTAINTY",{x:42,y:118,size:6.5,font:bold,color:muted});para(page,uncertainty,regular,6.8,42,104,510,3,muted)}
 }
 const practical=pdf.addPage(A4);base(practical,"360° PRACTICAL LAYER","Before you go",bold);let py=646;py=para(practical,s(plan.stayLogic,1400),regular,9,42,py,510,10,ink)-20;py=para(practical,s(plan.routeLogic,1400),regular,9,42,py,510,10,ink)-20;const booking=Array.isArray(plan.bookingSequence)?plan.bookingSequence:[];if(booking.length){practical.drawText("BOOKING SEQUENCE",{x:42,y:py,size:7,font:bold,color:accent});py-=16;for(const item of booking.slice(0,12)){py=para(practical,`• ${s(item,500)}`,regular,7.5,46,py,500,3,ink)-7}}
 if(trackingUrl){const qrData=await QRCode.toDataURL(trackingUrl,{errorCorrectionLevel:"M",margin:1,width:280}),qr=await pdf.embedPng(Buffer.from(qrData.split(",")[1],"base64"));practical.drawImage(qr,{x:42,y:46,width:92,height:92});practical.drawText("Provider tracking link",{x:150,y:115,size:8,font:bold,color:ink});para(practical,"Final price, room and live availability are confirmed by the provider.",regular,7.2,150,97,390,4,muted)}
 return await pdf.save();
}
