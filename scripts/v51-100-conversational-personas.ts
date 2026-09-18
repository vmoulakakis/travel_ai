import assert from "node:assert/strict";
import { interpretV50Conversation,nextV50Question } from "../lib/ai/v50-agent-state";

const now=new Date("2026-09-18T12:00:00Z");
let tested=0;

const travelers=[
  {answer:"couple" as const,text:"Με σύντροφο",expected:"couple"},
  {answer:"solo" as const,text:"Μόνος μου",expected:"solo"},
  {answer:"family" as const,text:"Με τα παιδιά",expected:"family"},
  {answer:"friends" as const,text:"Με φίλους",expected:"friends"}
];
const outcomes=[
  {answer:"restore",text:"Θέλω reset και ξεκούραση",expected:"restore"},
  {answer:"stimulating",text:"Θέλω να ζήσω κάτι διαφορετικό",expected:"stimulating"},
  {answer:"balanced",text:"Θέλω ισορροπία",expected:"balanced"},
  {answer:"stimulating",text:"thelo drasi kai peripeteia",expected:"stimulating"}
] as const;
const frictions=[
  {answer:"easy-hop",text:"κοντά και εύκολα",distance:"easy-hop",avoid:"long-travel"},
  {answer:"easy-hop",text:"konta xwris talaiporia",distance:"easy-hop",avoid:"long-travel"},
  {answer:"road-trip",text:"μου αρέσει η οδήγηση",distance:"any",avoid:"none"},
  {answer:"any",text:"δεν με περιορίζει η απόσταση",distance:"any",avoid:"none"},
  {answer:"any",text:"χωρίς πολύ κόσμο",distance:"any",avoid:"crowds"}
] as const;

for(const traveler of travelers){
  for(const outcome of outcomes){
    for(const friction of frictions){
      const x=interpretV50Conversation({
        userText:[traveler.text,outcome.text,friction.text].join(". "),
        answers:{dates:"20/09/2026",companions:traveler.answer,outcome:outcome.answer,friction:friction.answer}
      },now);
      assert.equal(x.travelerType,traveler.expected);
      assert.equal(x.desiredEnergy,outcome.expected);
      assert.equal(x.distancePreference,friction.distance);
      assert.equal(x.avoid,friction.avoid);
      assert.ok(x.startDate&&x.endDate,"dates must resolve");
      assert.equal(nextV50Question(x,{dates:"20/09/2026",companions:traveler.answer,outcome:outcome.answer,friction:friction.answer}),null);
      tested++;
    }
  }
}

const textOnly=[
  ["me syntrofo kai thelo xekourasi","couple","restore"],
  ["me ti gynaika mou kai iremia","couple","restore"],
  ["monos mou gia adventure","solo","stimulating"],
  ["moni mou thelo xalarosi","solo","restore"],
  ["me paidia se vouno","family","balanced"],
  ["oikogeneia kai fysi","family","balanced"],
  ["me filous kai party","friends","stimulating"],
  ["me parea gia peripeteia","friends","stimulating"],
  ["couple trip relax","couple","restore"],
  ["family with kids adventure","family","stimulating"],
  ["solo short drive","solo","balanced"],
  ["friends road trip","friends","balanced"],
  ["me syntrofo romantiko vouno","couple","balanced"],
  ["monos konta kai eukola","solo","balanced"],
  ["oikogeneia xwris kosmo","family","balanced"],
  ["parea nightlife","friends","stimulating"],
  ["me paidia paralia","family","balanced"],
  ["me syntrofo thalassa","couple","balanced"],
  ["moni mou politismos kai mouseia","solo","balanced"],
  ["filoi fagito kai krasi","friends","balanced"]
] as const;

for(const [text,traveler,energy] of textOnly){
  const x=interpretV50Conversation({userText:text,answers:{dates:"20/09/2026"}},now);
  assert.equal(x.travelerType,traveler,`traveler mismatch for: ${text}`);
  assert.equal(x.desiredEnergy,energy,`energy mismatch for: ${text}`);
  tested++;
}

assert.equal(tested,100);
console.log(`V51 conversational population audit: ${tested}/100 personas passed`);
