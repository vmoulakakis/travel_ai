-- Explicit default-deny policies for the V12 server-only tables.
-- service_role bypasses RLS; anon/authenticated users match no operation.

drop policy if exists destination_evidence_v12_deny_all on public.destination_evidence_v12;
create policy destination_evidence_v12_deny_all
  on public.destination_evidence_v12
  for all
  to public
  using (false)
  with check (false);

drop policy if exists destination_media_v12_deny_all on public.destination_media_v12;
create policy destination_media_v12_deny_all
  on public.destination_media_v12
  for all
  to public
  using (false)
  with check (false);

drop policy if exists thematic_dossier_runs_v12_deny_all on public.thematic_dossier_runs_v12;
create policy thematic_dossier_runs_v12_deny_all
  on public.thematic_dossier_runs_v12
  for all
  to public
  using (false)
  with check (false);
