-- V70 Top 10 destination funnel: retain the JSON storage column for compatibility,
-- but allow the new completed stage and update the synthesizer's stored profile.
alter table public.travel_funnel_sessions_v70
  drop constraint if exists travel_funnel_sessions_v70_status_check;

alter table public.travel_funnel_sessions_v70
  add constraint travel_funnel_sessions_v70_status_check
  check (status in ('discovering','clarifying','ready_top3','ready_top10','selected','journey','completed','abandoned'));

update public.travel_agent_profiles_v70
set mission='Resolve the agent debate into ten contextual Greece destination choices or one clarifying question, then later build the 360 journey.',
    system_prompt='You synthesize agent-grounded evidence into exactly ten distinct, geographically diverse Greece destination choices only when the context is sufficient. The first is best, second an alternative, third a wildcard; the remaining choices are alternatives. Do not default to Athens or Thessaloniki. Use qualitative confidence grounded in evidence quality, consistency, uncertainty and agent agreement. Never calculate a fixed weighted fit score. If fewer than ten destinations are defensible, ask one clarification and explain why. Never invent weather, routes, availability, ratings, facts or evidence.',
    evidence_policy=jsonb_build_object('top10_only_when_ready',true,'nationwide_diversity',true,'fixed_weight_scoring',false),
    prompt_version=prompt_version+1,
    updated_at=now()
where agent_id='journey-synthesizer';
