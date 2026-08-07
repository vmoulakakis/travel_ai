import { AdminCsvImporter } from "@/components/admin-csv-importer";

const checks=[
 ["DeepSeek V4 Pro",Boolean(process.env.DEEPSEEK_API_KEY),"AI explanation layer. Deterministic ranking still works without it."],
 ["Supabase Decision Data",Boolean(process.env.SUPABASE_DECISION_DATA_URL||process.env.NEXT_PUBLIC_SUPABASE_URL),"Destination intelligence loads from Supabase with a local seed fallback."],
 ["Linkwise Ingestion",Boolean(process.env.SUPABASE_INGEST_URL&&process.env.SUPABASE_INGEST_SECRET),"Secure server-to-server product feed ingestion."],
 ["CSV Import",Boolean(process.env.SUPABASE_CSV_IMPORT_URL&&process.env.SUPABASE_INGEST_SECRET),"Protected CSV ingestion into staging, destinations, evidence or product feed."],
 ["Cron",Boolean(process.env.CRON_SECRET),"Protects the scheduled Linkwise route."],
 ["Admin",Boolean(process.env.ADMIN_SECRET||process.env.CRON_SECRET),"Protects manual CSV import operations."]
] as const;

export default function AdminPage(){return <main className="admin-shell"><div className="eyebrow">Travel Intelligence Control Room</div><h1>System readiness.</h1><p className="muted">Facts → deterministic engine → AI. Commerce remains downstream of the trip decision.</p><section className="admin-grid">{checks.map(([label,ok,detail])=><article className="admin-card" key={label}><span className={ok?"status status-ok":"status status-warn"}>{ok?"READY":"SETUP"}</span><h2>{label}</h2><p>{detail}</p></article>)}</section><section className="admin-card admin-wide"><span className="status status-ok">AI DB</span><h2>Import travel data into Supabase</h2><p>CSV rows are audited through import jobs. Use auto-detect for Linkwise-style product feeds, or explicitly select destinations/evidence/raw staging.</p><AdminCsvImporter/></section><section className="admin-card admin-wide"><span className="status status-warn">GOVERNANCE</span><h2>Affiliate eligibility stays fail-closed</h2><p>No tracked CTA is allowed until program approval, property approval, traffic-source permission, tracking validity and offer activity are verified. Destination ranking never uses EPC.</p></section><p className="disclosure">Machine-readable health: <a href="/api/health">/api/health</a></p></main>}
