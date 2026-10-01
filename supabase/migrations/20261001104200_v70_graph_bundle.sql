-- V70 graph-aware destination bundle.
create or replace function public.get_agentic_destination_bundle_v70(
  p_node_keys text[],
  p_locale text default 'el',
  p_stay_limit integer default 6,
  p_entity_limit integer default 40
)
returns jsonb
language sql
stable
security invoker
set search_path to 'public','extensions','pg_temp'
as $$
with selected as (
  select * from public.travel_destination_nodes_v46
  where active and country_code='GR' and node_key=any(coalesce(p_node_keys,'{}'::text[]))
), slugs as (
  select distinct canonical_slug from selected where canonical_slug is not null
), entities as (
  select e.*
  from public.travel_knowledge_entities_v44 e
  where e.active and e.destination_slug in (select canonical_slug from slugs)
  order by e.quality_score desc,e.freshness_score desc
  limit greatest(1,least(coalesce(p_entity_limit,40),120))
), facts as (
  select f.*
  from public.travel_knowledge_facts_v44 f
  join entities e on e.id=f.entity_id
  where f.status='verified'
  order by f.evidence_strength desc,f.confidence desc
  limit 240
), edges as (
  select
    g.id,g.source_entity_id,g.relation,g.target_entity_id,g.weight,g.confidence,g.evidence_count,g.attributes,g.valid_from,g.valid_to,
    se.canonical_key as source_key,se.canonical_name as source_name,se.entity_type as source_type,
    te.canonical_key as target_key,te.canonical_name as target_name,te.entity_type as target_type
  from public.travel_knowledge_edges_v44 g
  left join public.travel_knowledge_entities_v44 se on se.id=g.source_entity_id
  left join public.travel_knowledge_entities_v44 te on te.id=g.target_entity_id
  where g.active
    and (g.valid_to is null or g.valid_to>=now())
    and (g.source_entity_id in (select id from entities) or g.target_entity_id in (select id from entities))
  order by g.confidence desc,g.evidence_count desc,g.updated_at desc
  limit 320
), stays as (
  select s.*
  from public.stay_product_knowledge_v43 s
  where s.destination_slug in (select canonical_slug from slugs)
  order by s.evidence_score desc,s.offer_count desc,s.property_name
  limit least(180,greatest(1,coalesce(p_stay_limit,6))*20)
)
select jsonb_build_object(
  'destinations',coalesce((select jsonb_agg(jsonb_build_object(
    'nodeKey',d.node_key,'canonicalSlug',d.canonical_slug,
    'name',case when lower(coalesce(p_locale,'el'))='en' then coalesce(d.name_en,d.name_el) else d.name_el end,
    'region',d.region_label,'latitude',d.latitude,'longitude',d.longitude,
    'propertyCount',d.property_count,'offerCount',d.offer_count,
    'price',jsonb_build_object('min',d.min_price,'max',d.max_price,'currency',d.currency),
    'semanticText',d.semantic_text,'parentCanonicalSlug',d.parent_canonical_slug
  )) from selected d),'[]'::jsonb),
  'entities',coalesce((select jsonb_agg(jsonb_build_object(
    'id',e.id,'type',e.entity_type,'key',e.canonical_key,'name',e.canonical_name,
    'destinationSlug',e.destination_slug,'latitude',e.latitude,'longitude',e.longitude,
    'attributes',e.attributes,'quality',e.quality_score,'freshness',e.freshness_score
  )) from entities e),'[]'::jsonb),
  'facts',coalesce((select jsonb_agg(jsonb_build_object(
    'entityId',f.entity_id,'predicate',f.predicate,'value',f.value,'valueText',f.value_text,
    'confidence',f.confidence,'evidenceStrength',f.evidence_strength,'sourceKind',f.source_kind,
    'sourceName',f.source_name,'sourceRef',f.source_ref,'observedAt',f.observed_at,'validTo',f.valid_to
  )) from facts f),'[]'::jsonb),
  'edges',coalesce((select jsonb_agg(jsonb_build_object(
    'id',g.id,'relation',g.relation,'sourceId',g.source_entity_id,'sourceKey',g.source_key,'sourceName',g.source_name,'sourceType',g.source_type,
    'targetId',g.target_entity_id,'targetKey',g.target_key,'targetName',g.target_name,'targetType',g.target_type,
    'confidence',g.confidence,'evidenceCount',g.evidence_count,'attributes',g.attributes,'validFrom',g.valid_from,'validTo',g.valid_to
  )) from edges g),'[]'::jsonb),
  'stays',coalesce((select jsonb_agg(jsonb_build_object(
    'placeId',s.place_id,'propertyName',s.property_name,'destinationSlug',s.destination_slug,
    'locationLabel',s.location_label,'latitude',s.latitude,'longitude',s.longitude,
    'semanticText',s.semantic_text,'semanticTags',s.semantic_tags,'travelerFit',s.traveler_fit,
    'offerCount',s.offer_count,'minPrice',s.min_price,'maxPrice',s.max_price,'currency',s.currency,
    'heroImageUrl',s.hero_image_url,'evidenceScore',s.evidence_score
  )) from stays s),'[]'::jsonb)
);
$$;

revoke execute on function public.get_agentic_destination_bundle_v70(text[],text,integer,integer) from public,anon,authenticated;
grant execute on function public.get_agentic_destination_bundle_v70(text[],text,integer,integer) to service_role;
