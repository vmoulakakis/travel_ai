-- Travel Guru V7: canonical semantic AI DB + gated neural learning.
-- Destination identity must match get_affiliate_travel_candidates_v2: md5(lower(trim(location_label))).

create table if not exists public.semantic_dimensions (
  dimension_index smallint primary key check (dimension_index between 1 and 24),
  dimension_key text unique not null,
  description text not null
);
insert into public.semantic_dimensions(dimension_index,dimension_key,description) values
(1,'relax','quiet spa switch-off'),(2,'romantic','couple intimacy boutique'),(3,'food','gastronomy restaurants wine'),(4,'warmth','sun mild/warm weather sea'),(5,'city','urban energy walkability'),(6,'nature','mountain lake forest landscape'),(7,'adventure','outdoor active travel'),(8,'culture','history museums heritage'),(9,'luxury','premium five-star preference'),(10,'boutique','small design-led stay'),(11,'resort','resort experience'),(12,'value','price/value sensitivity'),(13,'family','family suitability'),(14,'couple','couple suitability'),(15,'solo','solo suitability'),(16,'friends','friends/group suitability'),(17,'low_effort','short/easy travel preference'),(18,'warm_climate','climate warmth affinity'),(19,'all_weather','works outside peak summer'),(20,'beach_season','depends on beach/summer season'),(21,'nightlife','nightlife/social energy'),(22,'wellness','spa/wellness focus'),(23,'short_break','good for 2-4 nights'),(24,'shoulder_season','strong outside peak summer')
on conflict(dimension_index) do update set dimension_key=excluded.dimension_key,description=excluded.description;

