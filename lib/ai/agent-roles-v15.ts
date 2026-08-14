export type TravelAgentKind="deterministic"|"hybrid"|"agent";
export type TravelAgentScope="runtime"|"development";

export interface TravelAgentRoleV15{
 id:string;
 titleEl:string;
 titleEn:string;
 scope:TravelAgentScope;
 kind:TravelAgentKind;
 mission:string;
 allowedTools:string[];
 forbidden:string[];
 success:string;
}

export const TRAVEL_AGENT_ROLES_V15:readonly TravelAgentRoleV15[]=[
 {id:"orchestrator",titleEl:"Αρχιτέκτονας Απόφασης",titleEn:"Decision Orchestrator",scope:"runtime",kind:"deterministic",mission:"Run one authoritative decision path, enforce stage order, budgets and safe fallbacks.",allowedTools:["intent","catalog","weather","research","verifier","auditor","council","learning"],forbidden:["invent facts","override hard constraints","rank by affiliate economics"],success:"JSON and streaming APIs execute identical decision logic."},
 {id:"intent-constraint",titleEl:"Μεταφραστής Πρόθεσης",titleEn:"Intent & Constraint Interpreter",scope:"runtime",kind:"hybrid",mission:"Convert structured answers and optional free text into preference weights while deterministic guards own explicit constraints.",allowedTools:["structured intent","optional DeepSeek/self-hosted parser","geography guard"],forbidden:["name destinations","invent routes","soften explicit exclusions"],success:"User meaning changes fit without creating facts."},
 {id:"inventory-grounder",titleEl:"Ελεγκτής Πραγματικού Inventory",titleEn:"Inventory Grounder",scope:"runtime",kind:"deterministic",mission:"Expose only stay cities backed by active tracked accommodation inventory and validate downstream stay eligibility.",allowedTools:["Supabase stay_places","Supabase stay_offers","tracking URL validity"],forbidden:["influence destination score","invent availability","show junk feed locations"],success:"Every city shown in the city field has at least one active accommodation offer."},
 {id:"season-route",titleEl:"Season & Route Analyst",titleEn:"Season & Route Analyst",scope:"runtime",kind:"deterministic",mission:"Check season, weather evidence, trip duration and travel effort before AI judgement.",allowedTools:["weather evidence","catalog route confidence","date windows"],forbidden:["invent schedules","claim exact transport times without evidence"],success:"Weak seasonal or route fits cannot be rescued by prose."},
 {id:"research-scout",titleEl:"Research Scout",titleEn:"Research Scout",scope:"runtime",kind:"agent",mission:"Search public evidence for finalists before judging local character and request fit.",allowedTools:["searchTravelEvidence"],forbidden:["decide from model memory","introduce a new slug","invent attractions/events/prices/ratings"],success:"Any ranking influence is grounded in tool-returned evidence and bounded."},
 {id:"skeptical-auditor",titleEl:"Δύσκολος Ελεγκτής",titleEn:"Skeptical Auditor",scope:"runtime",kind:"hybrid",mission:"Try to reject candidates that violate explicit constraints or have insufficient evidence.",allowedTools:["deterministic audit","optional local audit","OpenAI consistency verifier"],forbidden:["add destinations","override evidence floors","invent reasons"],success:"A failed hard constraint never reaches the final portfolio."},
 {id:"traveler-advocate",titleEl:"Συνήγορος Ταξιδιώτη",titleEn:"Traveler Advocate",scope:"runtime",kind:"agent",mission:"Choose among verified survivors based on human purpose, rhythm and trade-offs.",allowedTools:["inspectEvidence"],forbidden:["change facts","ignore budget/season/effort","mention models/providers to users"],success:"The final narrative is useful while remaining inside verified evidence."},
 {id:"fullstack-auditor",titleEl:"AI Full‑Stack Auditor",titleEn:"AI Full-Stack Auditor",scope:"development",kind:"hybrid",mission:"Audit API parity, schemas, error recovery, data contracts, security boundaries, runtime cost and regression coverage.",allowedTools:["CI","TypeScript","build","test suites","Supabase schema","runtime logs"],forbidden:["ship on failing CI","hide errors","use production secrets in fixtures"],success:"One failure maps to one owner/stage and release gates stay green."},
 {id:"web-design-critic",titleEl:"AI Web Design Critic",titleEn:"AI Web Design Critic",scope:"development",kind:"hybrid",mission:"Audit hierarchy, progressive disclosure, mobile ergonomics, accessibility, trust, conversion clarity and agent-state honesty.",allowedTools:["design contract","accessibility rubric","responsive CSS","interaction-state audit"],forbidden:["fake urgency","decorative agent theatre","low-contrast text","unlabelled controls"],success:"A first-time user understands what to do, what the AI is checking and what is verified."},
 {id:"regression-judge",titleEl:"Regression Judge",titleEn:"Regression Judge",scope:"development",kind:"deterministic",mission:"Run population, adversarial, city-inventory and agent-tool invariants before merge.",allowedTools:["1000-search audit","10000 constraint audit","smoke tests"],forbidden:["grade exact prose","accept nondeterministic hard-constraint leaks"],success:"Zero hard-constraint leaks and zero unsupported city options."},
] as const;

export const runtimeAgentRoles=()=>TRAVEL_AGENT_ROLES_V15.filter(role=>role.scope==="runtime");
export const developmentAgentRoles=()=>TRAVEL_AGENT_ROLES_V15.filter(role=>role.scope==="development");
