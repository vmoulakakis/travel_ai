import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const home=read("components/v34-escape-funnel.tsx");
const discovery=read("app/api/escape/discovery/route.ts");
const builder=read("components/v34-escape-builder-client.tsx");
const research=read("app/api/escape/research/route.ts");
const escapePage=read("app/escape/[slug]/page.tsx");
const mission=read("lib/data/mission-v34.ts");
const homeCss=read("components/v34-escape-funnel.module.css");
const builderCss=read("components/v34-escape-builder.module.css");
const skill=read("skills/web-design/SKILL.md");

const failures:string[]=[];
const expect=(condition:boolean,message:string)=>{if(!condition)failures.push(message)};

expect(home.includes("Κατάλαβέ με πρώτα")&&home.includes("Understand me first"),"homepage must begin with semantic understanding rather than booking fields");
expect(home.indexOf("/api/escape/discovery")<home.indexOf("/api/recommend/stream"),"traveler discovery must happen before destination matching");
expect(home.includes('"suggest"|"fixed"|"flexible"'),"date strategy must support suggested, fixed and flexible modes");
expect(home.includes("ESCAPE DNA"),"Escape DNA confirmation surface missing");
expect(discovery.includes("expected information gain")||discovery.includes("highest expected information gain"),"adaptive discovery must select questions by information gain");
expect(discovery.includes("never clinical psychology")&&discovery.includes("Never recommend a destination"),"safe-psychology and no-destination discovery boundaries missing");
expect(home.includes("slice(0,3)")||home.includes("slice(0, 3)"),"homepage must constrain finalists to three");
expect(home.includes("/api/escape/media"),"destination finalists need real attributed media lookup");
expect(builder.includes("/api/escape/research"),"destination-first 360 research endpoint missing");
expect(builder.indexOf("/api/escape/research")<builder.indexOf("/api/trip-builder"),"360 destination research must precede stay-specific trip building");
expect(research.includes("hotelName:null"),"destination research must not require a hotel");
expect(escapePage.includes("V34EscapeBuilderClient"),"destination route must render V34 builder");
expect(escapePage.includes("loadMissionV34")&&escapePage.includes("inferMissionProfileV34"),"destination route must preserve semantic mission context");
expect(mission.includes("needText")&&mission.includes("escapeDna")&&mission.includes("inferMissionProfileV34"),"semantic mission continuity helper missing");
expect(homeCss.includes("prefers-reduced-motion")&&builderCss.includes("prefers-reduced-motion"),"both cinematic surfaces require reduced-motion equivalents");
expect(skill.includes("free-text need -> adaptive AI discovery -> editable Escape DNA"),"project design skill must encode the V34 funnel contract");
expect(!skill.includes("date opportunity -> emotional need -> 3 matched destinations"),"obsolete date-first design contract still present");

if(failures.length){console.error("V34 semantic funnel smoke FAILED\n- "+failures.join("\n- "));process.exit(1)}
console.log("V34 semantic funnel smoke passed: psychology-first discovery, date strategy, semantic continuity, visual matching, destination-first 360 research and reduced-motion contracts are present.");
