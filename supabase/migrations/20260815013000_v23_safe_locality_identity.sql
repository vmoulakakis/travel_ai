-- V23.1 — Locality identity is primary; canonical destination is optional enrichment.
-- Never force an island/city locality into a canonical destination merely by wide haversine distance.

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
    and p.location_label is not null and trim(p.location_label)<>''
    and p.latitude is not null and p.longitude is not null
  group by lower(trim(p.location_label))
), profiled as (
  select dsp.destination_id as locality_id,dsp.location_label,el.latitude,el.longitude,
         dsp.semantic_vector::text as semantic_vector,dsp.profile_confidence,el.eligible_offer_count
  from eligible_localities el
  join public.destination_semantic_profiles dsp on lower(trim(dsp.location_label))=el.locality_key
  where dsp.semantic_vector is not null
)
select p.locality_id,p.location_label,p.latitude,p.longitude,p.semantic_vector,p.profile_confidence,p.eligible_offer_count,
       parent.slug as canonical_slug,parent.km as canonical_distance_km
from profiled p
left join lateral (
  select d.slug,
    6371*acos(least(1.0,greatest(-1.0,
      cos(radians(d.latitude))*cos(radians(p.latitude))*cos(radians(p.longitude)-radians(d.longitude))+
      sin(radians(d.latitude))*sin(radians(p.latitude))
    ))) as km,
    exists(
      select 1 from unnest(d.aliases||array[d.name_el,d.name_en]) a
      where length(trim(a))>=4
        and (lower(p.location_label) like '%'||lower(trim(a))||'%'
          or lower(trim(a)) like '%'||lower(p.location_label)||'%')
    ) as text_identity
  from public.destination_knowledge_v8 d
  where d.active and d.country_code='GR'
  order by text_identity desc,km,d.slug
  limit 1
) parent on parent.text_identity or parent.km<=12.0
order by p.location_label;
$$;

revoke all on function public.get_locality_profiles_v23(date,date) from public,anon,authenticated;
grant execute on function public.get_locality_profiles_v23(date,date) to service_role;

create or replace function public.get_locality_stays_v23(
  p_locality_id text,
  p_start_date date,
  p_end_date date,
  p_limit int default 18
)
returns table(
  source_product_id text, property_name text, location_label text,
  latitude double precision, longitude double precision,
  description text, source_category text, program_id text, tracking_url text,
  image_url text, thumb_url text, in_stock boolean, availability text,
  valid_from timestamptz, valid_to timestamptz,currency text,price numeric,full_price numeric,
  discount numeric,demand_proxy numeric,semantic_vector text,semantic_confidence real,raw jsonb
)
language sql
stable
security definer
set search_path=public,extensions,pg_temp
as $$
with locality as (
  select destination_id,lower(trim(location_label)) locality_key
  from public.destination_semantic_profiles
  where destination_id=p_locality_id
  limit 1
), places as (
  select p.* from public.stay_places p cross join locality l
  where lower(trim(p.location_label))=l.locality_key
)
select o.source_product_id,o.property_name,p.location_label,p.latitude,p.longitude,
       o.description,o.source_category,o.program_id,o.tracking_url,o.image_url,o.thumb_url,
       o.in_stock,o.availability,o.valid_from,o.valid_to,o.currency,o.price,o.full_price,o.discount,
       o.demand_proxy,sp.semantic_vector::text,sp.profile_confidence,o.raw
from places p
join public.stay_offers o on o.place_id=p.id
left join public.stay_semantic_profiles sp on sp.source_product_id=o.source_product_id
where o.tracking_url like 'https://go.linkwi.se/%/CD104/%'
  and o.in_stock is distinct from false
  and o.valid_from is not null and o.valid_from<=p_start_date::timestamptz
  and o.valid_to is not null and o.valid_to>=p_end_date::timestamptz
order by coalesce(o.demand_proxy,0) desc,coalesce(o.discount,0) desc,o.property_name
limit greatest(1,least(coalesce(p_limit,18),40));
$$;

revoke all on function public.get_locality_stays_v23(text,date,date,int) from public,anon,authenticated;
grant execute on function public.get_locality_stays_v23(text,date,date,int) to service_role;
