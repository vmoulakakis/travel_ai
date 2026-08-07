-- Travel Guru V5: feed-backed star evidence, five-choice destination signals,
-- and a destination detail funnel with up to 5 verified 5-star offers plus alternatives.

create or replace function public.offer_star_level(p_name text, p_description text default null)
returns integer
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when coalesce(p_name,'') ~* '(^|[^0-9])5\s*\*' or coalesce(p_name,'') ~* '5\s*star' or coalesce(p_description,'') ~* '5\s*star' then 5
    when coalesce(p_name,'') ~* '(^|[^0-9])4\s*\*' or coalesce(p_name,'') ~* '4\s*star' then 4
    when coalesce(p_name,'') ~* '(^|[^0-9])3\s*\*' or coalesce(p_name,'') ~* '3\s*star' then 3
    when coalesce(p_name,'') ~* '(^|[^0-9])2\s*\*' or coalesce(p_name,'') ~* '2\s*star' then 2
    else null
  end
$$;

create or replace function public.get_affiliate_travel_candidates_v2(
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
  five_star_offer_count bigint,
  alternative_offer_count bigint,
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
  select o.*, public.offer_star_level(o.property_name,o.description) as star_level
  from public.stay_offers o
  where o.tracking_url like 'https://go.linkwi.se/%'
    and (o.valid_from is null or o.valid_from <= p_end)
    and (o.valid_to is null or o.valid_to >= p_start)
    and o.in_stock is distinct from false
), grouped as (
  select md5(lower(e.location_label)) as destination_id,e.location_label,
    max(p.country_hint) filter(where p.country_hint is not null) as country_hint,
    avg(p.latitude) as centroid_latitude,avg(p.longitude) as centroid_longitude,
    count(distinct e.place_id) as property_count,count(*) as active_offer_count,
    count(*) filter(where e.star_level=5) as five_star_offer_count,
    count(*) filter(where coalesce(e.star_level,0)<5) as alternative_offer_count,
    min(e.price) as min_price,
    percentile_cont(0.5) within group(order by e.price) filter(where e.price is not null) as median_price,
    max(e.price) as max_price,
    case when count(distinct e.currency) filter(where e.currency is not null)=1 then max(e.currency) filter(where e.currency is not null) else null end as currency,
    coalesce(sum(e.demand_proxy),0) as demand_score,
    count(*) filter(where e.on_sale is true or coalesce(e.discount,0)>0) as sale_offer_count,
    max(e.discount) as max_discount,
    avg(e.discount) filter(where e.discount is not null) as avg_discount,
    coalesce(max(e.image_url) filter(where e.image_url is not null),max(p.hero_image_url) filter(where p.hero_image_url is not null)) as hero_image_url,
    max(e.valid_to) as valid_to_max,
    left(string_agg(distinct concat_ws(' ',e.property_name,e.description,e.source_category),' · '),6000) as semantic_text
  from eligible e
  left join public.stay_places p on p.id=e.place_id
  where e.location_label is not null and trim(e.location_label)<>''
  group by e.location_label
), ranked as (
  select g.*,
    (select jsonb_agg(to_jsonb(x) order by x.demand_proxy desc nulls last,x.discount desc nulls last,x.price desc nulls last)
     from (
       select e.source_product_id,e.place_id,e.property_name,e.description,e.source_category,e.program_id,e.tracking_url,
              e.image_url,e.thumb_url,e.availability,e.valid_from,e.valid_to,e.on_sale,e.currency,e.price,e.full_price,
              e.discount,e.demand_proxy,e.star_level,e.raw->>'model_name' as model_name,e.raw->>'brand_name' as brand_name,
              e.raw->'custom' as custom,e.raw->'extra_images' as extra_images,e.raw->'variations' as variations
       from eligible e
       where e.location_label=g.location_label
       order by coalesce(e.demand_proxy,0) desc,coalesce(e.discount,0) desc,e.price desc nulls last
       limit 10
     ) x) as top_offers
  from grouped g
)
select r.*
from ranked r
order by r.five_star_offer_count desc,r.active_offer_count desc,r.demand_score desc
limit greatest(5,least(coalesce(p_limit,120),250));
$$;

revoke all on function public.get_affiliate_travel_candidates_v2(timestamptz,timestamptz,integer) from public, anon, authenticated;
grant execute on function public.get_affiliate_travel_candidates_v2(timestamptz,timestamptz,integer) to service_role;

create or replace function public.get_affiliate_destination_detail(
  p_destination_id text,
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with label as (
  select location_label
  from public.destination_supply_signals
  where md5(lower(location_label))=p_destination_id
  limit 1
), eligible as (
  select o.*, public.offer_star_level(o.property_name,o.description) as star_level
  from public.stay_offers o
  join label l on l.location_label=o.location_label
  where o.tracking_url like 'https://go.linkwi.se/%'
    and (o.valid_from is null or o.valid_from <= p_end)
    and (o.valid_to is null or o.valid_to >= p_start)
    and o.in_stock is distinct from false
), premium as (
  select *
  from eligible
  where star_level=5
  order by price desc nulls last,demand_proxy desc nulls last,discount desc nulls last
  limit 5
), alternatives as (
  select *
  from eligible
  where coalesce(star_level,0)<5
  order by price desc nulls last,demand_proxy desc nulls last,discount desc nulls last
  limit 15
), premium_fill as (
  select *
  from alternatives
  where (select count(*) from premium)<5
  order by price desc nulls last,demand_proxy desc nulls last
  limit greatest(0,5-(select count(*) from premium))
), destination as (
  select s.*
  from public.destination_supply_signals s
  join label l using(location_label)
  limit 1
)
select jsonb_build_object(
  'destination_id',p_destination_id,
  'destination',(select to_jsonb(d) from destination d),
  'premium_offers',coalesce((select jsonb_agg(to_jsonb(x) order by x.price desc nulls last) from (select source_product_id,property_name,description,source_category,program_id,tracking_url,image_url,thumb_url,availability,valid_from,valid_to,currency,price,full_price,discount,demand_proxy,star_level from premium) x),'[]'::jsonb),
  'premium_fill',coalesce((select jsonb_agg(to_jsonb(x) order by x.price desc nulls last) from (select source_product_id,property_name,description,source_category,program_id,tracking_url,image_url,thumb_url,availability,valid_from,valid_to,currency,price,full_price,discount,demand_proxy,star_level from premium_fill) x),'[]'::jsonb),
  'alternatives',coalesce((select jsonb_agg(to_jsonb(x) order by x.price desc nulls last) from (select source_product_id,property_name,description,source_category,program_id,tracking_url,image_url,thumb_url,availability,valid_from,valid_to,currency,price,full_price,discount,demand_proxy,star_level from alternatives) x),'[]'::jsonb),
  'offer_count',(select count(*) from eligible),
  'five_star_count',(select count(*) from eligible where star_level=5),
  'generated_at',now()
)
$$;

revoke all on function public.get_affiliate_destination_detail(text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.get_affiliate_destination_detail(text,timestamptz,timestamptz) to service_role;
