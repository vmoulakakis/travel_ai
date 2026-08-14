create or replace function public.get_active_stay_cities_v15(p_limit integer default 200)
returns table(
  city text,
  property_count bigint,
  offer_count bigint,
  min_price numeric,
  currency text,
  freshest_offer_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with eligible as (
    select
      regexp_replace(trim(p.city_raw), '\s+', ' ', 'g') as city,
      p.id as place_id,
      o.source_product_id,
      o.price,
      nullif(trim(o.currency), '') as currency,
      greatest(coalesce(o.observed_at, '-infinity'::timestamptz), coalesce(o.updated_at, '-infinity'::timestamptz)) as freshness
    from public.stay_places p
    join public.stay_offers o on o.place_id = p.id
    where nullif(trim(p.city_raw), '') is not null
      and coalesce(nullif(trim(p.country_hint), ''), 'Greece') = 'Greece'
      and coalesce(o.in_stock, true) = true
      and (o.valid_to is null or o.valid_to >= now())
      and nullif(trim(o.tracking_url), '') is not null
      and lower(trim(p.city_raw)) not in ('all', 'unknown', 'n/a', 'na', 'greece', 'ελλάδα')
      and lower(trim(p.city_raw)) not like '%κρουαζι%'
      and lower(trim(p.city_raw)) not like '%cruise%'
  ), grouped as (
    select
      city,
      count(distinct place_id) as property_count,
      count(distinct source_product_id) as offer_count,
      min(price) filter (where price is not null) as min_price,
      mode() within group (order by currency) filter (where currency is not null) as currency,
      max(freshness) as freshest_offer_at
    from eligible
    group by city
  )
  select city, property_count, offer_count, min_price, currency, freshest_offer_at
  from grouped
  where property_count > 0 and offer_count > 0
  order by property_count desc, offer_count desc, city asc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

revoke all on function public.get_active_stay_cities_v15(integer) from public;
grant execute on function public.get_active_stay_cities_v15(integer) to service_role;

comment on function public.get_active_stay_cities_v15(integer) is
'Travel AI V15: active Greece stay locations only; excludes feed junk and returns supply depth without affecting destination ranking.';