create table if not exists public.destination_semantic_profiles (
  destination_id text primary key, location_label text not null,
  semantic_vector extensions.vector(24) not null,
  archetypes text[] not null default '{}', profile_confidence real not null default .5 check(profile_confidence between 0 and 1),
  source_offer_count integer not null default 0, source_property_count integer not null default 0,
  evidence jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
alter table public.destination_semantic_profiles enable row level security;
create index if not exists idx_destination_semantic_profiles_vector on public.destination_semantic_profiles using hnsw (semantic_vector extensions.vector_cosine_ops);
create index if not exists idx_destination_semantic_profiles_label on public.destination_semantic_profiles(location_label);

create table if not exists public.stay_semantic_profiles (
  source_product_id text primary key, destination_id text, property_name text not null,
  semantic_vector extensions.vector(24) not null, profile_confidence real not null default .5 check(profile_confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
alter table public.stay_semantic_profiles enable row level security;
create index if not exists idx_stay_semantic_profiles_vector on public.stay_semantic_profiles using hnsw (semantic_vector extensions.vector_cosine_ops);
create index if not exists idx_stay_semantic_destination on public.stay_semantic_profiles(destination_id);

create table if not exists public.match_sessions (
  id uuid primary key default gen_random_uuid(), anonymous_hash text,
  feature_vector extensions.vector(24) not null, constraints jsonb not null default '{}'::jsonb,
  model_version text not null default 'semantic-neural-v1', created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '90 days')
);
alter table public.match_sessions enable row level security;
create index if not exists idx_match_sessions_created on public.match_sessions(created_at desc);

create table if not exists public.match_outcomes (
  id bigint generated always as identity primary key,
  session_id uuid references public.match_sessions(id) on delete cascade,
  destination_id text, source_product_id text,
  event_name text not null check(event_name in ('recommendation_impression','destination_selected','offer_view','offer_unlock','outbound_click','conversion','approved_conversion')),
  reward real not null default 0 check(reward between -1 and 5), travel_month smallint check(travel_month between 1 and 12),
  pair_features extensions.vector(12), created_at timestamptz not null default now()
);
alter table public.match_outcomes enable row level security;
create index if not exists idx_match_outcomes_training on public.match_outcomes(destination_id,travel_month,event_name,created_at desc);
create index if not exists idx_match_outcomes_pair_training on public.match_outcomes(event_name,created_at desc) where pair_features is not null;

create table if not exists public.matching_model_versions (
  model_version text primary key, architecture jsonb not null, weights jsonb not null,
  sample_count integer not null default 0, validation_score real, active boolean not null default false,
  trained_at timestamptz, created_at timestamptz not null default now()
);
alter table public.matching_model_versions enable row level security;
insert into public.matching_model_versions(model_version,architecture,weights,sample_count,active)
values('semantic-neural-v1','{"input":12,"hidden":8,"output":1,"activation":"tanh","learning":"online_after_threshold"}'::jsonb,
'{"blend":{"semantic":0.30,"weather":0.16,"seasonality":0.16,"intent":0.10,"budget":0.08,"effort":0.08,"supply":0.04,"periodDemand":0.03,"stayFit":0.05},"min_samples_for_learned_weight":500}'::jsonb,0,true)
on conflict(model_version) do nothing;

create table if not exists public.destination_media (
  id bigint generated always as identity primary key, destination_id text not null, image_url text not null,
  source text not null check(source in ('linkwise','wikimedia','official','manual')), attribution text,
  width integer,height integer,quality_score real not null default .5 check(quality_score between 0 and 1),
  focal_x real not null default .5 check(focal_x between 0 and 1),focal_y real not null default .5 check(focal_y between 0 and 1),
  active boolean not null default true,fetched_at timestamptz not null default now(),unique(destination_id,image_url)
);
alter table public.destination_media enable row level security;
create index if not exists idx_destination_media_pick on public.destination_media(destination_id,active,quality_score desc);

create or replace function public.refresh_destination_semantic_profiles()
returns integer language plpgsql security definer set search_path=public,extensions,pg_temp as $$
begin
  with g as (
    select md5(lower(trim(location_label))) destination_id,location_label,count(*)::int offers,count(distinct place_id)::int properties,
      lower(string_agg(coalesce(property_name,'')||' '||coalesce(description,'')||' '||coalesce(source_category,''),' ')) txt,min(price) min_price,max(discount) max_discount
    from public.stay_offers where location_label is not null and trim(location_label)<>'' and tracking_url is not null and tracking_url<>'' and in_stock is distinct from false
    group by md5(lower(trim(location_label))),location_label
  ), f as (
    select *,
      case when txt~'(spa|wellness|pool|resort|ηρεμ|σπα|πισιν)' then .85 else .35 end f1,
      case when txt~'(romantic|adults only|boutique|suite|villa|honeymoon|μπουτικ|σουιτ|βιλα)' then .90 else .35 end f2,
      case when txt~'(restaurant|gastron|breakfast|wine|tavern|εστιατορ|γαστρο|κρασι|πρωινο)' then .85 else .30 end f3,
      case when txt~'(beach|sea |seaside|island|παραλι|θαλασσ|κρητ|ροδο|κωσ|κερκυρ|ζακυνθ)' then .80 else .40 end f4,
      case when txt~'(city|centre|center|urban|old town|πολη|κεντρ)' or lower(location_label)~'(αθην|θεσσαλονικ|πατρα|ιωαννιν|καλαματ)' then .90 else .35 end f5,
      case when txt~'(mountain|forest|lake|nature|village|βουν|δασ|λιμν|φυση|χωρι)' then .90 else .30 end f6,
      case when txt~'(hiking|outdoor|surf|diving|aqua|πεζοπο|καταδυ)' then .85 else .25 end f7,
      case when txt~'(historic|museum|heritage|old town|traditional|ιστορ|μουσει|παραδοσιακ|παλια πολ)' then .90 else .35 end f8,
      case when txt~'(^| )5\*|5 star|luxury|palace|premium|πολυτελ' then .90 else .35 end f9,
      case when txt~'(boutique|design hotel|μπουτικ)' then .90 else .25 end f10,
      case when txt~'(resort|all inclusive)' then .90 else .30 end f11,
      case when coalesce(max_discount,0)>0 or coalesce(min_price,9999)<90 then .85 else .45 end f12,
      case when txt~'(family|kids|aqua|apartment|οικογεν|παιδ|διαμερισ)' then .90 else .45 end f13,
      case when txt~'(adults only|romantic|suite|boutique|villa|honeymoon)' then .90 else .55 end f14,
      case when txt~'(city|center|centre|hostel|urban)' then .80 else .50 end f15,
      case when txt~'(city|beach|apartment|villa|night|club)' then .80 else .50 end f16,
      .55 f17,
      case when txt~'(beach|sea |seaside|island|παραλι|θαλασσ)' then .75 else .45 end f18,
      case when txt~'(city|spa|wellness|historic|museum|mountain|old town)' then .80 else .45 end f19,
      case when txt~'(beach|seaside|aqua|all inclusive|παραλι|θαλασσ|laganas|λαγανα|χαλκιδ|hersonissos|χερσονησ)' then .95 else .20 end f20,
      case when txt~'(nightlife|club|bar |party|laganas|λαγανα)' then .90 else .25 end f21,
      case when txt~'(spa|wellness|retreat|σπα)' then .95 else .25 end f22,
      case when txt~'(city|spa|boutique|old town)' or offers>=4 then .80 else .50 end f23,
      case when txt~'(city|historic|museum|mountain|spa|wellness|old town)' then .85 when txt~'(beach|all inclusive|aqua)' then .30 else .55 end f24
    from g
  )
  insert into public.destination_semantic_profiles(destination_id,location_label,semantic_vector,archetypes,profile_confidence,source_offer_count,source_property_count,evidence,updated_at)
  select destination_id,location_label,array[f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14,f15,f16,f17,f18,f19,f20,f21,f22,f23,f24]::extensions.vector,
    array_remove(array[case when f5>.75 then 'city-break' end,case when f20>.75 then 'beach-season' end,case when f22>.75 then 'wellness' end,case when f9>.75 then 'luxury' end,case when f6>.75 then 'nature' end,case when f8>.75 then 'culture' end],null),
    least(1.0,.45+ln(1+offers)::real/5),offers,properties,jsonb_build_object('min_price',min_price,'max_discount',max_discount,'canonical_key','md5_location_label'),now() from f
  on conflict(destination_id) do update set location_label=excluded.location_label,semantic_vector=excluded.semantic_vector,archetypes=excluded.archetypes,profile_confidence=excluded.profile_confidence,source_offer_count=excluded.source_offer_count,source_property_count=excluded.source_property_count,evidence=excluded.evidence,updated_at=now();
  delete from public.destination_semantic_profiles d where not exists(select 1 from public.stay_offers s where s.location_label is not null and md5(lower(trim(s.location_label)))=d.destination_id);
  return (select count(*)::int from public.destination_semantic_profiles);
end$$;

create or replace function public.get_semantic_match_data(p_destination_ids text[],p_product_ids text[] default null,p_travel_month int default null)
returns jsonb language sql security definer set search_path=public,extensions,pg_temp as $$
select jsonb_build_object(
 'destinations',coalesce((select jsonb_agg(jsonb_build_object('destination_id',d.destination_id,'location_label',d.location_label,'vector',d.semantic_vector::text,'archetypes',d.archetypes,'confidence',d.profile_confidence,'evidence',d.evidence,'learning',coalesce((select jsonb_build_object('selections',count(*) filter(where o.event_name='destination_selected'),'outbound_clicks',count(*) filter(where o.event_name='outbound_click'),'conversions',count(*) filter(where o.event_name in ('conversion','approved_conversion')),'reward',coalesce(sum(o.reward),0)) from public.match_outcomes o where o.destination_id=d.destination_id and (p_travel_month is null or o.travel_month=p_travel_month)),'{}'::jsonb),'media',coalesce((select jsonb_agg(x.obj) from (select jsonb_build_object('url',m.image_url,'source',m.source,'attribution',m.attribution,'quality',m.quality_score,'focal_x',m.focal_x,'focal_y',m.focal_y) obj from public.destination_media m where m.destination_id=d.destination_id and m.active order by m.quality_score desc limit 4) x),'[]'::jsonb))) from public.destination_semantic_profiles d where d.destination_id=any(p_destination_ids)),'[]'::jsonb),
 'stays',coalesce((select jsonb_agg(jsonb_build_object('source_product_id',s.source_product_id,'destination_id',s.destination_id,'property_name',s.property_name,'vector',s.semantic_vector::text,'confidence',s.profile_confidence,'evidence',s.evidence)) from public.stay_semantic_profiles s where p_product_ids is not null and s.source_product_id=any(p_product_ids)),'[]'::jsonb),
 'model',coalesce((select jsonb_build_object('version',model_version,'architecture',architecture,'weights',weights,'sample_count',sample_count,'validation_score',validation_score) from public.matching_model_versions where active order by created_at desc limit 1),'{}'::jsonb)
);
$$;
revoke all on function public.get_semantic_match_data(text[],text[],int) from public,anon,authenticated;
grant execute on function public.get_semantic_match_data(text[],text[],int) to service_role;

create or replace view public.match_training_examples as
select ms.id session_id,ms.feature_vector,mo.pair_features,mo.destination_id,mo.source_product_id,mo.travel_month,sum(mo.reward) reward,max(mo.created_at) last_outcome_at
from public.match_sessions ms join public.match_outcomes mo on mo.session_id=ms.id where mo.pair_features is not null
group by ms.id,ms.feature_vector,mo.pair_features,mo.destination_id,mo.source_product_id,mo.travel_month;
