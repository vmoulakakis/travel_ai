-- Travel Guru V8: destination intelligence is independent of affiliate inventory.
create table if not exists public.destination_knowledge_v8 (
  slug text primary key,name_el text not null,name_en text not null,country_code text not null,country_el text not null,country_en text not null,
  latitude double precision not null,longitude double precision not null,region_group text not null,aliases text[] not null default '{}',tags text[] not null default '{}',
  semantic_vector extensions.vector(16) not null,month_fit smallint[] not null check(array_length(month_fit,1)=12),ideal_nights_min smallint not null default 2,ideal_nights_max smallint not null default 4,
  cost_tier smallint not null check(cost_tier between 1 and 5),effort_athens text not null,effort_thessaloniki text not null,direct_from_athens boolean not null default false,
  route_confidence real not null default .6 check(route_confidence between 0 and 1),traveler_fit jsonb not null default '{"solo":0.8,"couple":0.8,"family":0.7,"friends":0.7}'::jsonb,
  crowd_level smallint not null default 3 check(crowd_level between 1 and 5),hotel_radius_km smallint not null default 35,knowledge_source text not null default 'curated-v8',season_profile text not null default 'city_cont',active boolean not null default true,updated_at timestamptz not null default now()
);
alter table public.destination_knowledge_v8 enable row level security;
create index if not exists idx_destination_knowledge_v8_semantic on public.destination_knowledge_v8 using hnsw (semantic_vector extensions.vector_cosine_ops);
create index if not exists idx_destination_knowledge_v8_country on public.destination_knowledge_v8(country_code,active);
create index if not exists idx_destination_knowledge_v8_tags on public.destination_knowledge_v8 using gin(tags);

create or replace function public.v8_semantic_from_tags(p_tags text[])
returns extensions.vector(16) language sql immutable set search_path=public,extensions,pg_temp as $$
select array[
 case when 'romantic'=any(p_tags) then 1 else .05 end,case when 'relax'=any(p_tags) then 1 else .05 end,case when 'food'=any(p_tags) then 1 else .05 end,case when 'culture'=any(p_tags) then 1 else .05 end,
 case when 'city'=any(p_tags) then 1 else .05 end,case when 'nature'=any(p_tags) then 1 else .05 end,case when 'beach'=any(p_tags) then 1 else .05 end,case when 'adventure'=any(p_tags) then 1 else .05 end,
 case when 'nightlife'=any(p_tags) then 1 else .05 end,case when 'family'=any(p_tags) then 1 else .05 end,case when 'luxury'=any(p_tags) then 1 else .05 end,case when 'value'=any(p_tags) then 1 else .05 end,
 case when 'warmth'=any(p_tags) then 1 else .05 end,case when 'wellness'=any(p_tags) then 1 else .05 end,case when 'short_break'=any(p_tags) then 1 else .05 end,case when 'shoulder_season'=any(p_tags) then 1 else .05 end
]::extensions.vector;
$$;

create or replace function public.v8_month_profile(p text)
returns smallint[] language sql immutable as $$
select case p
 when 'city_med' then array[80,82,90,94,90,75,60,58,88,96,92,84]::smallint[]
 when 'city_cont' then array[70,72,88,94,96,88,78,78,96,96,88,76]::smallint[]
 when 'city_north' then array[65,68,86,94,98,90,80,80,96,96,86,70]::smallint[]
 when 'summer_island' then array[25,30,45,65,85,98,100,100,96,72,42,30]::smallint[]
 when 'shoulder_island' then array[35,40,60,80,92,98,100,100,96,85,55,40]::smallint[]
 when 'mountain' then array[92,92,88,75,65,55,45,45,65,82,90,95]::smallint[]
 when 'nature_all' then array[70,72,85,95,98,90,82,82,96,96,88,76]::smallint[]
 when 'warm_winter' then array[88,90,94,94,88,75,65,65,82,94,94,90]::smallint[]
 when 'coast_city' then array[55,60,80,92,96,98,100,100,96,90,70,55]::smallint[]
 else array[70,72,88,94,96,88,78,78,96,96,88,76]::smallint[] end;
$$;

