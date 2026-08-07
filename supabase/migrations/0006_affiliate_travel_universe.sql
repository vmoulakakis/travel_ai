create index if not exists idx_stay_offers_location_validity on public.stay_offers(location_label, valid_from, valid_to);
create index if not exists idx_stay_offers_location_demand on public.stay_offers(location_label, demand_proxy desc nulls last);
create index if not exists idx_stay_offers_location_price on public.stay_offers(location_label, price nulls last);

create or replace function public.get_affiliate_travel_candidates(
  p_start timestamptz,
  p_end timestamptz,
  p_limit integer default 120
)
returns table(
  destination_id text,
  location_label text,
  country_hint text,
  centroid_latitude double precision,
  centroid_longitude double precision,
  property_count bigint,
  active_offer_count bigint,
  min_price numeric,
  median_price numeric,
  max_price numeric,
  currency text,
  demand_score numeric,
  sale_offer_count bigint,
  max_discount numeric,
  avg_discount numeric,
  hero_image_url text,
  valid_to_max timestamptz,
  semantic_text text,
  top_offers jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with eligible as (
  select o.*
  from public.stay_offers o
  where o.tracking_url is not null
    and o.tracking_url <> ''
    and (o.valid_from is null or o.valid_from <= p_end)
    and (o.valid_to is null or o.valid_to >= p_start)
    and o.in_stock is distinct from false
), grouped as (
  select
    md5(lower(e.location_label)) as destination_id,
    e.location_label,
    max(p.country_hint) filter (where p.country_hint is not null) as country_hint,
    avg(p.latitude) as centroid_latitude,
    avg(p.longitude) as centroid_longitude,
    count(distinct e.place_id) as property_count,
    count(*) as active_offer_count,
    min(e.price) as min_price,
    percentile_cont(0.5) within group(order by e.price) filter(where e.price is not null) as median_price,
    max(e.price) as max_price,
    case when count(distinct e.currency) filter(where e.currency is not null)=1 then max(e.currency) filter(where e.currency is not null) else null end as currency,
    coalesce(sum(e.demand_proxy),0) as demand_score,
    count(*) filter(where e.on_sale is true or coalesce(e.discount,0)>0) as sale_offer_count,
    max(e.discount) as max_discount,
    avg(e.discount) filter(where e.discount is not null) as avg_discount,
    coalesce(max(e.image_url) filter(where e.image_url is not null), max(p.hero_image_url) filter(where p.hero_image_url is not null)) as hero_image_url,
    max(e.valid_to) as valid_to_max,
    left(string_agg(distinct concat_ws(' ',e.property_name,e.description,e.source_category), ' · '),6000) as semantic_text
  from eligible e
  left join public.stay_places p on p.id=e.place_id
  where e.location_label is not null and trim(e.location_label)<>''
  group by e.location_label
), ranked as (
  select g.*,
    (select jsonb_agg(to_jsonb(x) order by x.demand_proxy desc nulls last, x.discount desc nulls last, x.price asc nulls last)
     from (
       select e.source_product_id,e.place_id,e.property_name,e.description,e.source_category,e.program_id,
              e.tracking_url,e.image_url,e.thumb_url,e.availability,e.valid_from,e.valid_to,e.on_sale,
              e.currency,e.price,e.full_price,e.discount,e.demand_proxy,
              e.raw->>'model_name' as model_name,e.raw->>'brand_name' as brand_name,
              e.raw->'custom' as custom,e.raw->'extra_images' as extra_images,e.raw->'variations' as variations
       from eligible e
       where e.location_label=g.location_label
       order by coalesce(e.demand_proxy,0) desc, coalesce(e.discount,0) desc, e.price asc nulls last
       limit 5
     ) x) as top_offers
  from grouped g
)
select r.*
from ranked r
order by r.active_offer_count desc, r.demand_score desc, r.min_price asc nulls last
limit greatest(3,least(coalesce(p_limit,120),250));
$$;

revoke all on function public.get_affiliate_travel_candidates(timestamptz,timestamptz,integer) from public, anon, authenticated;
grant execute on function public.get_affiliate_travel_candidates(timestamptz,timestamptz,integer) to service_role;
