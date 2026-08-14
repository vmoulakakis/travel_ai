-- V21 — Choice Correctness
-- Retrieve dated stay evidence globally, then map each offer to exactly one canonical Greek destination.
-- The RPC is service-role only. Offer/property count is never used as a destination ranking bonus.

create or replace function public.get_global_stays_v21(
  p_start_date date,
  p_end_date date,
  p_per_destination integer default 40
)
returns table(
  destination_slug text,
  source_product_id text,
  property_name text,
  city text,
  address text,
  distance_km double precision,
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
  currency text,
  price numeric,
  full_price numeric,
  discount numeric,
  demand_proxy numeric,
  semantic_vector text,
  semantic_confidence real,
  raw jsonb
)
language sql
stable
security definer
set search_path to 'public','extensions','pg_temp'
as $$
with parsed as (
  select s.*,
    case when coalesce(s.raw->>'latitude','') ~ '^-?[0-9]+(\.[0-9]+)?$' then (s.raw->>'latitude')::double precision end as lat,
    case when coalesce(s.raw->>'longitude','') ~ '^-?[0-9]+(\.[0-9]+)?$' then (s.raw->>'longitude')::double precision end as lon,
    case when lower(trim(coalesce(s.raw->>'city',''))) in ('','all','n/a','na','null','none','-','0') then null else trim(s.raw->>'city') end as raw_city,
    case when lower(trim(coalesce(s.raw->>'address',''))) in ('','all','n/a','na','null','none','-','0') then null else trim(s.raw->>'address') end as raw_address
  from public.stay_offers s
  where s.tracking_url like 'https://go.linkwi.se/%/CD104/%'
    and s.in_stock is distinct from false
    and s.valid_from is not null
    and s.valid_from <= p_start_date::timestamptz
    and s.valid_to is not null
    and s.valid_to >= p_end_date::timestamptz
), matches as (
  select p.*,d.slug as canonical_slug,d.hotel_radius_km,
    case when p.lat is not null and p.lon is not null then
      6371*acos(least(1.0,greatest(-1.0,
        cos(radians(d.latitude))*cos(radians(p.lat))*cos(radians(p.lon)-radians(d.longitude))+
        sin(radians(d.latitude))*sin(radians(p.lat))
      )))
    end as km,
    case when lower(coalesce(p.raw_city,p.location_label,''))=any(array(select lower(x) from unnest(d.aliases||array[d.name_el,d.name_en]) x)) then 1 else 0 end as exact_alias
  from parsed p
  cross join public.destination_knowledge_v8 d
  where d.active and d.country_code='GR'
), assigned as (
  select m.*,
    row_number() over(partition by m.source_product_id order by m.exact_alias desc,m.km nulls last,m.canonical_slug) as assignment_rank
  from matches m
  where m.exact_alias=1 or (m.km is not null and m.km<=m.hotel_radius_km)
), enriched as (
  select a.*,sp.semantic_vector::text as stay_vector,sp.profile_confidence as stay_confidence,
    row_number() over(partition by a.canonical_slug order by coalesce(a.km,9999),coalesce(a.demand_proxy,0) desc,coalesce(a.discount,0) desc,a.source_product_id) as destination_rank
  from assigned a
  left join public.stay_semantic_profiles sp on sp.source_product_id=a.source_product_id
  where a.assignment_rank=1
)
select
  canonical_slug,
  source_product_id,
  property_name,
  coalesce(raw_city,raw_address,location_label),
  coalesce(raw_address,raw_city,location_label),
  km,
  description,
  source_category,
  program_id,
  tracking_url,
  image_url,
  thumb_url,
  in_stock,
  availability,
  valid_from,
  valid_to,
  currency,
  case when currency is not null and trim(currency)<>'' then price else null end,
  case when currency is not null and trim(currency)<>'' then full_price else null end,
  discount,
  demand_proxy,
  stay_vector,
  stay_confidence,
  jsonb_strip_nulls(jsonb_build_object(
    'latitude',lat,'longitude',lon,
    'details',raw->>'details','product_name',raw->>'product_name','extra_title',raw->>'extra_title','type',raw->>'type'
  ))
from enriched
where destination_rank<=greatest(1,least(coalesce(p_per_destination,40),60))
order by canonical_slug,destination_rank;
$$;

revoke all on function public.get_global_stays_v21(date,date,integer) from public,anon,authenticated;
grant execute on function public.get_global_stays_v21(date,date,integer) to service_role;
