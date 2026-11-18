-- Kun ny GLS/PostNord booking: beskytter mod dobbelte API-kald.
-- Eksisterende DAO-ordrer og udbetalingsflow påvirkes ikke.
alter table public.orders
  add column if not exists shipping_booking_started_at timestamptz;
