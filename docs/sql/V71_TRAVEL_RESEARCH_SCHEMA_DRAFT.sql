-- PROPOSAL ONLY, NOT A DEPLOYABLE MIGRATION
-- TravelAI V71: research provenance, search intent, and traveler pain signals.
-- Generate a real migration via: supabase migration new v71_pain_research
-- Review, dry-run on a branch, run security advisors, and only then migrate.
-- This draft is strictly additive; no modification to current V44/V45/V46 production tables.

create table if not exists public.travel_research_sources_v71 (
  source_key text primary key,
  source_label text not null,
  source_kind text not null check (source_kind in
    ('official','operator','first_party','search_console','trends','forum','spatial','weather')),
  terms_url text,
  rights_status text not null default 'unknown' check (rights_status in
    ('unknown','restricted','licensed','first_party','open_with_conditions')),
  collection_approved boolean not null default false,
  ai_use_approved boolean not null default false,
  public_display_approved boolean not null default false,
  rights_notes text not null default '',
  rights_checked_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.travel_research_sources_v71 is
  'Source rights gate. Third-party forums must default to restricted/unknown, never automatic ingestion.';

create table if not exists public.travel_pain_signals_v71 (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references public.travel_research_sources_v71(source_key),
  node_key text references public.travel_destination_nodes_v46(node_key)
    on update cascade on delete set null,
  evidence_id uuid references public.travel_knowledge_evidence_v44(id)
    on update cascade on delete set null,
  pain_key text not null,
  language_code text not null check (language_code in ('el','en','other')),
  origin_area text, -- city/region, never a traveler home address
  travel_month smallint check (travel_month between 1 and 12),
  normalized_problem text not null, -- original analytical summary; never a copied forum post
  traveler_intent text,
  source_url text,
  source_published_at timestamptz,
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  confidence real check (confidence between 0 and 1),
  review_status text not null default 'candidate' check (review_status in
    ('candidate','corroborated','contradicted','expired','rejected')),
  usage_status text not null default 'internal_review' check (usage_status in
    ('internal_review','approved','rejected')),
  dedupe_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operational_signal_has_expiry check (
    pain_key not in ('KTEL_CONFUSION','FERRY_CONFLICT','OFF_SEASON_SHUTDOWN')
    or usage_status <> 'approved'
    or expires_at is not null
  ),
  constraint approved_signal_is_corroborated check (
    usage_status <> 'approved' or review_status = 'corroborated'
  )
);
comment on table public.travel_pain_signals_v71 is
  'Normalized traveler pain hypotheses. Only independently corroborated, rights-cleared, unexpired signals may enter product retrieval.';

create index if not exists idx_travel_pain_signals_v71_node
  on public.travel_pain_signals_v71 (node_key, pain_key);
create index if not exists idx_travel_pain_signals_v71_status
  on public.travel_pain_signals_v71 (usage_status, review_status, expires_at);

create table if not exists public.travel_search_demand_v71 (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references public.travel_research_sources_v71(source_key),
  node_key text references public.travel_destination_nodes_v46(node_key)
    on update cascade on delete set null,
  pain_key text not null,
  language_code text not null check (language_code in ('el','en','other')),
  normalized_query text not null,
  geoscope text,
  period_start date not null,
  period_end date not null,
  impressions bigint check (impressions is null or impressions >= 0),
  clicks bigint check (clicks is null or clicks >= 0),
  trends_interest real check (trends_interest is null or trends_interest between 0 and 100),
  measure_kind text not null check (measure_kind in
    ('gsc_clicks_impressions','trends_relative_index','qualitative_query')),
  provenance_url text,
  created_at timestamptz not null default now(),
  constraint demand_valid_period check (period_end >= period_start),
  constraint actual_gsc_data_not_assumed check (
    measure_kind <> 'gsc_clicks_impressions'
    or (impressions is not null and clicks is not null and clicks <= impressions)
  ),
  constraint trends_only_on_trends_measure check (
    trends_interest is null or measure_kind = 'trends_relative_index'
  ),
  constraint search_demand_dedupe unique
    (source_key, pain_key, language_code, normalized_query, period_start, period_end)
);
comment on table public.travel_search_demand_v71 is
  'Measured/qualitative demand separated by measurement kind. Never treat Google Trends relative index as absolute traffic.';

create index if not exists idx_travel_search_demand_v71_intent
  on public.travel_search_demand_v71 (pain_key, period_end desc, node_key);

-- RLS = default deny. Service-role work only, through trusted server-side code.
alter table public.travel_research_sources_v71 enable row level security;
alter table public.travel_pain_signals_v71 enable row level security;
alter table public.travel_search_demand_v71 enable row level security;
revoke all on public.travel_research_sources_v71 from anon, authenticated;
revoke all on public.travel_pain_signals_v71 from anon, authenticated;
revoke all on public.travel_search_demand_v71 from anon, authenticated;

-- SECURITY INVOKER ensures the view respects the caller's RLS/privileges.
-- Rights + corroboration + expiry are the minimum approval conditions.
create or replace view public.travel_approved_pain_signals_v71
  with (security_invoker = true) as
select p.id, p.node_key, p.evidence_id, p.pain_key, p.language_code,
       p.origin_area, p.travel_month, p.normalized_problem,
       p.traveler_intent, p.source_url, p.observed_at, p.expires_at,
       p.confidence, p.metadata
from public.travel_pain_signals_v71 p
join public.travel_research_sources_v71 s on s.source_key = p.source_key
where p.usage_status = 'approved'
  and p.review_status = 'corroborated'
  and s.collection_approved
  and s.ai_use_approved
  and (p.expires_at is null or p.expires_at > now());
revoke all on public.travel_approved_pain_signals_v71 from anon, authenticated;

-- IMPORTANT: this view makes rights gating necessary but not sufficient.
-- The authorized ingestion worker must still validate permission scope,
-- individual claim provenance, factual freshness and geographic resolution.
-- Never auto-set ai_use_approved based on the mere existence of a public URL.
