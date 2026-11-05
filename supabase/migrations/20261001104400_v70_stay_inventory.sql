create or replace function public.get_agentic_stay_inventory_v70(
  p_destination_slug text,
  p_limit integer default 80
)
returns table(
  source_product_id text,place_id text,property_name text,location_label text,description text,tracking_url text,image_url text,
  in_stock boolean,availability text,valid_from timestamptz,valid_to timestamptz,currency text,price numeric,full_price numeric,
  observed_at timestamptz,latitude double precision,longitude double precision,semantic_text text,semantic_tags text[],traveler_fit jsonb,evidence_score real
)
language sql
stable
security invoker
set search_path to 'public','extensions','pg_temp'
as $$
 select o.source_product_id,o.place_id,o.property_name,o.location_label,o.description,o.tracking_url,
        coalesce(o.image_url,o.thumb_url,k.hero_image_url) as image_url,
        o.in_stock,o.availability,o.valid_from,o.valid_to,o.currency,o.price,o.full_price,o.observed_at,
        k.latitude,k.longitude,k.semantic_text,k.semantic_tags,k.traveler_fit,k.evidence_score
 from public.stay_offers o
 join public.stay_product_knowledge_v43 k on k.place_id=o.place_id
 where k.destination_slug=p_destination_slug
   and o.tracking_url is not null and length(o.tracking_url)>8
   and (o.in_stock is null or o.in_stock=true)
   and (o.valid_to is null or o.valid_to>=now())
 order by k.evidence_score desc,o.observed_at desc nulls last,o.property_name,o.source_product_id
 limit greatest(1,least(coalesce(p_limit,80),200));
$$;

revoke execute on function public.get_agentic_stay_inventory_v70(text,integer) from public,anon,authenticated;
grant execute on function public.get_agentic_stay_inventory_v70(text,integer) to service_role;
comment on function public.get_agentic_stay_inventory_v70 is 'V70 truthful stay retrieval. Ordering bounds model context only; stay-curator agent makes the contextual choice and commission is not exposed.';
