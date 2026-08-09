import { AdminCsvImporter } from "@/components/admin-csv-importer";
import { notFound } from "next/navigation";
import "./admin.css";

export const dynamic = "force-dynamic";

const checks=[
 ["Destination Knowledge V8",Boolean(process.env.SUPABASE_INGEST_SECRET),"Independent canonical destination catalog. Hotel inventory is never the destination universe."],
 ["DeepSeek intent parser",Boolean(process.env.DEEPSEEK_API_KEY),"Optional free-text semantic parser only. Structured answers work without an LLM call."],
 ["OpenAI verifier",Boolean(process.env.OPENAI_API_KEY),"Optional gpt-5.4-nano consistency check only when the top ranking is ambiguous."],
 ["Weather evidence",true,"NASA POWER climatology is the long-range baseline; Open-Meteo can add short-range forecast evidence."],
 ["Linkwise stays",Boolean(process.env.SUPABASE_INGEST_URL&&process.env.SUPABASE_INGEST_SECRET),"Stay inventory is linked by coordinates/aliases only after a destination is selected."],
 ["V8 learning",Boolean(process.env.SUPABASE_INGEST_SECRET),"Anonymous V8 outcomes are isolated from V7. Neural influence stays zero until the training gate passes."],
 ["SEO opportunity agent",Boolean(process.env.CRON_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY),"Runs a weekly evidence-labelled audit. It creates review drafts and cannot auto-publish indexable pages."],
 ["Share and PDF funnel",Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),"Tracks native sharing and personal guide downloads separately from final outbound clicks."],
 ["Cron",Boolean(process.env.CRON_SECRET),"Protects ingestion and V8 training jobs."],
 ["Admin",Boolean(process.env.ADMIN_SECRET||process.env.CRON_SECRET),"Protects manual import operations."]
] as const;

export default function AdminPage(){if(process.env.ENABLE_ADMIN_DASHBOARD!=="true")notFound();return <main className="admin-shell"><div className="eyebrow">Travel Guru V10 · Control Room</div><h1>Destination-first readiness.</h1><p className="muted">User intent → canonical destination knowledge → season / effort / duration / budget → finalist weather → six diverse matches → stays.</p><section className="admin-grid">{checks.map(([label,ok,detail])=><article className="admin-card" key={label}><span className={ok?"status status-ok":"status status-warn"}>{ok?"READY":"OPTIONAL / SETUP"}</span><h2>{label}</h2><p>{detail}</p></article>)}</section><section className="admin-card admin-wide"><span className="status status-ok">DATA GOVERNANCE</span><h2>Commerce cannot distort destination ranking</h2><p>Hotel count, affiliate EPC, discount, merchant economics and Linkwise demand signals have 0% weight in the V10 destination score. They are downstream stay-ranking signals only.</p></section><section className="admin-card admin-wide"><span className="status status-ok">SEO GOVERNANCE</span><h2>The growth agent cannot publish by itself</h2><p>Every opportunity is stored with provenance and remains a draft until human review. Fabricated ratings, bought links and scaled duplicate pages are blocked by design.</p></section><section className="admin-card admin-wide"><span className="status status-ok">PRIVACY</span><h2>Learning stores normalized outcomes, not conversations</h2><p>V10 records anonymous intent/candidate feature rows and selections. Raw system/user conversation text is not persisted in the matching learning tables.</p></section><section className="admin-card admin-wide"><span className="status status-warn">OPERATIONS</span><h2>Import travel supply data</h2><p>CSV/feed imports remain operational inputs. Supply data enriches stays and evidence; it does not define the destination universe.</p><AdminCsvImporter/></section><p className="disclosure">Machine-readable health: <a href="/api/health">/api/health</a></p></main>}
