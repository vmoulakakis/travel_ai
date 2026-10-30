/** Public, deterministic Greek holiday dates. No inferred live opening hours or accommodation inventory. */
export type GreekBreak={id:string;label:string;start:string;nights:1|2|3;holidayISO:string;why:string};
const format=(d:Date)=>[d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,"0"),String(d.getUTCDate()).padStart(2,"0")].join("-");
const dayUTC=(year:number,month:number,day:number)=>new Date(Date.UTC(year,month-1,day));
const shifted=(date:Date,days:number)=>new Date(date.getTime()+days*86400000);

/** Julian Paschal calculation converted to Gregorian civil date, accurate for Greek dates 1900–2099. */
export function orthodoxEaster(year:number):Date {
 if(!Number.isInteger(year)||year<1900||year>2099)throw new RangeError("Orthodox Easter supported for 1900–2099");
 const a=year%4,b=year%7,c=year%19;
 const d=(19*c+15)%30,e=(2*a+4*b-d+34)%7;
 const julianMonth=Math.floor((d+e+114)/31);
 const julianDay=(d+e+114)%31+1;
 return shifted(dayUTC(year,julianMonth,julianDay),13);
}
function breaksByYear(year:number){
 const easter=orthodoxEaster(year);
 return [
  {name:"Πρωτοχρονιά",date:dayUTC(year,1,1)},
  {name:"Θεοφάνεια",date:dayUTC(year,1,6)},
  {name:"Καθαρά Δευτέρα",date:shifted(easter,-48)},
  {name:"25η Μαρτίου",date:dayUTC(year,3,25)},
  {name:"Μεγάλη Παρασκευή",date:shifted(easter,-2)},
  {name:"Δευτέρα του Πάσχα",date:shifted(easter,1)},
  {name:"Πρωτομαγιά",date:dayUTC(year,5,1)},
  {name:"Δεκαπενταύγουστος",date:dayUTC(year,8,15)},
  {name:"28η Οκτωβρίου",date:dayUTC(year,10,28)},
  {name:"Χριστούγεννα",date:dayUTC(year,12,25)},
  {name:"Δεύτερη ημέρα Χριστουγέννων",date:dayUTC(year,12,26)}
 ];
}
export function upcomingGreekBreaks(today:Date=new Date(),count=3):GreekBreak[]{
 const now=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
 const year=today.getFullYear();
 const future=[year,year+1].filter(y=>y<=2099).flatMap(breaksByYear)
  .sort((a,b)=>a.date.getTime()-b.date.getTime());
 const results:GreekBreak[]=[];
 const starts=new Set<string>();
 for(const event of future) {
  const dow=event.date.getUTCDay();
  let arrival=event.date,nights:1|2|3=1;
  if(dow===1){arrival=shifted(event.date,-2);nights=2;}
  else if(dow===5){nights=2;}
  else if(dow===4){nights=3;}
  else if(dow===2){arrival=shifted(event.date,-3);nights=3;}
  else if(dow===6){arrival=shifted(event.date,-1);nights=2;}
  else if(dow===0){arrival=shifted(event.date,-1);nights=1;}
  const start=format(arrival),holidayISO=format(event.date);
  if(arrival.getTime()<now||starts.has(start))continue;
  starts.add(start);
  results.push({id:`gr-${holidayISO}`,label:event.name,start,nights,holidayISO,
    why:"Ενδεικτικό παράθυρο απόδρασης γύρω από την αργία, όχι πρόταση διαθεσιμότητας."});
  if(results.length>=count)break;
 }
 return results;
}
