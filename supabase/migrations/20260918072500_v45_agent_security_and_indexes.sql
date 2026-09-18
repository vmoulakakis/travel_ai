-- Travel AI V45.4: security hardening and indexes for the now-active agent fabric.

alter view public.travel_agent_tool_health_v45 set (security_invoker = true);
revoke all on public.travel_agent_tool_health_v45 from anon,authenticated;
grant select on public.travel_agent_tool_health_v45 to service_role;

revoke execute on function public.start_travel_agent_run_v44(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.start_travel_agent_run_v44(text,uuid,text,jsonb) to service_role;

revoke execute on function public.bump_traveler_profile_v44() from public,anon,authenticated;
grant execute on function public.bump_traveler_profile_v44() to service_role;

create index if not exists travel_agent_steps_v44_agent_idx
  on public.travel_agent_steps_v44(agent_id);
create index if not exists travel_agent_workflows_v44_agent_idx
  on public.travel_agent_workflows_v44(agent_id);
create index if not exists travel_agent_hypotheses_v44_agent_idx
  on public.travel_agent_hypotheses_v44(agent_id);
create index if not exists travel_decision_ledger_v44_destination_idx
  on public.travel_decision_ledger_v44(destination_slug);
create index if not exists travel_fact_evidence_v44_evidence_idx
  on public.travel_fact_evidence_v44(evidence_id);
create index if not exists traveler_signal_events_v44_mission_idx
  on public.traveler_signal_events_v44(mission_id)
  where mission_id is not null;
