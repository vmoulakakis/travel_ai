-- V70 server-only privileges.
-- anon/authenticated remain revoked; trusted Next.js backend uses service_role only.

grant select,insert,update,delete on table public.travel_agent_profiles_v70 to service_role;
grant select,insert,update,delete on table public.travel_funnel_sessions_v70 to service_role;
grant select,insert,update,delete on table public.travel_funnel_turns_v70 to service_role;
grant select,insert,update,delete on table public.travel_discovery_snapshots_v70 to service_role;
grant select,insert,update,delete on table public.travel_journeys_v70 to service_role;
grant select,insert,update,delete on table public.travel_tracking_actions_v70 to service_role;
grant usage,select on sequence public.travel_funnel_turns_v70_id_seq to service_role;

alter function public.get_agentic_candidate_universe_v70(integer,text) security invoker;
alter function public.get_agentic_destination_bundle_v70(text[],text,integer,integer) security invoker;

revoke execute on function public.get_agentic_candidate_universe_v70(integer,text) from public,anon,authenticated;
revoke execute on function public.get_agentic_destination_bundle_v70(text[],text,integer,integer) from public,anon,authenticated;
grant execute on function public.get_agentic_candidate_universe_v70(integer,text) to service_role;
grant execute on function public.get_agentic_destination_bundle_v70(text[],text,integer,integer) to service_role;
