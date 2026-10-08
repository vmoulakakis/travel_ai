/** Explicit date constraints win over any weather or holiday suggestion. */
export type DateChoice={start:string;end:string;flexible:boolean;source:"user"|"suggested"};
const iso=/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const valid=(x:string)=>iso.test(x)&&!Number.isNaN(Date.parse(x+"T12:00:00Z"));
export function offerAlternativeDates(primary:DateChoice,candidate:DateChoice|null,sourceEvidence:boolean){
 if(!valid(primary.start)||!valid(primary.end)||primary.end<=primary.start)return{primary,alternative:null,reason:"invalid_primary_dates"} as const;
 if(!primary.flexible)return{primary,alternative:null,reason:"user_dates_fixed"} as const;
 if(!candidate||!valid(candidate.start)||!valid(candidate.end)||candidate.end<=candidate.start||!sourceEvidence)return{primary,alternative:null,reason:"no_verified_alternative"} as const;
 if(candidate.start===primary.start&&candidate.end===primary.end)return{primary,alternative:null,reason:"same_dates"} as const;
 return{primary,alternative:{...candidate,source:"suggested" as const},reason:"verified_optional_alternative"} as const;
}
