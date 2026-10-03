-- V70 scale/readiness: cover server-side FKs and allow the destination universe to grow beyond today's 574 nodes.
create index if not exists travel_journeys_v70_session_idx on public.travel_journeys_v70(session_id) where session_id is not null;
create index if not exists travel_tracking_actions_v70_session_idx on public.travel_tracking_actions_v70(session_id) where session_id is not null;

create or replace function public.get_agentic_candidate_universe_v70(
  p_limit integer default 400,
  p_locale text default 'el'
)
returns table(
  node_key text,canonical_slug text,display_name text,region_label text,latitude double precision,longitude double precision,
  property_count integer,offer_count integer,min_price numeric,max_price numeric,currency text,demand_signal numeric,semantic_text text,
  match_readiness real,content_status text,verified_fact_count bigint,evidence_count bigint,avg_confidence real,avg_evidence_strength real
)
language sql
stable
security invoker
set search_path to 'public','extensions','pg_temp'
as $$
  select
    n.node_key,n.canonical_slug,
    case when lower(coalesce(p_locale,'el'))='en' then coalesce(n.name_en,n.name_el) else n.name_el end,
    n.region_label,n.latitude,n.longitude,n.property_count,n.offer_count,n.min_price,n.max_price,n.currency,n.demand_score,n.semantic_text,
    n.match_readiness,n.content_status,
    coalesce(ec.verified_fact_count,0)::bigint,coalesce(ec.evidence_count,0)::bigint,
    coalesce(ec.avg_confidence,0)::real,coalesce(ec.avg_evidence_strength,0)::real
  from public.travel_destination_nodes_v46 n
  left join public.travel_destination_evidence_coverage_v44 ec on ec.destination_slug=n.canonical_slug
  where n.active and n.country_code='GR'
  order by
    case when n.publication_gate='publish' then 0 else 1 end,
    n.match_readiness desc,
    coalesce(ec.verified_fact_count,0) desc,
    n.property_count desc,
    n.node_key
  limit greatest(1,least(coalesce(p_limit,400),2500));
$$;

revoke execute on function public.get_agentic_candidate_universe_v70(integer,text) from public,anon,authenticated;
grant execute on function public.get_agentic_candidate_universe_v70(integer,text) to service_role;
comment on function public.get_agentic_candidate_universe_v70 is 'V70 bounded Greece retrieval universe. Ordering is retrieval hygiene only; agents make all final decisions. Sized for future 1,700+ entity expansion.';
