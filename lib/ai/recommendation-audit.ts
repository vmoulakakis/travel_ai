export type RecommendationAuditRecord={
  sessionId:string;
  status:"success"|"no-result"|"error";
  stage?:string;
  timingsMs?:Record<string,number>;
  intentSource?:string;
  hardConstraint?:string|null;
  stayRequirements?:Record<string,unknown>;
  llmBudget?:Record<string,unknown>;
  catalogSize?:number;
  preCandidates?:string[];
  researchScout?:Record<string,unknown>;
  verifier?:Record<string,unknown>;
  auditor?:Record<string,unknown>;
  council?:Record<string,unknown>;
  finalSlugs?:string[];
  errorType?:string;
};

function safeRecord(record:RecommendationAuditRecord){
 return{
  event:"travel_recommendation_audit",
  at:new Date().toISOString(),
  ...record,
  // Deliberately excludes raw free text, prompts, secrets, credentials and generated reasoning.
  // llmBudget contains counts/ceilings only — never request or response content.
 };
}

export function writeRecommendationAudit(record:RecommendationAuditRecord){
 try{console.info("[travel-audit]",JSON.stringify(safeRecord(record)))}catch{console.info("[travel-audit]",record.sessionId,record.status)}
}

export function writeRecommendationAuditError(sessionId:string,stage:string,error:unknown,timingsMs?:Record<string,number>){
 writeRecommendationAudit({sessionId,status:"error",stage,timingsMs,errorType:error instanceof Error?error.name:"unknown"});
}
