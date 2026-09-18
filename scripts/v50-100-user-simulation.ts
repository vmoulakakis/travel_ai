import assert from "node:assert/strict";
import { buildV50Trip, interpretV50Conversation, nextV50Question, type V50TravelerType } from "../lib/ai/v50-agent-state";

const now=new Date("2026-09-18T09:00:00Z");
const companions:Array<{text:string;expected:V50TravelerType;answer:V50TravelerType}>=[
  {text:"με σύντροφο",expected:"couple",answer:"couple"},
  {text:"me sintrofo",expected:"couple",answer:"couple"},
  {text:"με φίλους",expected:"friends",answer:"friends"},
  {text:"me filous",expected:"friends",answer:"friends"},
];
const datePhrases=["επόμενο ΣΚ","epomeno sk","αυτό το ΣΚ","auto to sk","2026-10-02"];
const intents=[
  {text:"θέλω ξεκούραση και ησυχία",energy:"restore",must:"none"},
  {text:"xekourasi kai isixia",energy:"restore",must:"none"},
  {text:"βουνό και φύση",energy:"balanced",must:"nature"},
  {text:"vouno kai fysi",energy:"balanced",must:"nature"},
  {text:"φαγητό και εμπειρίες",energy:"stimulating",must:"none"},
] as const;

let total=0,parsedDates=0,travelerHits=0,intentHits=0,noLoop=0,tripBuilds=0;
const failures:string[]=[];

for(const d of datePhrases){
  for(const c of companions){
    for(const i of intents){
      total++;
      const userText=`${d}, ${c.text}, ${i.text}`;
      const interpreted=interpretV50Conversation({userText,origin:"Αθήνα",budget:900},now);
      if(interpreted.startDate&&interpreted.endDate)parsedDates++; else failures.push(`#${total} date: ${userText}`);
      if(interpreted.travelerType===c.expected)travelerHits++; else failures.push(`#${total} traveler=${interpreted.travelerType} expected=${c.expected}`);
      if(interpreted.desiredEnergy===i.energy&&interpreted.mustHave===i.must)intentHits++; else failures.push(`#${total} intent energy=${interpreted.desiredEnergy}/${interpreted.mustHave} expected=${i.energy}/${i.must}`);

      const answers={companions:c.answer,outcome:i.energy,friction:"any"} as const;
      const completed=interpretV50Conversation({userText,origin:"Αθήνα",budget:900,answers},now);
      if(nextV50Question(completed,answers)===null)noLoop++; else failures.push(`#${total} clarification-loop`);
      try{ buildV50Trip({userText,origin:"Αθήνα",budget:900,answers},completed); tripBuilds++; }
      catch(error){ failures.push(`#${total} build=${error instanceof Error?error.message:String(error)}`); }
    }
  }
}

assert.equal(total,100);
const score=(n:number)=>Number((n/total*100).toFixed(1));
const result={
  users:total,
  dateUnderstandingPct:score(parsedDates),
  companionUnderstandingPct:score(travelerHits),
  intentUnderstandingPct:score(intentHits),
  noClarificationLoopPct:score(noLoop),
  tripBuildSuccessPct:score(tripBuilds),
  failures:failures.length
};
console.log("V50_100_USER_SIMULATION",JSON.stringify(result,null,2));
if(failures.length){
  console.error(failures.slice(0,25).join("\n"));
  process.exit(1);
}
