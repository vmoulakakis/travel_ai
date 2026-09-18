-- V45.1: fix tag expansion and make behavioral learning attribution-aware.
create or replace function public.record_traveler_signal_v45(
  p_profile_key text,
  p_session_id text,
  p_mission_id uuid default null,
  p_event_type text default 'unknown',
  p_subject_type text default 'destination',
  p_subject_key text default null,
  p_value numeric default null,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions','pg_temp'
as $$
declare
  v_key text := trim(coalesce(p_profile_key,''));
  v_event text := lower(trim(coalesce(p_event_type,'unknown')));
  v_subject text := trim(coalesce(p_subject_key,''));
  v_tags text[] := '{}';
  v_applied_tags text[] := '{}';
  v_delta real := 0;
  v_learned jsonb := '{}'::jsonb;
  v_explicit jsonb := '{}'::jsonb;
  v_tag text;
  v_current real;
  v_explicit_weight real;
  v_attributed_delta real;
  v_next real;
  v_id bigint;
begin
  if length(v_key) < 8 or length(v_key) > 160 then
    raise exception 'invalid profile key';
  end if;

  insert into public.traveler_intelligence_profiles_v44(profile_key,last_seen_at,updated_at)
  values(v_key,now(),now())
  on conflict(profile_key) do update set last_seen_at=now(),updated_at=now();

  insert into public.traveler_signal_events_v44(
    profile_key,session_id,mission_id,event_type,subject_type,subject_key,value,context
  )
  values(
    v_key,nullif(trim(coalesce(p_session_id,'')),''),
    p_mission_id,v_event,lower(trim(coalesce(p_subject_type,'destination'))),
    nullif(v_subject,''),p_value,coalesce(p_context,'{}'::jsonb)
  )
  returning id into v_id;

  v_delta := case v_event
    when 'destination_selected' then .12
    when 'offer_view' then .04
    when 'outbound_click' then .08
    when 'positive_feedback' then .15
    when 'negative_feedback' then -.10
    else 0
  end;

  if v_delta <> 0 and lower(trim(coalesce(p_subject_type,'')))='destination' and v_subject<>'' then
    -- Select exactly one destination entity first, then expand all of its tags.
    select coalesce(array_agg(t.tag order by t.tag),'{}'::text[])
    into v_tags
    from (
      select jsonb_array_elements_text(coalesce(src.attributes->'tags','[]'::jsonb)) as tag
      from (
        select e.attributes
        from public.travel_knowledge_entities_v44 e
        where e.active
          and e.entity_type='destination'
          and (e.destination_slug=v_subject or e.canonical_key='destination:'||v_subject)
        order by e.quality_score desc nulls last,e.freshness_score desc nulls last
        limit 1
      ) src
    ) t;

    select learned_preferences,preference_weights
    into v_learned,v_explicit
    from public.traveler_intelligence_profiles_v44
    where profile_key=v_key
    for update;

    v_learned := coalesce(v_learned,'{}'::jsonb);
    v_explicit := coalesce(v_explicit,'{}'::jsonb);

    foreach v_tag in array v_tags loop
      -- Attribution guard: selecting a destination does not prove the user likes
      -- every property of that destination. Learn only dimensions that were
      -- actually active in the request/profile that produced the choice.
      v_explicit_weight := greatest(0::real,least(2::real,coalesce((v_explicit->>v_tag)::real,0)));
      if v_explicit_weight < .25 then
        continue;
      end if;

      v_attributed_delta := v_delta * least(1::real,v_explicit_weight);
      v_current := coalesce((v_learned->>v_tag)::real,0);
      v_next := greatest(0::real,least(.35::real,v_current+v_attributed_delta));
      v_learned := jsonb_set(v_learned,array[v_tag],to_jsonb(round(v_next::numeric,4)),true);
      v_applied_tags := array_append(v_applied_tags,v_tag);
    end loop;

    update public.traveler_intelligence_profiles_v44
    set learned_preferences=v_learned,
        confidence=least(1::real,greatest(confidence,.35::real)+
          case when cardinality(v_applied_tags)>0 then least(.20::real,abs(v_delta)/2) else 0 end),
        last_seen_at=now(),
        updated_at=now()
    where profile_key=v_key;
  end if;

  return jsonb_build_object(
    'ok',true,
    'eventId',v_id,
    'learnedDelta',v_delta,
    'destinationTags',to_jsonb(v_tags),
    'appliedTags',to_jsonb(v_applied_tags),
    'profileKey',v_key
  );
end;
$$;

comment on function public.record_traveler_signal_v45 is
'V45.1 attribution-aware persistent learning: learn only destination dimensions that overlap the explicit/current traveler preference vector; cap learned weight at 0.35.';
