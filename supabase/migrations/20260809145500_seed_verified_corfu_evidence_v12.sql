-- Human-reviewed V12 pilot snapshots. These expire automatically and must not
-- be presented after the expiry timestamp. Source URLs remain server-only.

insert into public.destination_evidence_v12 (
  destination_id,evidence_kind,subject_key,subject_name,source_provider,source_url,
  headline,rank_value,review_count,source_month,observed_at,expires_at,confidence,status,fingerprint
) values
  ('corfu','tripadvisor_place_rank','paleokastritsa-beach','Παλαιοκαστρίτσα','Tripadvisor',
   'https://www.tripadvisor.com/Attractions-g189456-Activities-zft11306-Ionian_Islands.html',
   'Νο 1 στις οικογενειακές δραστηριότητες των Ιονίων Νήσων στο επαληθευμένο snapshot.',1,5719,'2026-08-01','2026-08-09T12:00:00+03:00','2026-09-09T12:00:00+03:00',0.92,'verified','corfu:tripadvisor:paleokastritsa:2026-08'),
  ('corfu','tripadvisor_place_rank','corfu-old-town','Παλιά Πόλη Κέρκυρας','Tripadvisor',
   'https://www.tripadvisor.com/Attractions-g189456-Activities-zft11306-Ionian_Islands.html',
   'Νο 2 στις οικογενειακές δραστηριότητες των Ιονίων Νήσων στο επαληθευμένο snapshot.',2,3604,'2026-08-01','2026-08-09T12:00:00+03:00','2026-09-09T12:00:00+03:00',0.92,'verified','corfu:tripadvisor:old-town:2026-08')
on conflict (fingerprint) do update set
  headline=excluded.headline,rank_value=excluded.rank_value,review_count=excluded.review_count,
  observed_at=excluded.observed_at,expires_at=excluded.expires_at,confidence=excluded.confidence,status='verified',updated_at=now();

insert into public.destination_evidence_v12 (
  destination_id,evidence_kind,subject_key,subject_name,source_provider,source_url,
  headline,rating_value,rating_scale,review_count,source_product_id,observed_at,expires_at,
  confidence,status,fingerprint
) values
  ('corfu','booking_property_rating','mon-repos-palace','Mon Repos Palace - Adults Only','Booking.com',
   'https://www.booking.com/hotel/gr/mayor-mon-repos-palace.html',
   'Παρουσία στο Booking.com με guest review snapshot 8,1/10.',8.1,10,2139,'b023-0d21','2026-08-09T12:00:00+03:00','2026-09-09T12:00:00+03:00',0.94,'verified','corfu:booking:mon-repos:b023-0d21:2026-08-09'),
  ('corfu','booking_property_rating','divani-corfu-palace','Divani Corfu Palace','Booking.com',
   'https://www.booking.com/fourstars/city/gr/corfu.html',
   'Παρουσία στο Booking.com με guest review snapshot 8,3/10.',8.3,10,1472,'d189-d1f1','2026-08-09T12:00:00+03:00','2026-09-09T12:00:00+03:00',0.90,'verified','corfu:booking:divani:d189-d1f1:2026-08-09')
on conflict (fingerprint) do update set
  headline=excluded.headline,rating_value=excluded.rating_value,rating_scale=excluded.rating_scale,
  review_count=excluded.review_count,observed_at=excluded.observed_at,expires_at=excluded.expires_at,
  confidence=excluded.confidence,status='verified',updated_at=now();
