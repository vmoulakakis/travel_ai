import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const grRoute=read("app/page.tsx");
const v45=grRoute.includes("V45HolidayFinder");
const v40=!v45&&grRoute.includes("V40DiscoveryExperience");
const modern=v45||v40;
const home=read(v45?"components/v45-holiday-finder.tsx":v40?"components/v40-discovery-experience.tsx":"components/v34-escape-funnel.tsx");
const discovery=read("app/api/escape/discovery/route.ts");
const dateAgent=read("app/api/escape/date-opportunities/route.ts");
const media=read("app/api/escape/media/route.ts");
const solver=read(modern?"app/api/escape/solve-v42/route.ts":"app/api/escape/solve/stream/route.ts");
const ranking=read(modern?"lib/decision/solution-ranking-v36.ts":"lib/decision/solution-ranking-v35.ts");
const builder=read(modern?"components/v40-stay-workspace.tsx":"components/v34-escape-builder-client.tsx");
const research=read("app/api/escape/research/route.ts");
const escapePage=read("app/escape/[slug]/page.tsx");
const stayPath="app/escape/[slug]/stay/[offerId]/page.tsx",stayRoute=fs.existsSync(stayPath)?read(stayPath):"";
const mission=read("lib/data/mission-v34.ts");
const homeCss=read(v45?"components/v45-holiday-finder.module.css":v40?"components/v40-discovery-experience.module.css":"components/v34-escape-funnel.module.css");
const builderCss=read(modern?"components/v40-stay-workspace.module.css":"components/v34-escape-builder.module.css");
const designSkill=read("skills/web-design/SKILL.md");
const orchestratorSkill=read("skills/travel-orchestrator/SKILL.md");

const failures:string[]=[];
const expect=(condition:boolean,message:string)=>{if(!condition)failures.push(message)};

