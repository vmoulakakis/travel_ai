const checks=[
 ["DeepSeek V4 Pro",Boolean(process.env.DEEPSEEK_API_KEY),"Required for AI explanation/reasoning"],
 ["Supabase",Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY),"Optional until persistence/feed ingestion"],
 ["Cron secret",Boolean(process.env.CRON_SECRET),"Required before scheduled ingestion"]
] as const;
export default function AdminPage(){return <main className="admin-shell"><div className="eyebrow">Travel Intelligence Control Room</div><h1>System readiness</h1><p className="muted">Secrets, evidence ingestion and governance must be healthy before commerce is enabled.</p><section className="admin-grid">{checks.map(([label,ok,detail])=><article className="admin-card" key={label}><span className={ok?"status status-ok":"status status-warn"}>{ok?"READY":"SETUP"}</span><h2>{label}</h2><p>{detail}</p></article>)}</section><section className="admin-card admin-wide"><span className="status status-warn">GOVERNANCE</span><h2>Affiliate eligibility is fail-closed</h2><p>No tracked CTA is allowed until program approval, property approval, traffic-source permission, tracking validity and offer activity are verified.</p></section></main>}
