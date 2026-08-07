create index if not exists idx_trip_requests_anonymous_session_id on trip_requests(anonymous_session_id);
create index if not exists idx_trip_recommendations_trip_request_id on trip_recommendations(trip_request_id);
create index if not exists idx_analytics_events_trip_request_id on analytics_events(trip_request_id);
