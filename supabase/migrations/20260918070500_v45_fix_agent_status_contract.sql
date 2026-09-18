-- V45.2: align run finalization with the existing V44 status constraints.
create or replace function public.finish_travel_agent_run_v45(
  p_run_id uuid,
  p_status text,
  p_result jsonb default '{}'::jsonb,
  p_confidence real default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_status text;
  v_rollup jsonb;
begin
  v_status := case lower(coalesce(p_status,''))
    when 'succeeded' then 'completed'
    when 'completed' then 'completed'
    when 'failed' then 'failed'
    when 'partial' then 'partial'
    when 'cancelled' then 'cancelled'
    else 'partial'
  end;

  update public.travel_agent_runs_v44
  set status=v_status,
      result_snapshot=coalesce(p_result,'{}'::jsonb),
      confidence=case when p_confidence is null then confidence else greatest(0::real,least(1::real,p_confidence)) end,
      completed_at=now(),
      updated_at=now()
  where id=p_run_id;

  select public.rollup_travel_agent_run_v44(p_run_id) into v_rollup;
  return coalesce(v_rollup,'{}'::jsonb) || jsonb_build_object('status',v_status);
end;
$$;
