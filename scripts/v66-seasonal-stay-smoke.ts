import assert from "node:assert/strict";
import { seasonalStayFit } from "../lib/decision/stay-seasonality-v66";

const pelionWinter=seasonalStayFit({
  month:1,propertyName:"Traditional Mountain Guesthouse with Fireplace & Spa",destinationSlug:"pelion",destinationSeasonProfile:"mountain",destinationTags:["nature","beach","wellness"]
});
const pelionSummer=seasonalStayFit({
  month:7,propertyName:"Seaside Boutique Hotel with Pool",destinationSlug:"pelion",destinationSeasonProfile:"mountain",destinationTags:["nature","beach","wellness"]
});
const pelionWrongWinter=seasonalStayFit({
  month:1,propertyName:"Beach Resort with Outdoor Pool",destinationSlug:"pelion",destinationSeasonProfile:"mountain",destinationTags:["nature","beach"]
});
assert(pelionWinter.score>pelionWrongWinter.score,"Pelion winter should prefer mountain/guesthouse/spa over beach resort");
assert(pelionSummer.score>=78,"Pelion summer should strongly support seaside/pool stays");

const mykonosSummer=seasonalStayFit({
  month:8,propertyName:"Beachfront Resort with Pool",destinationSlug:"mykonos",destinationSeasonProfile:"summer_island",destinationTags:["beach","nightlife","luxury"]
});
const mykonosWinter=seasonalStayFit({
  month:1,propertyName:"Beachfront Resort with Pool",destinationSlug:"mykonos",destinationSeasonProfile:"summer_island",destinationTags:["beach","nightlife","luxury"]
});
assert(mykonosSummer.score>mykonosWinter.score+25,"Summer-island resort should rank materially higher in peak season");

const athensWinter=seasonalStayFit({
  month:1,propertyName:"Central Boutique Hotel Athens",destinationSlug:"athens",destinationSeasonProfile:"city_cont",destinationTags:["city","culture","food"]
});
assert(athensWinter.score>=75,"All-year city boutique stay should remain strong in winter");

console.log(JSON.stringify({pelionWinter,pelionSummer,pelionWrongWinter,mykonosSummer,mykonosWinter,athensWinter},null,2));
