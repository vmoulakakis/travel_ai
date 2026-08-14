-- V22 — Criterion Relevance
-- Expose one continuous semantic profile per canonical Greek destination when an exact
-- feed-derived semantic destination profile exists. This is a soft-ranking signal only;
-- hard constraints continue to use canonical destination facts and verified stay evidence.

create or replace function public.get_destination_choice_profiles_v22()
returns table(
  destination_slug text,
  semantic_vector text,
  profile_confidence real,
  source_property_count integer
)
language sql
stable
security definer
set search_path to 'public','extensions','pg_temp'
as $$
with matches as (
  select
    d.slug as destination_slug,
    p.semantic_vector::text as semantic_vector,
    p.profile_confidence,
    p.source_property_count,
    row_number() over (
      partition by d.slug
      order by p.source_property_count desc nulls last,
               p.profile_confidence desc nulls last,
               p.updated_at desc nulls last,
               p.destination_id
    ) as match_rank
  from public.destination_knowledge_v8 d
  join public.destination_semantic_profiles p
    on lower(trim(p.location_label)) = any(
      array(
        select lower(trim(x))
        from unnest(d.aliases || array[d.name_el,d.name_en,d.slug]) x
      )
    )
  where d.active
    and d.country_code='GR'
)
select destination_slug,semantic_vector,profile_confidence,source_property_count
from matches
where match_rank=1
order by destination_slug;
$$;

revoke all on function public.get_destination_choice_profiles_v22() from public,anon,authenticated;
grant execute on function public.get_destination_choice_profiles_v22() to service_role;
