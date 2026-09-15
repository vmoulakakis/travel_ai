create table if not exists public.travel_escape_feedback (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.travel_missions(id) on delete cascade,
  destination_slug text not null,
  subject_kind text not null check (subject_kind in ('destination','restaurant','nightlife','attraction','stay')),
  subject_key text not null,
  subject_name text not null,
  went boolean not null default true,
  rating smallint not null check (rating between 1 and 5),
  would_recommend boolean not null,
  comment text,
  visited_on date,
  created_at timestamptz not null default now(),
  unique (mission_id,subject_kind,subject_key)
);

create index if not exists travel_escape_feedback_destination_idx
  on public.travel_escape_feedback(destination_slug,subject_kind,subject_key);
create index if not exists travel_escape_feedback_created_idx
  on public.travel_escape_feedback(created_at desc);

alter table public.travel_escape_feedback enable row level security;
revoke all on table public.travel_escape_feedback from anon, authenticated;
grant select,insert,update on table public.travel_escape_feedback to service_role;

create or replace function public.get_ai_guest_signal_v38(
  p_destination_slug text,
  p_subject_kind text default 'destination',
  p_subject_key text default null
)
returns table(sample_size bigint, avg_rating numeric, recommend_rate numeric, ai_score integer, confidence text)
language sql
stable
security definer
set search_path=public
as $$
  with base as (
    select f.rating::numeric as rating, f.would_recommend
    from public.travel_escape_feedback f
    join public.travel_missions m on m.id=f.mission_id
    where f.went=true
      and f.destination_slug=p_destination_slug
      and f.subject_kind=p_subject_kind
      and (p_subject_key is null or f.subject_key=p_subject_key)
      and coalesce((m.travel_window->>'end')::date,(m.travel_window->>'endDate')::date,current_date) <= current_date
  ), agg as (
    select count(*)::bigint n, avg(rating) avg_r,
           avg(case when would_recommend then 1.0 else 0.0 end) rec
    from base
  )
  select n,
         case when n>0 then round(avg_r,2) else null end,
         case when n>0 then round(rec,3) else null end,
         case when n>=3 then round((((avg_r/5.0)*80.0)+(rec*20.0)) * least(1.0,0.65+ln(n::numeric+1)/8.0))::integer else null end,
         case when n>=20 then 'HIGH' when n>=7 then 'MEDIUM' when n>=3 then 'LOW' else 'INSUFFICIENT' end
  from agg;
$$;

create or replace function public.get_ai_guest_signals_v38(p_destination_slug text)
returns table(subject_kind text, subject_key text, subject_name text, sample_size bigint, avg_rating numeric, recommend_rate numeric, ai_score integer, confidence text)
language sql
stable
security definer
set search_path=public
as $$
  with base as (
    select f.subject_kind,f.subject_key,max(f.subject_name) subject_name,
           count(*)::bigint n,avg(f.rating::numeric) avg_r,
           avg(case when f.would_recommend then 1.0 else 0.0 end) rec
    from public.travel_escape_feedback f
    join public.travel_missions m on m.id=f.mission_id
    where f.went=true and f.destination_slug=p_destination_slug
      and coalesce((m.travel_window->>'end')::date,(m.travel_window->>'endDate')::date,current_date) <= current_date
    group by f.subject_kind,f.subject_key
  )
  select subject_kind,subject_key,subject_name,n,
         round(avg_r,2),round(rec,3),
         case when n>=3 then round((((avg_r/5.0)*80.0)+(rec*20.0)) * least(1.0,0.65+ln(n::numeric+1)/8.0))::integer else null end,
         case when n>=20 then 'HIGH' when n>=7 then 'MEDIUM' when n>=3 then 'LOW' else 'INSUFFICIENT' end
  from base;
$$;

revoke all on function public.get_ai_guest_signal_v38(text,text,text) from public, anon, authenticated;
revoke all on function public.get_ai_guest_signals_v38(text) from public, anon, authenticated;
grant execute on function public.get_ai_guest_signal_v38(text,text,text) to service_role;
grant execute on function public.get_ai_guest_signals_v38(text) to service_role;
