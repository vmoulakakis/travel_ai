import {NextResponse} from "next/server";
import {z} from "zod";
import {interpretHiddenNeedLocally,type HiddenMood,type InterpretedNeed} from "@/lib/hidden-greece/intent";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const Body=z.object({text:z.string().trim().min(8).max(320)});
const ModelOutput=z.object({
 mood:z.enum(["nature","quiet","adventure","culture","romantic","family"]).nullable(),
 nights:z.number().int().min(1).max(7).nullable(),
 summary:z.string().min(5).max(160)
});
const responseHeaders={"cache-control":"no-store","x-content-type-options":"nosniff"};
export async function POST(request:Request){
 const parsed=Body.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({ok:false,error:"Γράψε λίγα λόγια για την απόδρασή σου (8–320 χαρακτήρες)."}, {status:400,headers:responseHeaders});
 const heuristic=interpretHiddenNeedLocally(parsed.data.text);
 if(heuristic.confidence==="high"||!process.env.HIDDEN_GREECE_INTENT_MODEL||!process.env.OPENAI_API_KEY){
   return NextResponse.json({ok:true,intent:heuristic,needsClarification:heuristic.mood===null},
   {headers:responseHeaders});
 }
 // Optional bounded AI escalation: explicit model + key configuration only.
 // Model only interprets the user's intent. It cannot generate destinations, prices or factual evidence.
 try{
   const [{generateText,Output},{openai}]=await Promise.all([import("ai"),import("@ai-sdk/openai")]);
   const result=await generateText({
     model:openai(process.env.HIDDEN_GREECE_INTENT_MODEL),
     output:Output.object({schema:ModelOutput}),
     maxOutputTokens:180,temperature:0,
     abortSignal:AbortSignal.timeout(6000),
     system:"Ερμηνεύεις μόνο το ταξιδιωτικό αίτημα, ποτέ δεν εφευρίσκεις πραγματικά στοιχεία. Μόνο μία από τις 6 επιτρεπόμενες ανάγκες και 1-7 διανυκτερεύσεις όταν ρητά προκύπτουν. Ελλιπείς πληροφορίες: null. Μην επινοείς ημερομηνίες, προορισμούς, διαθέσιμα δωμάτια, χρόνους οδήγησης ή τιμές. Ελληνική σύντομη περίληψη.",
     prompt:parsed.data.text
   });
   const output=result.output;
   const intent:InterpretedNeed={mood:(heuristic.mood??output.mood) as HiddenMood|null,
     nights:heuristic.nights??output.nights,
     summary:output.summary,confidence:"medium",mode:"model"};
   return NextResponse.json({ok:true,intent,needsClarification:intent.mood===null},{headers:responseHeaders});
 }catch{
   return NextResponse.json({ok:true,intent:heuristic,needsClarification:heuristic.mood===null},{headers:responseHeaders});
 }
}
