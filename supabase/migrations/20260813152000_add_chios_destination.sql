insert into public.destination_knowledge_v8(
 slug,name_el,name_en,country_code,country_el,country_en,latitude,longitude,region_group,tags,semantic_vector,month_fit,
 ideal_nights_min,ideal_nights_max,cost_tier,effort_athens,effort_thessaloniki,direct_from_athens,route_confidence,
 crowd_level,hotel_radius_km,aliases,knowledge_source,season_profile,active,updated_at
)
select 'chios','Χίος','Chios','GR','Ελλάδα','Greece',38.370,26.136,'north-aegean',
 array['relax','food','culture','nature','beach','family','value','shoulder_season'],
 public.v8_semantic_from_tags(array['relax','food','culture','nature','beach','family','value','shoulder_season']),
 public.v8_month_profile('shoulder_island'),3,7,2,'domestic-flight','domestic-flight',true,.94,2,48,
 array['Χίος','Χίο','Chios'],'curated-v15-chios','shoulder_island',true,now()
on conflict(slug) do update set
 name_el=excluded.name_el,name_en=excluded.name_en,latitude=excluded.latitude,longitude=excluded.longitude,
 region_group=excluded.region_group,tags=excluded.tags,semantic_vector=excluded.semantic_vector,month_fit=excluded.month_fit,
 ideal_nights_min=excluded.ideal_nights_min,ideal_nights_max=excluded.ideal_nights_max,cost_tier=excluded.cost_tier,
 effort_athens=excluded.effort_athens,effort_thessaloniki=excluded.effort_thessaloniki,direct_from_athens=excluded.direct_from_athens,
 route_confidence=excluded.route_confidence,crowd_level=excluded.crowd_level,hotel_radius_km=excluded.hotel_radius_km,
 aliases=excluded.aliases,knowledge_source=excluded.knowledge_source,season_profile=excluded.season_profile,active=true,updated_at=now();
