const DAY=86_400_000;
const iso=(date:Date)=>date.toISOString().slice(0,10);
export const addDays=(date:string,days:number)=>iso(new Date(Date.parse(`${date}T00:00:00Z`)+days*DAY));

function orthodoxEaster(year:number){
 const a=year%4,b=year%7,c=year%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7,month=Math.floor((d+e+114)/31),day=(d+e+114)%31+1;
 return iso(new Date(Date.UTC(year,month-1,day+13)));
}
function holidayMap(year:number){
 const easter=orthodoxEaster(year),entries:Array<[string,string]>=[
  [`${year}-01-01`,"new-year"],[`${year}-01-06`,"epiphany"],[`${year}-03-25`,"independence-day"],[`${year}-05-01`,"labour-day"],[`${year}-08-15`,"assumption"],[`${year}-10-28`,"oxi-day"],[`${year}-12-25`,"christmas"],[`${year}-12-26`,"boxing-day"],
  [addDays(easter,-48),"clean-monday"],[addDays(easter,-2),"good-friday"],[addDays(easter,1),"easter-monday"],[addDays(easter,50),"holy-spirit"],
 ];return new Map(entries);
}
export function tripCalendarKind(start:string,end:string){
 const startDay=new Date(`${start}T00:00:00Z`).getUTCDay(),weekend=startDay===5||startDay===6;
 const holidays=new Map([...holidayMap(Number(start.slice(0,4))),...holidayMap(Number(end.slice(0,4)))]);
 for(let date=start;date<=end;date=addDays(date,1)){const name=holidays.get(date);if(name)return{kind:"holiday" as const,holiday:name,holidayOffset:Math.round((Date.parse(`${date}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/DAY)};}
 return{kind:weekend?"weekend" as const:"weekday" as const,holiday:null,holidayOffset:0};
}
export function equivalentDateCandidates(start:string,end:string){
 const nights=Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/DAY),kind=tripCalendarKind(start,end),out:Array<{startDate:string;endDate:string;reason:"same-weekend"|"same-holiday"|"same-weekdays"}>=[];
 if(kind.kind==="holiday"&&kind.holiday){for(let year=Number(start.slice(0,4))+1;year<=Number(start.slice(0,4))+2;year++){const found=[...holidayMap(year)].find(([,name])=>name===kind.holiday);if(found){const nextStart=addDays(found[0],-kind.holidayOffset);out.push({startDate:nextStart,endDate:addDays(nextStart,nights),reason:"same-holiday"});}}}
 else for(const shift of [7,14,21,28]){const next=addDays(start,shift);out.push({startDate:next,endDate:addDays(next,nights),reason:kind.kind==="weekend"?"same-weekend":"same-weekdays"});}
 return out;
}
