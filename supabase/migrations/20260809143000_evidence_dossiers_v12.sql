-- V12: timestamped destination evidence, governed media and thematic dossiers.
-- All tables are server-only. The traveller UI receives a deliberately reduced view
-- that never includes third-party source URLs; the only commerce exit remains CD104.

create table if not exists public.destination_evidence_v12 (
  id uuid primary key default gen_random_uuid(),
  destination_id text not null references public.destination_knowledge_v8(slug) on update cascade on delete cascade,
  evidence_kind text not null check (evidence_kind in (
    'tripadvisor_destination_rank','tripadvisor_place_rank','tripadvisor_rating',
    'booking_property_presence','booking_property_rating','official_event',
    'official_place','seasonal_note','demand_signal'
  )),
  subject_key text not null,
  subject_name text not null,
  source_provider text not null,
  source_url text not null check (source_url ~ '^https://'),
  headline text not null,
  summary text null,
  rank_value integer null check (rank_value is null or rank_value > 0),
  rating_value numeric(5,2) null check (rating_value is null or rating_value >= 0),
  rating_scale numeric(5,2) null check (rating_scale is null or rating_scale > 0),
  review_count integer null check (review_count is null or review_count >= 0),
  source_product_id text null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  source_month date null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  confidence numeric(4,3) not null default 0.8 check (confidence between 0 and 1),
  status text not null default 'review_required' check (status in ('review_required','verified','expired','rejected')),
  payload jsonb not null default '{}'::jsonb,
  fingerprint text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at),
  check (expires_at > observed_at),
  check (evidence_kind not like 'tripadvisor_%' or source_month is not null)
);
alter table public.destination_evidence_v12 enable row level security;
revoke all on table public.destination_evidence_v12 from anon, authenticated, public;
grant select, insert, update, delete on table public.destination_evidence_v12 to service_role;
create index if not exists idx_destination_evidence_v12_live
  on public.destination_evidence_v12(destination_id,status,expires_at desc,evidence_kind);
create index if not exists idx_destination_evidence_v12_events
  on public.destination_evidence_v12(destination_id,starts_at,ends_at)
  where evidence_kind = 'official_event' and status = 'verified';
create index if not exists idx_destination_evidence_v12_property
  on public.destination_evidence_v12(source_product_id,evidence_kind,expires_at desc)
  where source_product_id is not null;

create table if not exists public.destination_media_v12 (
  id uuid primary key default gen_random_uuid(),
  destination_id text not null references public.destination_knowledge_v8(slug) on update cascade on delete cascade,
  source_product_id text null,
  media_kind text not null check (media_kind in ('area_photo','property_photo','cinematic_preview','drone_like_video')),
  asset_url text not null check (asset_url ~ '^https://'),
  source_url text not null check (source_url ~ '^https://'),
  source_provider text not null,
  rights_status text not null check (rights_status in ('owned','licensed','feed_authorized','open_license','review_required','rejected')),
  license_code text null,
  attribution text null,
  truthful_label text not null,
  generation_model text null,
  observed_at timestamptz not null,
  expires_at timestamptz null,
  status text not null default 'review_required' check (status in ('review_required','verified','expired','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  fingerprint text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.destination_media_v12 enable row level security;
revoke all on table public.destination_media_v12 from anon, authenticated, public;
grant select, insert, update, delete on table public.destination_media_v12 to service_role;
create index if not exists idx_destination_media_v12_live
  on public.destination_media_v12(destination_id,status,media_kind,observed_at desc);

create table if not exists public.thematic_dossier_runs_v12 (
  id uuid primary key default gen_random_uuid(),
  period_key text not null,
  theme_key text not null,
  language text not null default 'el' check (language in ('el','en')),
  status text not null default 'draft' check (status in ('draft','researching','review_required','approved','published','failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  selected_choices jsonb not null default '[]'::jsonb,
  pdf_storage_path text null,
  generated_by text not null default 'travel-guru-v12',
  reviewed_at timestamptz null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(period_key,theme_key,language)
);
alter table public.thematic_dossier_runs_v12 enable row level security;
revoke all on table public.thematic_dossier_runs_v12 from anon, authenticated, public;
grant select, insert, update, delete on table public.thematic_dossier_runs_v12 to service_role;
create index if not exists idx_thematic_dossier_runs_v12_queue
  on public.thematic_dossier_runs_v12(status,period_key desc,updated_at desc);