create or replace function public.get_destination_catalog_v8()
returns table(slug text,name_el text,name_en text,country_code text,country_el text,country_en text,latitude double precision,longitude double precision,region_group text,aliases text[],tags text[],semantic_vector text,month_fit smallint[],ideal_nights_min smallint,ideal_nights_max smallint,cost_tier smallint,effort_athens text,effort_thessaloniki text,direct_from_athens boolean,route_confidence real,traveler_fit jsonb,crowd_level smallint,hotel_radius_km smallint,knowledge_source text,season_profile text)
language sql security definer set search_path=public,extensions,pg_temp as $$
 select d.slug,d.name_el,d.name_en,d.country_code,d.country_el,d.country_en,d.latitude,d.longitude,d.region_group,d.aliases,d.tags,d.semantic_vector::text,d.month_fit,d.ideal_nights_min,d.ideal_nights_max,d.cost_tier,d.effort_athens,d.effort_thessaloniki,d.direct_from_athens,d.route_confidence,d.traveler_fit,d.crowd_level,d.hotel_radius_km,d.knowledge_source,d.season_profile from public.destination_knowledge_v8 d where d.active order by d.country_code,d.name_en;
$$;
revoke all on function public.get_destination_catalog_v8() from public,anon,authenticated;
grant execute on function public.get_destination_catalog_v8() to service_role;

create or replace function public.get_destination_stays_v8(p_slug text,p_start_date date,p_end_date date,p_limit int default 18)
returns table(source_product_id text,property_name text,city text,address text,distance_km double precision,description text,source_category text,program_id text,tracking_url text,image_url text,thumb_url text,in_stock boolean,availability text,valid_from timestamptz,valid_to timestamptz,currency text,price numeric,full_price numeric,discount numeric,demand_proxy numeric,raw jsonb)
language sql security definer set search_path=public,extensions,pg_temp as $$
 with dest as (select * from public.destination_knowledge_v8 where slug=p_slug and active limit 1),parsed as (
  select s.*,case when coalesce(s.raw->>'latitude','')~'^-?[0-9]+(\.[0-9]+)?$' then (s.raw->>'latitude')::double precision end lat,case when coalesce(s.raw->>'longitude','')~'^-?[0-9]+(\.[0-9]+)?$' then (s.raw->>'longitude')::double precision end lon,
   case when lower(trim(coalesce(s.raw->>'city',''))) in ('','all','n/a','na','null','none','-','0') then null else trim(s.raw->>'city') end raw_city,
   case when lower(trim(coalesce(s.raw->>'address',''))) in ('','all','n/a','na','null','none','-','0') then null else trim(s.raw->>'address') end raw_address
  from public.stay_offers s where s.tracking_url like 'https://go.linkwi.se/%' and s.in_stock is distinct from false and (s.valid_from is null or s.valid_from<(p_end_date+1)::timestamptz) and (s.valid_to is null or s.valid_to>=p_start_date::timestamptz)
 ),scored as (
  select p.*,d.hotel_radius_km,case when p.lat is not null and p.lon is not null then 6371*acos(least(1.0,greatest(-1.0,cos(radians(d.latitude))*cos(radians(p.lat))*cos(radians(p.lon)-radians(d.longitude))+sin(radians(d.latitude))*sin(radians(p.lat))))) end km,d.aliases,d.name_el,d.name_en from parsed p cross join dest d
 )
 select source_product_id,property_name,coalesce(raw_city,raw_address,location_label),coalesce(raw_address,raw_city,location_label),km,description,source_category,program_id,tracking_url,image_url,thumb_url,in_stock,availability,valid_from,valid_to,currency,
  case when currency is not null and trim(currency)<>'' then price else null end,case when currency is not null and trim(currency)<>'' then full_price else null end,discount,demand_proxy,raw
 from scored where (km is not null and km<=hotel_radius_km) or lower(coalesce(raw_city,''))=any(array(select lower(x) from unnest(aliases||array[name_el,name_en]) x))
 order by coalesce(km,9999),coalesce(demand_proxy,0) desc,coalesce(discount,0) desc limit greatest(1,least(coalesce(p_limit,18),40));
$$;
revoke all on function public.get_destination_stays_v8(text,date,date,int) from public,anon,authenticated;
grant execute on function public.get_destination_stays_v8(text,date,date,int) to service_role;

insert into public.matching_model_versions(model_version,architecture,weights,sample_count,active)
values('v8-destination-ranker','{"input":12,"hidden":8,"output":1,"activation":"tanh","learning":"gated_after_500_labels"}'::jsonb,'{"blend_max":0.15,"min_samples":500,"min_validation_score":0.75}'::jsonb,0,false)
on conflict(model_version) do update set architecture=excluded.architecture;

create or replace view public.v8_match_training_examples as
select ms.id session_id,ms.feature_vector,mo.pair_features,mo.destination_id,mo.source_product_id,mo.travel_month,sum(mo.reward) reward,max(mo.created_at) last_outcome_at
from public.match_sessions ms join public.match_outcomes mo on mo.session_id=ms.id where ms.model_version='v8-destination-ranker' and mo.pair_features is not null
group by ms.id,ms.feature_vector,mo.pair_features,mo.destination_id,mo.source_product_id,mo.travel_month;
