-- V23 — Locality-First Fuzzy Retrieval
-- Candidate discovery starts from dated, active accommodation LOCALITIES and their 24D semantic profiles.
-- Multiple properties in the same locality are collapsed before ranking.
-- Inventory COUNT is returned for observability only and MUST NOT be used as a ranking bonus.

create or replace function public.get_locality_profiles_v23(
  p_start_date date,
  p_end_date date
)
returns table(
  locality_id text,
  location_label text,
  latitude double precision,
  longitude double precision,
  semantic_vector text,
  profile_confidence real,
  eligible_offer_count bigint,
  canonical_slug text,
  canonical_distance_km double precision
)
language sql
stable
security definer
set search_path to 'public','extensions','pg_temp'
as $$
with eligible_localities as (
  select
    lower(trim(p.location_label)) as locality_key,
    avg(p.latitude)::double precision as latitude,
    avg(p.longitude)::double precision as longitude,
    count(distinct o.source_product_id)::bigint as eligible_offer_count
  from public.stay_places p
  join public.stay_offers o on o.place_id=p.id
  where o.tracking_url like 'https://go.linkwi.se/%/CD104/%'
    and o.in_stock is distinct from false
    and o.valid_from is not null
    and o.valid_from <= p_start_date::timestamptz
    and o.valid_to is not null
    and o.valid_to >= p_end_date::timestamptz
    and p.location_label is not null
    and trim(p.location_label)<>''
    and p.latitude is not null
    and p.longitude is not null
  group by lower(trim(p.location_label))
), profiled as (
  select
    dsp.destination_id as locality_id,
    dsp.location_label,
    el.latitude,
    el.longitude,
    dsp.semantic_vector::text as semantic_vector,
    dsp.profile_confidence,
    el.eligible_offer_count
  from eligible_localities el
  join public.destination_semantic_profiles dsp
    on lower(trim(dsp.location_label))=el.locality_key
  where dsp.semantic_vector is not null
), mapped as (
  select
    p.*,
    d.slug as canonical_slug,
    6371*acos(least(1.0,greatest(-1.0,
      cos(radians(d.latitude))*cos(radians(p.latitude))*cos(radians(p.longitude)-radians(d.longitude))+
      sin(radians(d.latitude))*sin(radians(p.latitude))
    ))) as canonical_distance_km,
    case when lower(trim(p.location_label))=any(array(select lower(trim(x)) from unnest(d.aliases||array[d.name_el,d.name_en]) x)) then 1 else 0 end as exact_alias
  from profiled p
  cross join public.destination_knowledge_v8 d
  where d.active and d.country_code='GR'
), assigned as (
  select m.*,
    row_number() over(
      partition by m.locality_id
      order by m.exact_alias desc,m.canonical_distance_km,m.canonical_slug
    ) as assignment_rank
  from mapped m
  where m.exact_alias=1 or m.canonical_distance_km<=65.0
)
select
  a.locality_id,
  a.location_label,
  a.latitude,
  a.longitude,
  a.semantic_vector,
  a.profile_confidence,
  a.eligible_offer_count,
  a.canonical_slug,
  a.canonical_distance_km
from assigned a
where a.assignment_rank=1
  and (a.exact_alias=1 or a.canonical_distance_km<=65.0)
order by a.location_label,a.canonical_slug;
$$;

revoke all on function public.get_locality_profiles_v23(date,date) from public,anon,authenticated;
grant execute on function public.get_locality_profiles_v23(date,date) to service_role;

-- V23 destination detail: preserve semantic hotel evidence so the final hotel order can use
-- the SAME formulated 24D intent that was used during locality discovery.
create or replace function public.get_destination_stays_v8(
  p_slug text,
  p_start_date date,
  p_end_date date,
  p_limit int default 18
)
returns table(
  source_product_id text, property_name text, city text, address text,
  distance_km double precision, description text, source_category text,
  program_id text, tracking_url text, image_url text, thumb_url text,
  in_stock boolean, availability text, valid_from timestamptz, valid_to timestamptz,
  currency text, price numeric, full_price numeric, discount numeric,
  demand_proxy numeric, semantic_vector text, semantic_confidence real, raw jsonb
)
language sql
security definer
set search_path=public,extensions,pg_temp
as $$
  with dest as (
    select * from public.destination_knowledge_v8
    where slug=p_slug and active
    limit 1
  ), parsed as (
    select s.*,
      case when coalesce(s.raw->>'latitude','')~'^-?[0-9]+(\.[0-9]+)?$' then (s.raw->>'latitude')::double precision end lat,
      case when coalesce(s.raw->>'longitude','')~'^-?[0-9]+(\.[0-9]+)?$' then (s.raw->>'longitude')::double precision end lon,
      case when lower(trim(coalesce(s.raw->>'city',''))) in ('','all','n/a','na','null','none','-','0') then null else trim(s.raw->>'city') end raw_city,
      case when lower(trim(coalesce(s.raw->>'address',''))) in ('','all','n/a','na','null','none','-','0') then null else trim(s.raw->>'address') end raw_address
    from public.stay_offers s
    where s.tracking_url like 'https://go.linkwi.se/%/CD104/%'
      and s.in_stock is distinct from false
      and s.valid_from is not null
      and s.valid_from <= p_start_date::timestamptz
      and s.valid_to is not null
      and s.valid_to >= p_end_date::timestamptz
      and (s.image_url is not null or s.thumb_url is not null)
  ), scored as (
    select p.*,d.hotel_radius_km,
      case when p.lat is not null and p.lon is not null then
        6371*acos(least(1.0,greatest(-1.0,
          cos(radians(d.latitude))*cos(radians(p.lat))*cos(radians(p.lon)-radians(d.longitude))+
          sin(radians(d.latitude))*sin(radians(p.lat))
        )))
      end km,
      d.aliases,d.name_el,d.name_en
    from parsed p cross join dest d
  )
  select s.source_product_id,s.property_name,
    coalesce(s.raw_city,s.raw_address,s.location_label),
    coalesce(s.raw_address,s.raw_city,s.location_label),s.km,s.description,s.source_category,
    s.program_id,s.tracking_url,s.image_url,s.thumb_url,s.in_stock,s.availability,s.valid_from,
    s.valid_to,s.currency,
    case when s.currency is not null and trim(s.currency)<>'' then s.price else null end,
    case when s.currency is not null and trim(s.currency)<>'' then s.full_price else null end,
    s.discount,s.demand_proxy,sp.semantic_vector::text,sp.profile_confidence,s.raw
  from scored s
  left join public.stay_semantic_profiles sp on sp.source_product_id=s.source_product_id
  where (s.km is not null and s.km<=s.hotel_radius_km)
     or lower(coalesce(s.raw_city,''))=any(array(select lower(x) from unnest(s.aliases||array[s.name_el,s.name_en]) x))
  order by coalesce(s.km,9999),coalesce(s.demand_proxy,0) desc,coalesce(s.discount,0) desc
  limit greatest(1,least(coalesce(p_limit,18),40));
$$;

revoke all on function public.get_destination_stays_v8(text,date,date,int) from public,anon,authenticated;
grant execute on function public.get_destination_stays_v8(text,date,date,int) to service_role;
