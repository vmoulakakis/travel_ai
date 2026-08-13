-- A strict Thrace request must have a real regional candidate set; otherwise the
-- recommendation engine either returns too few choices or leaks another region.
with s(slug,el,en,lat,lon,tags,profile,nmin,nmax,cost,ea,et,direct,conf,crowd,radius,aliases) as (values
('alexandroupoli','Αλεξανδρούπολη','Alexandroupoli',40.845,25.874,array['relax','food','culture','city','nature','beach','family','value','short_break','shoulder_season'],'coast_city',2,5,2,'domestic-flight','road-medium',true,.96,3,32,array['Αλεξανδρούπολη','Alexandroupoli']),
('xanthi','Ξάνθη','Xanthi',41.135,24.888,array['romantic','food','culture','city','nature','family','value','short_break','shoulder_season'],'city_cont',2,4,2,'domestic-flight-plus-road','road-near',false,.90,3,38,array['Ξάνθη','Xanthi']),
('komotini','Κομοτηνή','Komotini',41.119,25.406,array['food','culture','city','nature','family','value','short_break','shoulder_season'],'city_cont',2,4,2,'domestic-flight-plus-road','road-near',false,.90,2,35,array['Κομοτηνή','Komotini'])
)
insert into public.destination_knowledge_v8(
 slug,name_el,name_en,country_code,country_el,country_en,latitude,longitude,region_group,tags,semantic_vector,month_fit,
 ideal_nights_min,ideal_nights_max,cost_tier,effort_athens,effort_thessaloniki,direct_from_athens,route_confidence,
 crowd_level,hotel_radius_km,aliases,knowledge_source,season_profile,active,updated_at
)
select slug,el,en,'GR','Ελλάδα','Greece',lat,lon,'thrace',tags,public.v8_semantic_from_tags(tags),public.v8_month_profile(profile),
 nmin,nmax,cost,ea,et,direct,conf,crowd,radius,aliases,'curated-v14-thrace',profile,true,now()
from s
on conflict(slug) do update set
 name_el=excluded.name_el,name_en=excluded.name_en,latitude=excluded.latitude,longitude=excluded.longitude,
 region_group=excluded.region_group,tags=excluded.tags,semantic_vector=excluded.semantic_vector,month_fit=excluded.month_fit,
 ideal_nights_min=excluded.ideal_nights_min,ideal_nights_max=excluded.ideal_nights_max,cost_tier=excluded.cost_tier,
 effort_athens=excluded.effort_athens,effort_thessaloniki=excluded.effort_thessaloniki,direct_from_athens=excluded.direct_from_athens,
 route_confidence=excluded.route_confidence,crowd_level=excluded.crowd_level,hotel_radius_km=excluded.hotel_radius_km,
 aliases=excluded.aliases,knowledge_source=excluded.knowledge_source,season_profile=excluded.season_profile,active=true,updated_at=now();

update public.destination_knowledge_v8
set region_group='thrace', knowledge_source='curated-v14-thrace', updated_at=now()
where slug='samothrace';
