create extension if not exists pg_cron with schema extensions;

create or replace function public.refresh_linkwise_stay_intelligence()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_url text := 'https://affiliate.linkwi.se/feeds/1.2/CD104/programs-all/columns-product_id,model_name,product_name,description,category,brand_name,tracking_url,thumb_url,image_url,in_stock,availability,valid_from,valid_to,on_sale,currency,price,full_price,discount,city,times_bought,longitude,latitude,address,size,colour,custom,extra_images,variations/catinc-89,99,109/catex-0/proginc-0/progex-0/feed.json';
  v_body text;
  v_json jsonb;
  v_run uuid;
  v_offers int := 0;
  v_places int := 0;
  v_locations int := 0;
begin
  insert into public.feed_ingestion_runs(source_name, source_url)
  values ('linkwise-stays-89-99-109', v_url)
  returning id into v_run;

  begin
    select content into v_body from extensions.http_get(v_url);
    v_json := v_body::jsonb;

    create temporary table tmp_stay_feed on commit drop as
    with items as (select value as x from jsonb_array_elements(v_json))
    select x,
      coalesce(nullif(x->>'product_id',''), md5(x::text)) as product_id,
      coalesce(nullif(trim(split_part(coalesce(x->>'product_name',''),'|',1)),''), coalesce(x->>'product_name','Unnamed stay')) as property_name,
      coalesce(nullif(trim(split_part(coalesce(x->>'product_name',''),'|',2)),''), nullif(x->>'address','')) as location_label,
      nullif(x->>'address','') as address,
      nullif(x->>'city','') as city_raw,
      nullif(x->>'category','') as category,
      nullif(x->>'description','') as description,
      nullif(x->>'tracking_url','') as tracking_url,
      nullif(x->>'image_url','') as image_url,
      nullif(x->>'thumb_url','') as thumb_url,
      nullif(x->>'availability','') as availability,
      nullif(x->>'currency','') as currency,
      nullif(x->>'valid_from','')::timestamptz as valid_from,
      nullif(x->>'valid_to','')::timestamptz as valid_to,
      case when lower(coalesce(x->>'in_stock','')) in ('true','1','yes') then true when lower(coalesce(x->>'in_stock','')) in ('false','0','no') then false else null end as in_stock,
      case when lower(coalesce(x->>'on_sale','')) in ('true','1','yes') then true when lower(coalesce(x->>'on_sale','')) in ('false','0','no') then false else null end as on_sale,
      nullif(replace(x->>'price',',','.'),'')::numeric as price,
      nullif(replace(x->>'full_price',',','.'),'')::numeric as full_price,
      nullif(replace(x->>'discount',',','.'),'')::numeric as discount,
      nullif(replace(x->>'times_bought',',','.'),'')::numeric as demand_proxy,
      nullif(x->>'latitude','')::double precision as latitude,
      nullif(x->>'longitude','')::double precision as longitude,
      substring(coalesce(x->>'tracking_url','') from '/z/([0-9]+)-') as program_id
    from items
    where nullif(x->>'latitude','') is not null
      and nullif(x->>'longitude','') is not null;

    alter table tmp_stay_feed add column place_id text;
    update tmp_stay_feed
    set place_id = md5(lower(property_name) || '|' || round(latitude::numeric,4)::text || '|' || round(longitude::numeric,4)::text);

    insert into public.stay_places(
      id,property_name,location_label,address,city_raw,country_hint,latitude,longitude,category,
      hero_image_url,offer_count,min_price,max_price,currency,demand_score,valid_to_max,observed_at,
      raw_names,semantic_text,updated_at
    )
    select place_id,min(property_name),max(location_label) filter(where location_label is not null),
      max(address) filter(where address is not null),max(city_raw) filter(where city_raw is not null),
      case when avg(latitude) between 34 and 42.2 and avg(longitude) between 19 and 30 then 'Greece' else null end,
      avg(latitude),avg(longitude),max(category) filter(where category is not null),
      max(image_url) filter(where image_url is not null),count(*),min(price),max(price),
      max(currency) filter(where currency is not null),coalesce(sum(demand_proxy),0),max(valid_to),now(),
      array_agg(distinct property_name),
      concat_ws(' · ',min(property_name),max(location_label),max(address),max(category),'from €'||coalesce(min(price)::text,'?')),now()
    from tmp_stay_feed group by place_id
    on conflict(id) do update set
      property_name=excluded.property_name,location_label=excluded.location_label,address=excluded.address,
      city_raw=excluded.city_raw,country_hint=excluded.country_hint,latitude=excluded.latitude,
      longitude=excluded.longitude,category=excluded.category,
      hero_image_url=coalesce(excluded.hero_image_url,public.stay_places.hero_image_url),
      offer_count=excluded.offer_count,min_price=excluded.min_price,max_price=excluded.max_price,
      currency=excluded.currency,demand_score=excluded.demand_score,valid_to_max=excluded.valid_to_max,
      observed_at=excluded.observed_at,raw_names=excluded.raw_names,semantic_text=excluded.semantic_text,updated_at=now();

    insert into public.stay_offers(
      source_product_id,place_id,property_name,location_label,description,source_category,program_id,
      tracking_url,image_url,thumb_url,in_stock,availability,valid_from,valid_to,on_sale,currency,
      price,full_price,discount,demand_proxy,raw,observed_at,updated_at
    )
    select product_id,place_id,property_name,location_label,description,category,program_id,
      tracking_url,image_url,thumb_url,in_stock,availability,valid_from,valid_to,on_sale,currency,
      price,full_price,discount,demand_proxy,x,now(),now()
    from tmp_stay_feed
    on conflict(source_product_id) do update set
      place_id=excluded.place_id,property_name=excluded.property_name,location_label=excluded.location_label,
      description=excluded.description,source_category=excluded.source_category,program_id=excluded.program_id,
      tracking_url=excluded.tracking_url,image_url=excluded.image_url,thumb_url=excluded.thumb_url,
      in_stock=excluded.in_stock,availability=excluded.availability,valid_from=excluded.valid_from,
      valid_to=excluded.valid_to,on_sale=excluded.on_sale,currency=excluded.currency,price=excluded.price,
      full_price=excluded.full_price,discount=excluded.discount,demand_proxy=excluded.demand_proxy,
      raw=excluded.raw,observed_at=excluded.observed_at,updated_at=now();

    insert into public.destination_supply_signals(
      id,location_label,country_hint,centroid_latitude,centroid_longitude,property_count,offer_count,
      min_price,median_price,max_price,currency,demand_score,hero_image_url,valid_to_max,observed_at,
      semantic_text,updated_at
    )
    select md5(lower(location_label)),location_label,
      case when avg(latitude) between 34 and 42.2 and avg(longitude) between 19 and 30 then 'Greece' else null end,
      avg(latitude),avg(longitude),count(distinct place_id),count(*),min(price),
      percentile_cont(0.5) within group(order by price) filter(where price is not null),max(price),
      max(currency) filter(where currency is not null),coalesce(sum(demand_proxy),0),
      max(image_url) filter(where image_url is not null),max(valid_to),now(),
      concat_ws(' · ',location_label,count(distinct place_id)||' properties','from €'||coalesce(min(price)::text,'?'),'demand '||coalesce(sum(demand_proxy),0)::text),now()
    from tmp_stay_feed
    where nullif(location_label,'') is not null
    group by location_label
    on conflict(location_label) do update set
      country_hint=excluded.country_hint,centroid_latitude=excluded.centroid_latitude,
      centroid_longitude=excluded.centroid_longitude,property_count=excluded.property_count,
      offer_count=excluded.offer_count,min_price=excluded.min_price,median_price=excluded.median_price,
      max_price=excluded.max_price,currency=excluded.currency,demand_score=excluded.demand_score,
      hero_image_url=excluded.hero_image_url,valid_to_max=excluded.valid_to_max,
      observed_at=excluded.observed_at,semantic_text=excluded.semantic_text,updated_at=now();

    select count(*) into v_offers from tmp_stay_feed;
    select count(distinct place_id) into v_places from tmp_stay_feed;
    select count(distinct location_label) into v_locations from tmp_stay_feed where location_label is not null;

    update public.feed_ingestion_runs set
      status='complete',fetched_items=jsonb_array_length(v_json),accepted_offers=v_offers,
      place_count=v_places,location_count=v_locations,completed_at=now()
    where id=v_run;
  exception when others then
    update public.feed_ingestion_runs set status='failed',completed_at=now(),diagnostics=jsonb_build_object('error',sqlerrm)
    where id=v_run;
    raise;
  end;

  return jsonb_build_object('offers',v_offers,'places',v_places,'locations',v_locations,'run_id',v_run,'completed_at',now());
end;
$$;

revoke all on function public.refresh_linkwise_stay_intelligence() from public, anon, authenticated;
grant execute on function public.refresh_linkwise_stay_intelligence() to postgres, service_role;

select cron.unschedule(jobid) from cron.job where jobname='travel-ai-refresh-stay-feed';
select cron.schedule('travel-ai-refresh-stay-feed','23 2 * * *','select public.refresh_linkwise_stay_intelligence();');
