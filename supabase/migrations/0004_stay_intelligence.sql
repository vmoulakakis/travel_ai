-- Travel AI V3: Linkwise categories 89/99/109 are treated as stay-supply evidence,
-- never as destination ranking truth.

create extension if not exists http with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists postgis with schema extensions;

create table if not exists public.stay_places (
  id text primary key,
  property_name text not null,
  location_label text,
  address text,
  city_raw text,
  country_hint text,
  latitude double precision not null,
  longitude double precision not null,
  geom extensions.geography(point,4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude),4326)::extensions.geography
  ) stored,
  category text,
  hero_image_url text,
  offer_count integer not null default 0,
  min_price numeric,
  max_price numeric,
  currency text,
  demand_score numeric not null default 0,
  valid_to_max timestamptz,
  observed_at timestamptz not null default now(),
  raw_names text[] not null default '{}',
  semantic_text text,
  embedding extensions.vector,
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(property_name,'') || ' ' || coalesce(location_label,'') || ' ' || coalesce(address,''))
  ) stored,
  updated_at timestamptz not null default now()
);

create table if not exists public.stay_offers (
  source_product_id text primary key,
  place_id text not null references public.stay_places(id) on delete cascade,
  property_name text not null,
  location_label text,
  description text,
  source_category text,
  program_id text,
  tracking_url text,
  image_url text,
  thumb_url text,
  in_stock boolean,
  availability text,
  valid_from timestamptz,
  valid_to timestamptz,
  on_sale boolean,
  currency text,
  price numeric,
  full_price numeric,
  discount numeric,
  demand_proxy numeric,
  raw jsonb not null default '{}',
  observed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.destination_supply_signals (
  id text primary key,
  location_label text not null unique,
  country_hint text,
  centroid_latitude double precision,
  centroid_longitude double precision,
  property_count integer not null default 0,
  offer_count integer not null default 0,
  min_price numeric,
  median_price numeric,
  max_price numeric,
  currency text,
  demand_score numeric not null default 0,
  hero_image_url text,
  valid_to_max timestamptz,
  observed_at timestamptz not null default now(),
  semantic_text text,
  embedding extensions.vector,
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_url text not null,
  status text not null default 'processing',
  fetched_items integer not null default 0,
  accepted_offers integer not null default 0,
  place_count integer not null default 0,
  location_count integer not null default 0,
  diagnostics jsonb not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.stay_places enable row level security;
alter table public.stay_offers enable row level security;
alter table public.destination_supply_signals enable row level security;
alter table public.feed_ingestion_runs enable row level security;

create index if not exists idx_stay_places_geom on public.stay_places using gist (geom);
create index if not exists idx_stay_places_search on public.stay_places using gin (search_document);
create index if not exists idx_stay_places_location_trgm on public.stay_places using gin (lower(coalesce(location_label,'')) extensions.gin_trgm_ops);
create index if not exists idx_stay_offers_place on public.stay_offers(place_id);
create index if not exists idx_stay_offers_valid_to on public.stay_offers(valid_to);
create index if not exists idx_supply_location_trgm on public.destination_supply_signals using gin (lower(location_label) extensions.gin_trgm_ops);

alter table public.destinations add column if not exists supply_terms text[] not null default '{}';

insert into public.destinations(
  id,name,country,region,ideal_nights_min,ideal_nights_max,budget_low,budget_high,
  season,moods,traveler_fit,travel_effort,warmth,tags,evidence_status,evidence_note,
  image_url,enabled,supply_terms,updated_at
) values
('nafplio','Nafplio','Greece','domestic',2,3,180,480,
 '{"september":78,"october":72,"november":62}',
 '{"relax":86,"romantic":92,"food":78,"warmth":68,"city":66,"nature":72,"adventure":54,"culture":90}',
 '{"solo":82,"couple":96,"family":88,"friends":80}',88,
 '{"september":76,"october":68,"november":58}',
 array['domestic','romantic','culture','lower-effort','stay-supply'],'seed-estimate',
 'Stay supply and price signals are feed-observed; season/intent scores are planning heuristics and must not be presented as live facts.',
 'https://images.unsplash.com/photo-1686757067325-354ae88b3988?auto=format&fit=crop&w=1800&q=88',true,array['Ναύπλιο'],now()),
('arachova','Arachova','Greece','domestic',2,3,170,500,
 '{"september":58,"october":72,"november":88}',
 '{"relax":82,"romantic":88,"food":76,"warmth":38,"city":42,"nature":90,"adventure":72,"culture":64}',
 '{"solo":76,"couple":94,"family":84,"friends":90}',92,
 '{"september":58,"october":46,"november":32}',
 array['domestic','mountain','romantic','lower-effort','stay-supply'],'seed-estimate',
 'Stay supply and price signals are feed-observed; season/intent scores are planning heuristics and must not be presented as live facts.',
 null,true,array['Αράχωβα'],now()),
('thessaloniki','Thessaloniki','Greece','domestic',2,4,190,520,
 '{"september":84,"october":82,"november":72}',
 '{"relax":68,"romantic":76,"food":94,"warmth":60,"city":94,"nature":52,"adventure":60,"culture":88}',
 '{"solo":94,"couple":88,"family":80,"friends":96}',78,
 '{"september":78,"october":64,"november":48}',
 array['domestic','food','city','culture','stay-supply'],'seed-estimate',
 'Stay supply and price signals are feed-observed; season/intent scores are planning heuristics and must not be presented as live facts.',
 null,true,array['Θεσσαλονίκη'],now()),
('kalamata','Kalamata','Greece','domestic',2,4,200,560,
 '{"september":90,"october":82,"november":70}',
 '{"relax":88,"romantic":84,"food":88,"warmth":76,"city":62,"nature":84,"adventure":68,"culture":72}',
 '{"solo":82,"couple":92,"family":90,"friends":86}',84,
 '{"september":86,"october":76,"november":64}',
 array['domestic','food','coast','relax','stay-supply'],'seed-estimate',
 'Stay supply and price signals are feed-observed; season/intent scores are planning heuristics and must not be presented as live facts.',
 null,true,array['Καλαμάτα'],now()),
('corfu','Corfu','Greece','domestic',3,5,260,720,
 '{"september":92,"october":78,"november":56}',
 '{"relax":92,"romantic":94,"food":82,"warmth":78,"city":58,"nature":92,"adventure":68,"culture":80}',
 '{"solo":80,"couple":96,"family":90,"friends":88}',66,
 '{"september":88,"october":74,"november":58}',
 array['domestic','island','romantic','nature','stay-supply'],'seed-estimate',
 'Stay supply and price signals are feed-observed; season/intent scores are planning heuristics and must not be presented as live facts.',
 null,true,array['Κέρκυρα'],now()),
('rhodes','Rhodes','Greece','domestic',3,5,250,680,
 '{"september":96,"october":90,"november":72}',
 '{"relax":90,"romantic":90,"food":80,"warmth":94,"city":64,"nature":84,"adventure":72,"culture":88}',
 '{"solo":84,"couple":94,"family":92,"friends":90}',64,
 '{"september":95,"october":90,"november":78}',
 array['domestic','island','warmth','culture','stay-supply'],'seed-estimate',
 'Stay supply and price signals are feed-observed; season/intent scores are planning heuristics and must not be presented as live facts.',
 null,true,array['Ρόδος'],now())
on conflict(id) do update set
 name=excluded.name,country=excluded.country,region=excluded.region,
 ideal_nights_min=excluded.ideal_nights_min,ideal_nights_max=excluded.ideal_nights_max,
 budget_low=excluded.budget_low,budget_high=excluded.budget_high,season=excluded.season,
 moods=excluded.moods,traveler_fit=excluded.traveler_fit,travel_effort=excluded.travel_effort,
 warmth=excluded.warmth,tags=excluded.tags,evidence_status=excluded.evidence_status,
 evidence_note=excluded.evidence_note,image_url=coalesce(excluded.image_url,public.destinations.image_url),
 enabled=true,supply_terms=excluded.supply_terms,updated_at=now();
