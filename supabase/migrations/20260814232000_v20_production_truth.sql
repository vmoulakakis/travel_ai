-- V20 — Production Truth & Evidence Coverage
-- Keep privileged inventory/evidence aggregation behind service-role-only RPCs.

revoke all on function public.get_active_stay_cities_v15(integer) from public, anon, authenticated;
grant execute on function public.get_active_stay_cities_v15(integer) to service_role;

create or replace function public.get_production_truth_v20()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select jsonb_build_object(
    'activeGreekDestinations', (
      select count(*)::int
      from public.destination_knowledge_v8
      where country_code = 'GR' and active
    ),
    'stayPlaces', (
      select count(*)::int
      from public.stay_places
    ),
    'activeStayLocalities', (
      select count(*)::int
      from public.get_active_stay_cities_v15(500)
    ),
    'eligibleStayOffers', (
      select count(*)::int
      from public.stay_offers
      where tracking_url like 'https://go.linkwi.se/%/CD104/%'
        and in_stock is distinct from false
        and valid_to is not null
        and valid_to >= now()
    ),
    'confirmedStockOffers', (
      select count(*)::int
      from public.stay_offers
      where tracking_url like 'https://go.linkwi.se/%/CD104/%'
        and in_stock is true
        and valid_to is not null
        and valid_to >= now()
    ),
    'unknownStockOffers', (
      select count(*)::int
      from public.stay_offers
      where tracking_url like 'https://go.linkwi.se/%/CD104/%'
        and in_stock is null
        and valid_to is not null
        and valid_to >= now()
    ),
    'verifiedEvidenceRows', (
      select count(*)::int
      from public.destination_evidence_v12
      where lower(coalesce(status,'')) = 'verified'
        and expires_at >= now()
    ),
    'verifiedEvidenceDestinations', (
      select count(distinct destination_id)::int
      from public.destination_evidence_v12
      where lower(coalesce(status,'')) = 'verified'
        and expires_at >= now()
    ),
    'routeEvidenceRows', (
      select count(*)::int
      from public.route_evidence
    ),
    'travelEvidenceRows', (
      select count(*)::int
      from public.travel_evidence
    ),
    'checkedAt', now()
  );
$$;

revoke all on function public.get_production_truth_v20() from public, anon, authenticated;
grant execute on function public.get_production_truth_v20() to service_role;
