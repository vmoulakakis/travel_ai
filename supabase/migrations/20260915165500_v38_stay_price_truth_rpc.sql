create or replace function public.get_destination_stays_v8(
  p_slug text,
  p_start_date date,
  p_end_date date,
  p_limit integer default 18
)
returns table(
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
  raw jsonb
)
language sql
security definer
set search_path to 'public','extensions','pg_temp'
as $$
  with dest as (
    select * from public.destination_knowledge_v8
    where slug=p_slug and active
    limit 1
  ), parsed as (
    select s.*,
      case when coalesce(s.raw->>'latitude','')~'^-?[0-9]+(\.[0-9]+)?$' then (s.raw->>'latitude')::double precision else p.latitude end lat,
      case when coalesce(s.raw->>'longitude','')~'^-?[0-9]+(\.[0-9]+)?$' then (s.raw->>'longitude')::double precision else p.longitude end lon,
      case when lower(trim(coalesce(s.raw->>'city',''))) in ('','all','n/a','na','null','none','-','0') then null else trim(s.raw->>'city') end raw_city,
      case when lower(trim(coalesce(s.raw->>'address',''))) in ('','all','n/a','na','null','none','-','0') then null else trim(s.raw->>'address') end raw_address,
      p.location_label as place_location
    from public.stay_offers s
    join public.stay_places p on p.id=s.place_id
    where s.tracking_url like 'https://go.linkwi.se/%'
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
  select source_product_id,property_name,
    coalesce(raw_city,raw_address,place_location),
    coalesce(raw_address,raw_city,place_location),km,description,source_category,
    program_id,tracking_url,image_url,thumb_url,in_stock,availability,valid_from,
    valid_to,currency,
    case when price is not null and price>0 then price else null end,
    case when full_price is not null and full_price>0 then full_price else null end,
    discount,demand_proxy,raw
  from scored
  where (km is not null and km<=hotel_radius_km)
     or lower(coalesce(raw_city,''))=any(array(select lower(x) from unnest(aliases||array[name_el,name_en]) x))
     or lower(coalesce(place_location,''))=any(array(select lower(x) from unnest(aliases||array[name_el,name_en]) x))
  order by coalesce(km,9999),coalesce(demand_proxy,0) desc,coalesce(discount,0) desc
  limit greatest(1,least(coalesce(p_limit,18),60));
$$;
