-- Travel Guru V9 security hardening.
-- No travel content is modified by this migration.

-- Semantic dimensions are private runtime metadata. The application reaches
-- them only through server-side functions, so no browser role needs access.
alter table public.semantic_dimensions enable row level security;
revoke all on table public.semantic_dimensions from anon, authenticated;

-- Training examples contain internal learning features. Evaluate the
-- underlying table permissions as the caller and keep browser roles out.
alter view public.match_training_examples set (security_invoker = true);
alter view public.v8_match_training_examples set (security_invoker = true);
revoke all on table public.match_training_examples from anon, authenticated;
revoke all on table public.v8_match_training_examples from anon, authenticated;

-- Pin name resolution for the immutable helper.
alter function public.v8_month_profile(text) set search_path = pg_catalog, public;

-- Support the existing match outcome foreign-key access path.
create index if not exists idx_match_outcomes_session_id
  on public.match_outcomes(session_id);
