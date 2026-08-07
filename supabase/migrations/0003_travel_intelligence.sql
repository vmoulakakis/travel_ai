create table if not exists app_secrets (
  name text primary key,
  sha256 text not null,
  updated_at timestamptz not null default now()
);

create table if not exists destinations (
  id text primary key,
  name text not null,
  country text not null,
  region text not null check (region in ('domestic','near-europe','europe')),
  ideal_nights_min integer not null,
  ideal_nights_max integer not null,
  budget_low numeric not null,
  budget_high numeric not null,
  season jsonb not null default '{}'::jsonb,
  moods jsonb not null default '{}'::jsonb,
  traveler_fit jsonb not null default '{}'::jsonb,
  travel_effort numeric not null,
  warmth jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  evidence_status text not null default 'seed-estimate',
  evidence_note text not null default '',
  image_url text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists travel_evidence (
  id uuid primary key default gen_random_uuid(),
  destination_id text references destinations(id) on delete cascade,
  evidence_type text not null,
  source_name text not null,
  source_url text,
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  valid_until timestamptz,
  confidence numeric check(confidence between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists route_evidence (
  id uuid primary key default gen_random_uuid(),
  origin text not null,
  destination_id text references destinations(id) on delete cascade,
  mode text not null,
  operator_name text,
  duration_minutes integer,
  seasonal_months text[] not null default '{}',
  source_url text,
  observed_at timestamptz not null default now(),
  valid_until timestamptz,
  confidence numeric check(confidence between 0 and 1),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  file_name text,
  source text,
  status text not null default 'processing',
  row_count integer not null default 0,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0,
  diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists import_rows (
  id bigint generated always as identity primary key,
  import_job_id uuid not null references import_jobs(id) on delete cascade,
  row_number integer not null,
  payload jsonb not null,
  normalized jsonb,
  accepted boolean not null default false,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_travel_evidence_destination on travel_evidence(destination_id);
create index if not exists idx_route_evidence_origin_destination on route_evidence(origin,destination_id);
create index if not exists idx_import_rows_job on import_rows(import_job_id);
create index if not exists idx_destinations_enabled on destinations(enabled);

alter table app_secrets enable row level security;
alter table destinations enable row level security;
alter table travel_evidence enable row level security;
alter table route_evidence enable row level security;
alter table import_jobs enable row level security;
alter table import_rows enable row level security;

-- No browser policies: private operational tables remain fail-closed.
-- Public travel decision data is exposed only through the read-only Supabase Edge Function.

insert into destinations(id,name,country,region,ideal_nights_min,ideal_nights_max,budget_low,budget_high,season,moods,traveler_fit,travel_effort,warmth,tags,evidence_status,evidence_note,image_url) values
('rome','Rome','Italy','near-europe',3,5,360,720,'{"september":94,"october":96,"november":86}','{"relax":60,"romantic":91,"food":98,"warmth":72,"city":96,"nature":60,"adventure":60,"culture":98}','{"solo":88,"couple":96,"family":88,"friends":90}',88,'{"september":82,"october":70,"november":51}',array['food','culture','easy city break'],'seed-estimate','Planning seed; live route and fare evidence must be refreshed before booking claims.','https://images.unsplash.com/photo-1752886355870-17e8ebe79a05?auto=format&fit=crop&w=1600&q=85'),
('budapest','Budapest','Hungary','near-europe',3,4,260,540,'{"september":91,"october":90,"november":82}','{"relax":60,"romantic":88,"food":84,"warmth":60,"city":93,"nature":60,"adventure":60,"culture":88}','{"solo":90,"couple":94,"family":82,"friends":93}',86,'{"september":70,"october":53,"november":30}',array['value','city','romantic'],'seed-estimate','Budget and access are planning estimates, not live fare quotes.','https://images.unsplash.com/photo-1581195925906-f0121c1b1d6e?auto=format&fit=crop&w=1600&q=85'),
('malta','Malta','Malta','near-europe',3,5,360,680,'{"september":93,"october":95,"november":87}','{"relax":91,"romantic":87,"food":60,"warmth":98,"city":60,"nature":60,"adventure":74,"culture":78}','{"solo":82,"couple":94,"family":91,"friends":91}',78,'{"september":98,"october":95,"november":84}',array['warm','sea','shoulder season'],'seed-estimate','Climate fit is planning metadata; transport and prices require verification.',null),
('madrid','Madrid','Spain','europe',3,5,430,800,'{"september":91,"october":94,"november":90}','{"relax":60,"romantic":82,"food":94,"warmth":60,"city":98,"nature":60,"adventure":60,"culture":96}','{"solo":94,"couple":91,"family":86,"friends":95}',74,'{"september":88,"october":72,"november":55}',array['food','city','culture'],'seed-estimate','Seasonal profile is a seed; flight availability and prices are not asserted.',null),
('vienna','Vienna','Austria','near-europe',3,4,390,760,'{"september":90,"october":92,"november":88}','{"relax":60,"romantic":88,"food":81,"warmth":60,"city":94,"nature":60,"adventure":60,"culture":98}','{"solo":92,"couple":94,"family":92,"friends":82}',88,'{"september":66,"october":44,"november":25}',array['culture','elegant','easy city break'],'seed-estimate','Planning profile only; fare and schedule claims require current evidence.',null),
('istanbul','Istanbul','Türkiye','near-europe',3,5,300,650,'{"september":95,"october":94,"november":85}','{"relax":60,"romantic":82,"food":96,"warmth":60,"city":96,"nature":60,"adventure":80,"culture":98}','{"solo":86,"couple":92,"family":87,"friends":94}',91,'{"september":86,"october":70,"november":50}',array['food','culture','high variety'],'seed-estimate','Travel-fit seed only; current entry, route and fare evidence is required before purchase.',null),
('dubrovnik','Dubrovnik','Croatia','near-europe',3,4,420,760,'{"september":94,"october":78,"november":54}','{"relax":83,"romantic":96,"food":60,"warmth":73,"city":60,"nature":60,"adventure":60,"culture":91}','{"solo":76,"couple":98,"family":84,"friends":85}',72,'{"september":88,"october":66,"november":43}',array['romantic','old town','coast'],'stale','Seasonal route evidence must be revalidated.',null),
('prague','Prague','Czechia','near-europe',3,4,320,620,'{"september":91,"october":92,"november":87}','{"relax":60,"romantic":94,"food":82,"warmth":60,"city":92,"nature":60,"adventure":60,"culture":94}','{"solo":91,"couple":96,"family":86,"friends":92}',82,'{"september":62,"october":40,"november":20}',array['romantic','value','culture'],'seed-estimate','Planning seed only; route and price freshness must be established by evidence adapters.',null)
on conflict(id) do update set name=excluded.name,country=excluded.country,region=excluded.region,ideal_nights_min=excluded.ideal_nights_min,ideal_nights_max=excluded.ideal_nights_max,budget_low=excluded.budget_low,budget_high=excluded.budget_high,season=excluded.season,moods=excluded.moods,traveler_fit=excluded.traveler_fit,travel_effort=excluded.travel_effort,warmth=excluded.warmth,tags=excluded.tags,evidence_status=excluded.evidence_status,evidence_note=excluded.evidence_note,image_url=coalesce(excluded.image_url,destinations.image_url),updated_at=now();
