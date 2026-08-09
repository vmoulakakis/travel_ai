alter table public.growth_events
  drop constraint if exists growth_events_event_name_check;

alter table public.growth_events
  add constraint growth_events_event_name_check
  check (event_name in (
    'social_share',
    'stay_selected',
    'thematic_guide_download',
    'guide_download',
    'guide_email_sent',
    'final_exit'
  ));

create index if not exists idx_growth_events_offer_funnel
  on public.growth_events(source_product_id,event_name,created_at desc)
  where source_product_id is not null;
