import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const home=read("components/v34-escape-funnel.tsx");
const discovery=read("app/api/escape/discovery/route.ts");
const dateAgent=read("app/api/escape/date-opportunities/route.ts");
const media=read("app/api/escape/media/route.ts");
const solver=read("app/api/escape/solve/stream/route.ts");
const ranking=read("lib/decision/solution-ranking-v35.ts");
const builder=read("components/v34-escape-builder-client.tsx");
const research=read("app/api/escape/research/route.ts");
const escapePage=read("app/escape/[slug]/page.tsx");
const v39StayPath="app/escape/[slug]/stay/[offerId]/page.tsx",v39Stay=fs.existsSync(v39StayPath)?read(v39StayPath):"";
const mission=read("lib/data/mission-v34.ts");
const homeCss=read("components/v34-escape-funnel.module.css");
const builderCss=read("components/v34-escape-builder.module.css");
const designSkill=read("skills/web-design/SKILL.md");
const orchestratorSkill=read("skills/travel-orchestrator/SKILL.md");

const failures:string[]=[];
const expect=(condition:boolean,message:string)=>{if(!condition)failures.push(message)};

expect(home.includes("Ξεκίνα →")&&home.includes("Start →"),"homepage must begin with semantic understanding rather than booking fields");
expect(home.indexOf("/api/escape/discovery")<home.indexOf("/api/escape/solve/stream"),"traveler discovery must happen before dual-pass solving");
expect(home.includes('"suggest"|"fixed"|"flexible"'),"date strategy must support suggested, fixed and flexible modes");
expect(home.includes("ESCAPE DNA"),"Escape DNA confirmation surface missing");
expect(discovery.includes("expected information gain")||discovery.includes("highest expected information gain"),"adaptive discovery must select questions by information gain");
expect(discovery.includes("never clinical psychology")&&discovery.includes("Never recommend a destination"),"safe-psychology and no-destination discovery boundaries missing");
expect(home.includes("VISUAL_WORLDS")&&home.includes("data-mood"),"mood-reactive visual semantic choices missing");
expect(home.includes("/api/escape/date-opportunities"),"AI date opportunity stage must run before destination matching");
expect(dateAgent.includes("Do NOT claim")&&dateAgent.includes("weather")&&dateAgent.includes("availability"),"date agent must not invent live travel advantages before verification");
expect(home.includes("10 καλύτερες πραγματικές λύσεις")&&home.includes("solutionRail"),"legacy V35 surface must support up to ten real ranked solutions");
expect(solver.includes("runTravelOrchestratorV26")&&solver.includes("buildEscapeSolutionsV35"),"legacy dual-pass solve stream must run destination reasoning before inventory reality pass");
expect(ranking.includes("inventoryScore")&&ranking.includes("combinedScore")&&ranking.includes("originalRank")&&ranking.includes("reasoning"),"reverse inventory reranking contract missing");
expect(ranking.includes("trackingUrl:offer.trackingUrl"),"solution ranking must preserve exact affiliate tracking URL");
expect(home.includes("ΑΝΤΙΣΤΡΟΦΗ ΣΚΕΨΗ")&&home.includes("REVERSE CHECK"),"reverse-rank explanation is not visible to the user");
expect(home.includes("mode=aerial"),"cinematic discovery and result imagery must request aerial preference");
expect(media.includes("AERIAL")&&media.includes("drone panorama")&&media.includes("NON_PHOTO"),"media lookup must prefer aerial photography and reject non-photo assets");
expect(media.includes("Wikimedia Commons")&&media.includes("attribution"),"media lookup must preserve attribution");
expect(homeCss.includes("height:100svh")&&homeCss.includes("overflow:hidden"),"desktop funnel must be a viewport app rather than a long scrolling page");
expect(homeCss.includes("droneCamera")&&homeCss.includes('[data-mood="sea-light"]')&&homeCss.includes('[data-mood="green-reset"]'),"cinematic motion and mood-reactive visual styling must exist");
expect(builder.includes("/api/escape/research"),"destination-first 360 research endpoint missing");
expect(builder.indexOf("/api/escape/research")<builder.indexOf("/api/trip-builder"),"360 destination research must precede stay-specific trip building");
expect(research.includes("getLocalIntelligenceV38")||research.includes("hotelName:null"),"destination research must remain independent of stay selection");
const selectedStayContinuity=escapePage.includes("V39DestinationMapWorkspace")?escapePage.includes("preferredOffer")&&v39Stay.includes("selected=loaded.find")&&/V\d+EscapeBuilderClient/.test(v39Stay):escapePage.includes("preferredOffer")&&/V\d+EscapeBuilderClient/.test(escapePage);
expect(selectedStayContinuity,"selected inventory-backed stay must carry through the active map/stay route into the trip builder");
expect(escapePage.includes("loadMissionV34")&&escapePage.includes("inferMissionProfileV34"),"destination route must preserve semantic mission context");
expect(mission.includes("needText")&&mission.includes("escapeDna")&&mission.includes("inferMissionProfileV34"),"semantic mission continuity helper missing");
expect(homeCss.includes("prefers-reduced-motion")&&builderCss.includes("prefers-reduced-motion"),"legacy cinematic surfaces require reduced-motion equivalents");
expect(designSkill.includes("up to 10")&&designSkill.includes("dual-pass")&&(designSkill.includes("no-page-scroll")||designSkill.includes("No vertical questionnaire")||designSkill.includes("viewport")),"web design skill must encode the current app funnel and ten-solution contract");
expect(orchestratorSkill.includes("Inventory Reality Pass")&&orchestratorSkill.includes("Reverse Check")&&orchestratorSkill.includes("Commission never enters the score"),"orchestrator skill must encode reverse inventory reasoning and commercial independence");

if(failures.length){console.error("Semantic funnel compatibility smoke FAILED\n- "+failures.join("\n- "));process.exit(1)}
console.log("Semantic funnel compatibility smoke passed: semantic discovery, AI date opportunities, dual-pass destination/inventory reasoning, ten ranked solutions, aerial media preference and destination-first 360 research remain present.");
