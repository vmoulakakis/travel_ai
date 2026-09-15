create index if not exists travel_destination_matches_destination_idx on public.travel_destination_matches(destination_id);
create index if not exists travel_missions_chosen_destination_idx on public.travel_missions(chosen_destination_id) where chosen_destination_id is not null;
create index if not exists travel_research_runs_destination_idx on public.travel_research_runs(destination_id);
