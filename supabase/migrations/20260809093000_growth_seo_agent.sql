-- Private growth telemetry and review-first SEO agent state.
-- These tables are server-only and intentionally have no anon/authenticated policies.

create table if not exists public.growth_events (
  id bigint generated always as identity primary key,
  session_id uuid null,
  event_name text not null check (event_name in ('social_share','guide_download')),
  destination_id text not null references public.destination_knowledge_v8(slug) on update cascade on delete restrict,
  source_product_id text null,
  channel text not null default 'native' check (channel in ('native','clipboard','pdf','unknown')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.growth_events enable row level security;
revoke all on table public.growth_events from anon, authenticated;
grant select, insert on table public.growth_events to service_role;
grant usage, select on sequence public.growth_events_id_seq to service_role;
create index if not exists idx_growth_events_funnel on public.growth_events(event_name,destination_id,created_at desc);
create index if not exists idx_growth_events_session on public.growth_events(session_id,created_at desc) where session_id is not null;

create table if not exists public.seo_agent_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running','completed','failed')),
  opportunity_count integer not null default 0,
  evidence_summary jsonb not null default '{}'::jsonb,
  error_summary text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null
);
alter table public.seo_agent_runs enable row level security;
revoke all on table public.seo_agent_runs from anon, authenticated;
grant select, insert, update on table public.seo_agent_runs to service_role;

create table if not exists public.seo_opportunities (
  id bigint generated always as identity primary key,
  destination_id text not null references public.destination_knowledge_v8(slug) on update cascade on delete cascade,
  query_key text not null,
  primary_keyword text not null,
  search_intent text not null,
  opportunity_score numeric(5,2) not null check(opportunity_score between 0 and 100),
  recommended_title text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in ('draft','review','approved','published','rejected')),
  last_evaluated_at timestamptz not null default now(),
  published_at timestamptz null,
  unique(destination_id,query_key)
);
alter table public.seo_opportunities enable row level security;
revoke all on table public.seo_opportunities from anon, authenticated;
grant select, insert, update on table public.seo_opportunities to service_role;
grant usage, select on sequence public.seo_opportunities_id_seq to service_role;
create index if not exists idx_seo_opportunities_queue on public.seo_opportunities(status,opportunity_score desc,last_evaluated_at desc);
