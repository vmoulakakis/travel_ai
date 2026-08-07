create extension if not exists pgcrypto;

create table if not exists affiliate_programs (
  id uuid primary key default gen_random_uuid(), merchant_name text not null unique,
  program_approved boolean not null default false, property_approved boolean not null default false,
  organic_allowed boolean, meta_allowed boolean, google_ads_allowed boolean,
  tracking_verified boolean not null default false, enabled boolean not null default false,
  verified_at timestamptz, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists product_feed_items (
  id uuid primary key default gen_random_uuid(), source_product_id text not null unique,
  model_name text, name text not null, description text, source_category text, brand text,
  tracking_url text, image_url text, in_stock boolean not null default false, availability text,
  valid_from timestamptz, valid_to timestamptz, on_sale boolean not null default false,
  currency text, price numeric, full_price numeric, discount numeric, demand_proxy numeric,
  size text, colour text, variations jsonb, observed_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists anonymous_sessions (id uuid primary key default gen_random_uuid(), anonymous_id text not null, created_at timestamptz not null default now(), last_seen_at timestamptz not null default now());
create table if not exists trip_requests (id uuid primary key default gen_random_uuid(), anonymous_session_id uuid references anonymous_sessions(id) on delete set null, origin text not null, month text not null, nights integer not null, budget numeric not null, moods jsonb not null, traveler_type text not null, refinement text, created_at timestamptz not null default now());
create table if not exists trip_recommendations (id uuid primary key default gen_random_uuid(), trip_request_id uuid not null references trip_requests(id) on delete cascade, destination_id text not null, position integer not null check(position between 1 and 3), fit_score numeric not null, confidence text not null, evidence_status text not null, payload jsonb not null, selected boolean not null default false, created_at timestamptz not null default now());
create table if not exists analytics_events (id bigint generated always as identity primary key, anonymous_id text, trip_request_id uuid references trip_requests(id) on delete set null, event_name text not null, payload jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now());

alter table affiliate_programs enable row level security;
alter table product_feed_items enable row level security;
alter table anonymous_sessions enable row level security;
alter table trip_requests enable row level security;
alter table trip_recommendations enable row level security;
alter table analytics_events enable row level security;
-- No browser policies in V1: server-side service-role access only, intentionally fail-closed.
