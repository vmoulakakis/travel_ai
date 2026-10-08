-- TravelAI 360 shadow corpus and evaluation foundation. NO automatic activation.
-- Requires pgvector extension already enabled. Keep all tables service-role only.
create table if not exists public.travel360_corpus_v1 (
 id text primary key,
 entity_kind text not null check(entity_kind in ('stay','destination','microplace','experience','poi','event','food')),
 entity_ref text not null,
 language text not null check(language in ('el','en')),
 content text not null,
 content_hash text not null,
 source_refs jsonb not null default '[]'::jsonb,
 evidence_quality real not null default 0 check(evidence_quality>=0 and evidence_quality<=1),
 observed_at timestamptz,
 valid_from timestamptz,
 valid_to timestamptz,
 updated_at timestamptz not null default now(),
 unique(entity_kind,entity_ref,language)
);
create index if not exists travel360_corpus_kind_idx on public.travel360_corpus_v1(entity_kind,language);
create table if not exists public.travel360_embeddings_v1 (
 corpus_id text not null references public.travel360_corpus_v1(id) on delete cascade,
 model_id text not null,
 model_revision text not null,
 input_hash text not null,
 embedding extensions.vector(384) not null,
 qa_status text not null default 'shadow' check(qa_status in ('shadow','validated','rejected')),
 embedded_at timestamptz not null default now(),
 primary key (corpus_id,model_id,model_revision)
);
create index if not exists travel360_embedding_cosine_idx on public.travel360_embeddings_v1 using hnsw (embedding extensions.vector_cosine_ops);
create table if not exists public.travel360_eval_scenarios_v1 (
 scenario_id text primary key,
 language text not null check(language in ('el','en')),
 intent jsonb not null,
 hard_constraints jsonb not null default '{}'::jsonb,
 labels jsonb not null default '{}'::jsonb,
 evidence_refs jsonb not null default '[]'::jsonb,
 reviewer text,
 version integer not null default 1,
 created_at timestamptz not null default now()
);
create table if not exists public.travel360_eval_runs_v1 (
 run_id uuid primary key default gen_random_uuid(),
 model_id text not null,
 corpus_revision text not null,
 split_hash text not null,
 metrics jsonb not null,
 violations integer not null default 0,
 decision text not null default 'shadow' check(decision in ('shadow','rejected','approved')),
 created_at timestamptz not null default now()
);
create table if not exists public.travel360_feature_snapshots_v1 (
 snapshot_id uuid primary key default gen_random_uuid(),
 observed_at timestamptz not null default now(),
 corpus_count integer not null default 0,
 embeddings_count integer not null default 0,
 metrics jsonb not null default '{}'::jsonb
);
alter table public.travel360_corpus_v1 enable row level security;
alter table public.travel360_embeddings_v1 enable row level security;
alter table public.travel360_eval_scenarios_v1 enable row level security;
alter table public.travel360_eval_runs_v1 enable row level security;
alter table public.travel360_feature_snapshots_v1 enable row level security;
revoke all on table public.travel360_corpus_v1,public.travel360_embeddings_v1,public.travel360_eval_scenarios_v1,public.travel360_eval_runs_v1,public.travel360_feature_snapshots_v1 from anon,authenticated;
