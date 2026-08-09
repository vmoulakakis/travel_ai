import { loadV8DestinationCatalog, loadV8StayOffers } from "@/lib/data/destination-v8";

export interface WeeklyPick {
  slug:string;
  destination:string;
  destinationEn:string;
  startDate:string;
  endDate:string;
  nights:number;
  reasonEl:string;
  reasonEn:string;
  riskEl:string;
  riskEn:string;
  tags:string[];
}

const iso=(date:Date)=>date.toISOString().slice(0,10);
function nextFriday(now:Date){const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));const delta=(5-date.getUTCDay()+7)%7||7;date.setUTCDate(date.getUTCDate()+delta);return date}
function weekNumber(date:Date){const start=new Date(Date.UTC(date.getUTCFullYear(),0,1));return Math.floor((date.getTime()-start.getTime())/604800000)}

export async function getWeeklyPick(now=new Date()):Promise<WeeklyPick|null>{
  try{
    const start=nextFriday(now),end=new Date(start);end.setUTCDate(end.getUTCDate()+4);const startDate=iso(start),endDate=iso(end),month=start.getUTCMonth();
    const catalog=(await loadV8DestinationCatalog()).filter(item=>item.countryCode==="GR");
    const ranked=catalog.sort((a,b)=>(b.monthFit[month]??0)-(a.monthFit[month]??0)||a.crowdLevel-b.crowdLevel||b.routeConfidence-a.routeConfidence);
    const top=ranked.slice(0,Math.min(8,ranked.length)),offset=weekNumber(start)%Math.max(1,top.length);
    for(let attempt=0;attempt<Math.min(3,top.length);attempt+=1){
      const destination=top[(offset+attempt)%top.length],offers=await loadV8StayOffers(destination.slug,startDate,endDate,1);
      if(!offers.length)continue;
      const feelings=destination.tags.includes("beach")?"θάλασσα και ανοιχτό ορίζοντα":destination.tags.includes("nature")?"φύση και καθαρότερο ρυθμό":"πολιτισμό και ζωντανή τοπική εμπειρία";
      const risk=destination.crowdLevel>=4?"Τα γνωστά σημεία θέλουν σωστή ώρα μέσα στην ημέρα.":destination.costTier>=4?"Η διαμονή χρειάζεται έγκαιρο έλεγχο για να μείνει ισορροπημένο το budget.":"Η καλύτερη εμπειρία έρχεται χωρίς υπερφορτωμένο πρόγραμμα.";
      return{slug:destination.slug,destination:destination.nameEl,destinationEn:destination.nameEn,startDate,endDate,nights:4,reasonEl:`Ξεχωρίζει αυτή την εβδομάδα για ${feelings}, με εποχή που υποστηρίζει την εμπειρία χωρίς να ζητά περιττές υποχωρήσεις.`,reasonEn:"This week's pick balances the season, the character of the place and a realistic four-night rhythm.",riskEl:risk,riskEn:"Keep the plan light and confirm the final stay details before continuing.",tags:destination.tags.slice(0,4)};
    }
  }catch{return null}
  return null;
}
