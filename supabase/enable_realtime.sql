-- Enables Supabase Realtime (postgres_changes) for the tables the game room
-- page needs to react to instantly, replacing the old 2-second client poll.
-- Run this once in the Supabase SQL editor. Existing RLS SELECT policies on
-- these tables already govern what the anon key can receive over Realtime -
-- no policy changes needed here.

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.prompt_skip_votes;
alter publication supabase_realtime add table public.room_prompt_suggestions;
alter publication supabase_realtime add table public.image_reports;
