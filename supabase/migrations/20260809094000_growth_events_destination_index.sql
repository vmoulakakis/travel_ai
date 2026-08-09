create index if not exists idx_growth_events_destination
  on public.growth_events(destination_id,created_at desc);
