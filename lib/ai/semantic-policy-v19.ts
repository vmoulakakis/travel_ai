import type { V8IntentProfile,V8SemanticIntent } from "@/lib/decision/v8-types";

function hasMeaning(semantic:V8SemanticIntent){
 return Object.values(semantic.positive).some(value=>(value??0)>.05)
  ||Object.values(semantic.negative).some(value=>(value??0)>.05)
  ||semantic.priorities.length>0
  ||Object.values(semantic.qualifiers).some(value=>value>.05);
}

export function semanticNeedsClarificationV19(intent:V8IntentProfile,freeText:string|null|undefined,hasOtherHardContext=false){
 const text=freeText?.trim()??"";if(text.length<3||hasOtherHardContext)return false;
 const semantic=intent.semantic;if(!semantic)return true;
 return semantic.confidence<.5&&!hasMeaning(semantic);
}
