-- Migration 20260813092419: broaden the Greece-first destination graph so distinct traveler briefs do not
-- collapse onto the same small set of famous places. These remain curated
-- destination facts; merchant inventory never affects destination rank.
with s(slug,el,en,lat,lon,region,tags,profile,nmin,nmax,cost,ea,et,direct,conf,crowd,radius,aliases) as (values
('rethymno','Ρέθυμνο','Rethymno',35.365,24.482,'crete',array['romantic','relax','food','culture','city','nature','beach','family','value','warmth','shoulder_season'],'coast_city',3,7,2,'domestic-flight-plus-road','domestic-flight-plus-road',false,.90,3,38,array['Ρέθυμνο','Rethymno']),
('agios-nikolaos','Άγιος Νικόλαος','Agios Nikolaos',35.190,25.717,'crete',array['romantic','relax','food','culture','nature','beach','family','luxury','warmth','shoulder_season'],'coast_city',3,7,3,'domestic-flight-plus-road','domestic-flight-plus-road',false,.88,3,42,array['Άγιος Νικόλαος','Agios Nikolaos','Ελούντα']),
('kefalonia','Κεφαλονιά','Kefalonia',38.175,20.569,'ionian',array['romantic','relax','food','nature','beach','adventure','family','value','warmth','shoulder_season'],'shoulder_island',4,8,3,'domestic-flight','domestic-flight',true,.92,3,52,array['Κεφαλονιά','Kefalonia','Αργοστόλι']),
('lefkada','Λευκάδα','Lefkada',38.706,20.640,'ionian',array['romantic','relax','food','nature','beach','adventure','family','value','warmth','shoulder_season'],'shoulder_island',3,7,3,'road-long','road-long',false,.95,3,48,array['Λευκάδα','Lefkada','Νυδρί']),
('zakynthos','Ζάκυνθος','Zakynthos',37.787,20.899,'ionian',array['relax','food','nature','beach','nightlife','family','warmth'],'summer_island',4,8,3,'domestic-flight','domestic-flight',true,.95,5,50,array['Ζάκυνθος','Zakynthos','Zante']),
('paxos','Παξοί','Paxos',39.200,20.185,'ionian',array['romantic','relax','food','nature','beach','luxury','wellness','warmth','shoulder_season'],'shoulder_island',3,6,4,'domestic-flight-plus-road','domestic-flight-plus-road',false,.78,2,22,array['Παξοί','Paxos','Γάιος']),
('milos','Μήλος','Milos',36.691,24.393,'cyclades',array['romantic','relax','food','nature','beach','adventure','luxury','warmth','shoulder_season'],'summer_island',3,7,4,'domestic-flight','ferry-long',true,.95,4,34,array['Μήλος','Milos','Αδάμαντας']),
('tinos','Τήνος','Tinos',37.539,25.163,'cyclades',array['romantic','relax','food','culture','nature','beach','wellness','shoulder_season'],'shoulder_island',3,6,3,'ferry-easy','ferry-long',false,.92,3,30,array['Τήνος','Tinos','Χώρα Τήνου']),
('amorgos','Αμοργός','Amorgos',36.838,25.899,'cyclades',array['romantic','relax','food','culture','nature','beach','adventure','wellness','value'],'summer_island',4,8,3,'ferry-long','ferry-long',false,.82,2,35,array['Αμοργός','Amorgos','Κατάπολα','Αιγιάλη']),
('kos','Κως','Kos',36.893,27.287,'dodecanese',array['relax','food','culture','city','nature','beach','family','value','warmth','shoulder_season'],'coast_city',3,7,2,'domestic-flight','domestic-flight',true,.98,4,42,array['Κως','Kos']),
('karpathos','Κάρπαθος','Karpathos',35.507,27.213,'dodecanese',array['relax','food','culture','nature','beach','adventure','family','value','warmth'],'summer_island',4,8,2,'domestic-flight','domestic-flight',true,.90,2,45,array['Κάρπαθος','Karpathos','Πηγάδια']),
('symi','Σύμη','Symi',36.615,27.837,'dodecanese',array['romantic','relax','food','culture','nature','beach','luxury','warmth','shoulder_season'],'shoulder_island',3,6,4,'domestic-flight-plus-road','domestic-flight-plus-road',false,.82,3,24,array['Σύμη','Symi','Γιαλός']),
('skiathos','Σκιάθος','Skiathos',39.162,23.490,'sporades',array['romantic','relax','food','nature','beach','nightlife','family','warmth'],'summer_island',3,7,3,'domestic-flight','domestic-flight-plus-road',true,.92,4,30,array['Σκιάθος','Skiathos']),
('skopelos','Σκόπελος','Skopelos',39.122,23.724,'sporades',array['romantic','relax','food','culture','nature','beach','family','value','wellness'],'summer_island',4,8,2,'ferry-long','ferry-long',false,.88,2,38,array['Σκόπελος','Skopelos']),
('alonissos','Αλόννησος','Alonissos',39.151,23.864,'sporades',array['relax','food','nature','beach','adventure','family','value','wellness'],'summer_island',4,8,2,'ferry-long','ferry-long',false,.85,2,42,array['Αλόννησος','Alonissos','Πατητήρι']),
('parga','Πάργα','Parga',39.285,20.400,'epirus',array['romantic','relax','food','culture','nature','beach','family','value','warmth','shoulder_season'],'coast_city',3,7,2,'road-long','road-medium',false,.92,4,30,array['Πάργα','Parga']),
('kavala','Καβάλα','Kavala',40.939,24.401,'macedonia',array['romantic','food','culture','city','nature','beach','family','value','short_break','shoulder_season'],'coast_city',2,5,2,'domestic-flight','road-near',true,.95,3,30,array['Καβάλα','Kavala']),
('nafpaktos','Ναύπακτος','Nafpaktos',38.392,21.827,'central-greece',array['romantic','relax','food','culture','city','nature','beach','family','value','short_break','shoulder_season'],'coast_city',2,5,2,'road-medium','road-long',false,.95,2,25,array['Ναύπακτος','Nafpaktos']),
('evia','Εύβοια','Evia',38.500,24.000,'central-greece',array['relax','food','culture','nature','beach','adventure','family','value','wellness'],'nature_all',3,7,2,'road-near','road-long',false,.90,2,58,array['Εύβοια','Evia','Χαλκίδα','Λίμνη Ευβοίας']),
('samothrace','Σαμοθράκη','Samothrace',40.474,25.525,'north-aegean',array['relax','culture','nature','beach','adventure','value','wellness'],'nature_all',4,8,2,'domestic-flight-plus-road','road-medium',false,.75,2,40,array['Σαμοθράκη','Samothrace','Καμαριώτισσα'])
)
insert into public.destination_knowledge_v8(
 slug,name_el,name_en,country_code,country_el,country_en,latitude,longitude,region_group,tags,semantic_vector,month_fit,
 ideal_nights_min,ideal_nights_max,cost_tier,effort_athens,effort_thessaloniki,direct_from_athens,route_confidence,
 crowd_level,hotel_radius_km,aliases,knowledge_source,season_profile,active,updated_at
)
select slug,el,en,'GR','Ελλάδα','Greece',lat,lon,region,tags,public.v8_semantic_from_tags(tags),public.v8_month_profile(profile),
 nmin,nmax,cost,ea,et,direct,conf,crowd,radius,aliases,'curated-v13-diversity',profile,true,now()
from s
on conflict(slug) do update set
 name_el=excluded.name_el,name_en=excluded.name_en,latitude=excluded.latitude,longitude=excluded.longitude,
 region_group=excluded.region_group,tags=excluded.tags,semantic_vector=excluded.semantic_vector,month_fit=excluded.month_fit,
 ideal_nights_min=excluded.ideal_nights_min,ideal_nights_max=excluded.ideal_nights_max,cost_tier=excluded.cost_tier,
 effort_athens=excluded.effort_athens,effort_thessaloniki=excluded.effort_thessaloniki,direct_from_athens=excluded.direct_from_athens,
 route_confidence=excluded.route_confidence,crowd_level=excluded.crowd_level,hotel_radius_km=excluded.hotel_radius_km,
 aliases=excluded.aliases,knowledge_source=excluded.knowledge_source,season_profile=excluded.season_profile,active=true,updated_at=now();
