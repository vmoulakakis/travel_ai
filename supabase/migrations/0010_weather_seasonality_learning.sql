alter table public.trip_requests add column if not exists start_date date;
alter table public.trip_requests add column if not exists end_date date;
alter table public.trip_requests add column if not exists distance_preference text;
alter table public.trip_requests add column if not exists pace text;
alter table public.trip_requests add column if not exists hotel_style text;
alter table public.trip_requests add column if not exists avoid text;
alter table public.trip_requests add column if not exists language text;

create table if not exists public.destination_daily_signals (
  snapshot_date date not null default current_date,
  location_label text not null,
  active_offer_count integer not null default 0,
  property_count integer not null default 0,
  demand_proxy_sum numeric not null default 0,
  min_price numeric,
  median_price numeric,
  max_discount numeric,
  observed_at timestamptz not null default now(),
  primary key (snapshot_date, location_label)
);
alter table public.destination_daily_signals enable row level security;
create index if not exists idx_destination_daily_signals_location_date on public.destination_daily_signals(location_label, snapshot_date desc);

create or replace function public.capture_destination_daily_signals()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare n integer;
begin
  insert into public.destination_daily_signals(snapshot_date,location_label,active_offer_count,property_count,demand_proxy_sum,min_price,median_price,max_discount,observed_at)
  select current_date, location_label, count(*)::int, count(distinct place_id)::int, coalesce(sum(demand_proxy),0), min(price), percentile_cont(0.5) within group(order by price) filter(where price is not null), max(discount), now()
  from public.stay_offers
  where tracking_url is not null and tracking_url<>'' and in_stock is distinct from false and location_label is not null and trim(location_label)<>''
  group by location_label
  on conflict(snapshot_date,location_label) do update set active_offer_count=excluded.active_offer_count,property_count=excluded.property_count,demand_proxy_sum=excluded.demand_proxy_sum,min_price=excluded.min_price,median_price=excluded.median_price,max_discount=excluded.max_discount,observed_at=excluded.observed_at;
  get diagnostics n=row_count;
  return n;
end;
$$;
revoke all on function public.capture_destination_daily_signals() from public,anon,authenticated;
grant execute on function public.capture_destination_daily_signals() to service_role;

create or replace view public.destination_month_learning as
select extract(month from tr.start_date)::int as travel_month,
       ae.payload->>'destinationId' as destination_id,
       count(*) filter(where ae.event_name='destination_selected') as selections,
       count(*) filter(where ae.event_name='offer_unlock') as offer_unlocks,
       count(*) filter(where ae.event_name='outbound_click') as outbound_clicks,
       count(*) filter(where ae.event_name in ('conversion','approved_conversion')) as conversions,
       max(ae.occurred_at) as last_event_at
from public.analytics_events ae
join public.trip_requests tr on tr.id=ae.trip_request_id
where tr.start_date is not null and ae.payload ? 'destinationId'
group by extract(month from tr.start_date)::int, ae.payload->>'destinationId';

select public.capture_destination_daily_signals();

do $$
declare jid bigint;
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for jid in select jobid from cron.job where jobname='capture-destination-daily-signals' loop perform cron.unschedule(jid); end loop;
    perform cron.schedule('capture-destination-daily-signals','40 2 * * *','select public.capture_destination_daily_signals();');
  end if;
end$$;
