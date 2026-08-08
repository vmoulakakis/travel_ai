-- V7 privacy cleanup: these legacy tables were empty and are replaced by
-- 90-day anonymous match_sessions + normalized match_outcomes.
drop view if exists public.destination_month_learning;
drop table if exists public.trip_recommendations;
drop table if exists public.analytics_events;
drop table if exists public.trip_requests;
drop table if exists public.anonymous_sessions;