expect(home.includes("/api/escape/discovery"),"homepage must begin with semantic understanding rather than direct booking");
expect(home.indexOf("/api/escape/discovery")<home.indexOf(modern?"/api/escape/solve-v42":"/api/escape/solve/stream"),"traveler discovery must happen before inventory solving");
expect(modern?(home.includes("Travel Agent")&&home.includes("nextQuestion")&&home.includes("answers")&&home.includes("Μία ερώτηση ακόμη")):(home.includes('"suggest"|"fixed"|"flexible"')&&home.includes("ESCAPE DNA")),"traveler preference confirmation surface missing");
expect(discovery.includes("expected information gain")||discovery.includes("highest expected information gain"),"adaptive discovery must select questions by information gain");
expect(discovery.includes("never clinical psychology")&&discovery.includes("Never recommend a destination"),"safe-psychology and no-destination discovery boundaries missing");
expect(modern?home.includes("profile"):(home.includes("VISUAL_WORLDS")&&home.includes("data-mood")),"mood-reactive semantic choices missing");
expect(modern?(home.includes('type="date"')&&home.includes("start")&&home.includes("end")):home.includes("/api/escape/date-opportunities"),"date decision stage must exist before destination matching");
expect(dateAgent.includes("Do NOT claim")&&dateAgent.includes("weather")&&dateAgent.includes("availability"),"date agent must not invent live travel advantages before verification");
expect(modern?(home.includes("slice(0,3)")&&home.includes("Destination reveal")&&home.includes("resultGrid")):(home.includes("10 καλύτερες πραγματικές λύσεις")&&home.includes("solutionRail")),"discovery surface must expose a bounded ranked decision set");
expect(modern?(solver.includes("escape-inventory-v42")&&solver.includes("interpretIntentV8")&&solver.includes("semanticStayScore")):(solver.includes("runTravelOrchestratorV26")&&(solver.includes("buildEscapeSolutionsV36")||solver.includes("buildEscapeSolutionsV35"))),"active solver must combine semantic interpretation with real inventory");
expect(modern?(solver.includes("destinationScore")&&solver.includes("stayScore")&&solver.includes("valueScore")&&solver.includes("locationScore")):((ranking.includes("stayScore")||ranking.includes("inventoryScore"))&&ranking.includes("combinedScore")&&ranking.includes("reasoning")),"inventory reranking contract missing");
expect(modern?solver.includes("trackingUrl:x.row.tracking_url"):ranking.includes("trackingUrl:offer.trackingUrl"),"solution ranking must preserve exact affiliate tracking URL");
expect(modern?(home.includes("Real inventory")&&home.includes("AI + REAL INVENTORY")&&solver.includes("inventoryChecked")):(home.includes("ΑΝΤΙΣΤΡΟΦΗ ΣΚΕΨΗ")&&home.includes("REVERSE CHECK")),"reverse-inventory reasoning must remain explicit in the product");
expect(home.includes("mode=aerial"),"discovery imagery must request aerial preference");
expect(media.includes("AERIAL")&&media.includes("NON_PHOTO")&&media.includes("minWidth:1800")&&media.includes("minAspect:1.35"),"media lookup must prefer aerial high-resolution photography and reject non-photo assets");
expect(media.includes("Wikimedia Commons")&&media.includes("attribution"),"media lookup must preserve attribution");
const focusedDesktop=modern?(homeCss.includes("min-height:100svh")&&homeCss.includes("overflow:hidden")&&(homeCss.includes("min-height:calc(100svh - 72px)")||homeCss.includes("min-height:calc(100svh - 74px)"))):(homeCss.includes("height:100svh")&&homeCss.includes("overflow:hidden"));
expect(focusedDesktop,"desktop funnel must behave as a focused app rather than an endless questionnaire");
expect(builder.includes("/api/trip-builder")&&(builder.includes("/api/escape/stay-local")||builder.includes("/api/escape/research")),"selected stay must retain grounded 360 research and trip building");
expect(research.includes("getLocalIntelligenceV38")||research.includes("hotelName:null"),"destination research must remain grounded in local intelligence");
const selectedStayContinuity=escapePage.includes("V39DestinationMapWorkspace")?escapePage.includes("preferredOffer")&&stayRoute.includes("selected=loaded.find")&&(stayRoute.includes("V40StayWorkspace")||/V\d+EscapeBuilderClient/.test(stayRoute)):escapePage.includes("preferredOffer")&&/V\d+EscapeBuilderClient/.test(escapePage);
expect(selectedStayContinuity,"selected inventory-backed stay must carry through the map/stay route into the active trip workspace");
expect(escapePage.includes("loadMissionV34")&&escapePage.includes("inferMissionProfileV34"),"destination route must preserve semantic mission context");
expect(mission.includes("needText")&&mission.includes("escapeDna")&&mission.includes("inferMissionProfileV34"),"semantic mission continuity helper missing");
expect(homeCss.includes("@media")&&builderCss.includes("@media"),"active consumer surfaces require responsive equivalents");
const v45DesignContract=designSkill.includes("travel-ai-v45-holiday-finder-web-design")
 && designSkill.includes("up to **3** defensible matches")
 && designSkill.includes("real offer products")
 && designSkill.includes("fake filler result")
 && designSkill.includes("Commercial payout cannot lift traveller fit");
const designContract=(designSkill.includes("up to 10")&&designSkill.includes("dual-pass"))||(designSkill.includes("public initial choice count: **3**")&&designSkill.includes("Internal candidate/ranking sets may be larger"))||v45DesignContract;
expect(designContract,"web design skill must preserve real offer grounding, bounded choices, no filler and commercial independence");
const orchestratorContract=(orchestratorSkill.includes("Inventory Reality Pass")&&orchestratorSkill.includes("Reverse Check")&&orchestratorSkill.includes("Commission never enters the score"))||(orchestratorSkill.includes("Dual-pass reasoning")&&((orchestratorSkill.includes("real stay inventory")&&orchestratorSkill.includes("never raises destination/user-fit score"))||(orchestratorSkill.includes("real offer products")&&orchestratorSkill.includes("never raise destination/user-fit score")))&&orchestratorSkill.includes("commission"));
expect(orchestratorContract,"orchestrator skill must encode reverse inventory reasoning and commercial independence");

if(failures.length){console.error("Semantic funnel compatibility smoke FAILED\n- "+failures.join("\n- "));process.exit(1)}
console.log(`Semantic funnel compatibility smoke passed for ${v45?"V45-Holiday-Finder":v40?"V44-on-V40-shell":"legacy"}: adaptive discovery, semantic single-fetch inventory, high-res aerial media, mission continuity and grounded selected-stay research remain present.`);
