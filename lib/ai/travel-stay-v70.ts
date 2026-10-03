import {asRecordArray,asString,asStringArray,qualitativeConfidence,runAgentJsonV70} from "@/lib/ai/agentic-model-v70";
import {appendFunnelTurnV70,loadAgentProfilesV70,loadDestinationBundleV70,updateFunnelSessionV70,type FunnelSessionV70,type JsonRecord} from "@/lib/ai/travel-intelligence-v70";
import {loadStayInventoryV70,publicStayV70,type StayInventoryV70} from "@/lib/ai/stay-commerce-v70";

export type StayChoiceV70={sourceProductId:string;placeId:string;propertyName:string;whyThisStay:string;locationLogic:string;tradeoff:string;confidence:"low"|"medium"|"high";evidenceRefs:string[]};
export type StayCurationV70={version:70;sessionId:string;destination:{key:string;slug:string;name:string};choices:Array<StayChoiceV70&{stay:ReturnType<typeof publicStayV70>}>;message:string;model:string};

function top3Keys(session:FunnelSessionV70){return(Array.isArray(session.top3)?session.top3:[]).map(x=>x&&typeof x==="object"&&"key" in x?String((x as JsonRecord).key):"").filter(Boolean)}
function validate(value:JsonRecord):{message:string;choices:StayChoiceV70[]}|null{
 const rows=asRecordArray(value.choices,5).map(x=>({sourceProductId:asString(x.sourceProductId,180),placeId:asString(x.placeId,180),propertyName:asString(x.propertyName,220),whyThisStay:asString(x.whyThisStay,700),locationLogic:asString(x.locationLogic,600),tradeoff:asString(x.tradeoff,500),confidence:qualitativeConfidence(x.confidence),evidenceRefs:asStringArray(x.evidenceRefs,20)}));
 if(rows.length<3||rows.some(x=>!x.sourceProductId||!x.placeId||!x.propertyName||!x.whyThisStay))return null;
 return{message:asString(value.message,1000),choices:rows.slice(0,3)};
}
function safeInventoryForPrompt(rows:StayInventoryV70[]){return rows.slice(0,100).map(x=>({sourceProductId:x.source_product_id,placeId:x.place_id,propertyName:x.property_name,locationLabel:x.location_label,description:x.description?.slice(0,700)??null,imageUrl:x.image_url,availability:x.in_stock===false?"unavailable":x.availability??"provider-confirm",validFrom:x.valid_from,validTo:x.valid_to,price:x.price,currency:x.currency,latitude:x.latitude,longitude:x.longitude,semanticText:x.semantic_text?.slice(0,800)??null,semanticTags:x.semantic_tags,travelerFit:x.traveler_fit,evidenceScore:x.evidence_score,observedAt:x.observed_at}))}

export async function curateStaysV70(input:{session:FunnelSessionV70;destinationKey:string}):Promise<StayCurationV70>{
 if(sessionTop3NotReady(input.session))throw new Error("V70 session is not ready for stay selection");
 if(!top3Keys(input.session).includes(input.destinationKey))throw new Error("Selected destination is not one of the session Top 3");
 const [profiles,bundle]=await Promise.all([loadAgentProfilesV70(),loadDestinationBundleV70([input.destinationKey],input.session.locale,12,100)]),destination=bundle.destinations[0] as JsonRecord|undefined;
 if(!destination)throw new Error("Selected destination could not be resolved");
 const slug=asString(destination.canonicalSlug,160),name=asString(destination.name,220);
 if(!slug||!name)throw new Error("Selected destination lacks canonical identity");
 const inventory=await loadStayInventoryV70(slug,120);
 if(inventory.length<3)throw new Error("Not enough truthful stay inventory for contextual curation");
 const agent=profiles.get("stay-curator");if(!agent)throw new Error("Missing stay-curator profile");
 const prompt=`TRAVELLER CONTEXT:\n${JSON.stringify(input.session.current_context)}\nSELECTED DESTINATION:\n${JSON.stringify(destination)}\nDESTINATION KNOWLEDGE:\n${JSON.stringify({entities:bundle.entities.slice(0,90),facts:bundle.facts.slice(0,150),edges:bundle.edges.slice(0,180)})}\nTRUTHFUL STAY INVENTORY (tracking URLs and commission intentionally withheld from reasoning):\n${JSON.stringify(safeInventoryForPrompt(inventory))}\n\nCurate exactly three stays that create the strongest complete trip for this traveller and selected destination. Reason about location within the intended experience, companions, psychology, mobility, practical access, atmosphere, dates, stay evidence and itinerary anchor. Do not use a fixed score or commission. Do not invent availability/amenities. Return JSON: message, choices[] exactly 3; each choice has sourceProductId,placeId,propertyName,whyThisStay,locationLogic,tradeoff,confidence(low|medium|high),evidenceRefs[].`;
 const run=await runAgentJsonV70({profile:agent,prompt,validate,maxOutputTokens:1300});
 const byProduct=new Map(inventory.map(x=>[x.source_product_id,x])),byPlace=new Map(inventory.map(x=>[x.place_id,x]));
 const choices=run.value.choices.map(choice=>{const stay=byProduct.get(choice.sourceProductId);if(!stay||stay.place_id!==choice.placeId)throw new Error(`Stay curator returned inventory mismatch: ${choice.sourceProductId}`);return{...choice,stay:publicStayV70(stay,input.session.locale)}});
 if(new Set(choices.map(x=>x.placeId)).size!==choices.length){
  // Multiple provider offers for the same physical stay are not useful as three user choices.
  const dedup=[...new Map(choices.map(x=>[x.placeId,x])).values()];
  if(dedup.length<3)throw new Error("Stay curator returned duplicate physical properties");
 }
 await updateFunnelSessionV70(input.session.id,{status:"selected",chosen_destination_key:input.destinationKey,chosen_stay_id:null,model_trace:{...input.session.model_trace,stayCuratorModel:run.modelLabel,stayInventorySeen:inventory.length}});
 await appendFunnelTurnV70({sessionId:input.session.id,role:"system_event",content:`Destination selected: ${name}`,stage:"selected",structuredExtract:{destinationKey:input.destinationKey,destinationSlug:slug,stayChoices:choices.map(x=>({sourceProductId:x.sourceProductId,placeId:x.placeId,propertyName:x.propertyName}))},evidenceRefs:choices.flatMap(x=>x.evidenceRefs)});
 return{version:70,sessionId:input.session.id,destination:{key:input.destinationKey,slug,name},choices,message:run.value.message||(input.session.locale==="en"?"These stays support the trip best without letting affiliate economics influence the choice.":"Αυτά τα καταλύματα στηρίζουν καλύτερα το ταξίδι χωρίς να επηρεάζει την επιλογή η affiliate οικονομία."),model:run.modelLabel};
}

function sessionTop3NotReady(session:FunnelSessionV70){return session.status!=="ready_top3"&&!top3Keys(session).length}
