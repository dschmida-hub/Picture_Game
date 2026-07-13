-- Closes the concurrent-generation race the final review pass flagged:
-- two requests for the SAME submission could both pass the "no image
-- yet" / "under the regen limit" check and both trigger a real paid
-- generation call, since nothing was written to the row until after the
-- (15-20s) generation finished. Whichever DB write landed last won; the
-- other image was silently orphaned in storage, and the room paid twice.
--
-- Fix: claim the row with a single atomic UPDATE ... WHERE ... (Postgres
-- row locking means only one concurrent request can win it - the loser
-- sees 0 rows affected) before ever calling the image provider. No RPC
-- needed - PostgREST already issues a single atomic UPDATE statement for
-- a call like .update(...).eq(...).is(...), which is exactly what closes
-- this race.
--
-- Run this in Supabase SQL Editor.

alter table public.submissions
  add column if not exists generation_claimed_at timestamptz;
