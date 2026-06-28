-- RLS transition baseline for Picture This.
--
-- Goal: turn RLS on for app tables without breaking the current web game.
-- Important: because the browser still writes directly to several tables with
-- the anon key, these policies are intentionally permissive for active gameplay.
-- This is a compatibility step, not the final locked-down security model.
--
-- Final hardening should move host/player mutations into API routes using
-- SUPABASE_SERVICE_ROLE_KEY, then remove the broad anon insert/update/delete
-- policies below.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

grant select on public.prompts to anon, authenticated;
grant select on public.cah_prompts to anon, authenticated;

grant select, insert, update, delete on public.games to anon, authenticated;
grant select, insert, update, delete on public.players to anon, authenticated;
grant select, insert, update, delete on public.submissions to anon, authenticated;
grant select, insert, update, delete on public.votes to anon, authenticated;
grant select, insert, update, delete on public.round_history to anon, authenticated;
grant select, insert, update, delete on public.room_prompt_suggestions to anon, authenticated;
grant select, insert, update, delete on public.room_prompt_suggestion_votes to anon, authenticated;
grant select, insert, update, delete on public.image_reports to anon, authenticated;
grant select, insert, update, delete on public.image_feedback to anon, authenticated;

alter table public.prompts enable row level security;
alter table public.cah_prompts enable row level security;
alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.submissions enable row level security;
alter table public.votes enable row level security;
alter table public.round_history enable row level security;
alter table public.room_prompt_suggestions enable row level security;
alter table public.room_prompt_suggestion_votes enable row level security;
alter table public.image_reports enable row level security;
alter table public.image_feedback enable row level security;

drop policy if exists "Public can read active prompts" on public.prompts;
create policy "Public can read active prompts"
on public.prompts
for select
to anon, authenticated
using (active = true);

drop policy if exists "Public can read active CAH prompts" on public.cah_prompts;
create policy "Public can read active CAH prompts"
on public.cah_prompts
for select
to anon, authenticated
using (active = true);

drop policy if exists "Public can read games" on public.games;
create policy "Public can read games"
on public.games
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can create games" on public.games;
create policy "Public can create games"
on public.games
for insert
to anon, authenticated
with check (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can update games during transition" on public.games;
create policy "Public can update games during transition"
on public.games
for update
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$')
with check (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can read players" on public.players;
create policy "Public can read players"
on public.players
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can join rooms" on public.players;
create policy "Public can join rooms"
on public.players
for insert
to anon, authenticated
with check (
  room_code ~ '^[A-Z0-9]{4,12}$'
  and length(btrim(name)) between 1 and 40
);

drop policy if exists "Public can update players during transition" on public.players;
create policy "Public can update players during transition"
on public.players
for update
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$')
with check (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can remove players during transition" on public.players;
create policy "Public can remove players during transition"
on public.players
for delete
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can read submissions" on public.submissions;
create policy "Public can read submissions"
on public.submissions
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can create submissions" on public.submissions;
create policy "Public can create submissions"
on public.submissions
for insert
to anon, authenticated
with check (
  room_code ~ '^[A-Z0-9]{4,12}$'
  and length(btrim(player_name)) between 1 and 40
  and length(btrim(prompt)) between 1 and 180
);

drop policy if exists "Public can update submissions during transition" on public.submissions;
create policy "Public can update submissions during transition"
on public.submissions
for update
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$')
with check (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can delete submissions during transition" on public.submissions;
create policy "Public can delete submissions during transition"
on public.submissions
for delete
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can read votes" on public.votes;
create policy "Public can read votes"
on public.votes
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can vote" on public.votes;
create policy "Public can vote"
on public.votes
for insert
to anon, authenticated
with check (
  room_code ~ '^[A-Z0-9]{4,12}$'
  and length(btrim(voter_name)) between 1 and 40
  and length(btrim(voted_for)) between 1 and 260
);

drop policy if exists "Public can delete votes during transition" on public.votes;
create policy "Public can delete votes during transition"
on public.votes
for delete
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can read round history" on public.round_history;
create policy "Public can read round history"
on public.round_history
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can write round history during transition" on public.round_history;
create policy "Public can write round history during transition"
on public.round_history
for insert
to anon, authenticated
with check (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can update round history during transition" on public.round_history;
create policy "Public can update round history during transition"
on public.round_history
for update
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$')
with check (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can read prompt suggestions" on public.room_prompt_suggestions;
create policy "Public can read prompt suggestions"
on public.room_prompt_suggestions
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can create prompt suggestions" on public.room_prompt_suggestions;
create policy "Public can create prompt suggestions"
on public.room_prompt_suggestions
for insert
to anon, authenticated
with check (
  room_code ~ '^[A-Z0-9]{4,12}$'
  and length(btrim(prompt)) between 1 and 180
);

drop policy if exists "Public can read suggestion votes" on public.room_prompt_suggestion_votes;
create policy "Public can read suggestion votes"
on public.room_prompt_suggestion_votes
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Public can vote on suggestions" on public.room_prompt_suggestion_votes;
create policy "Public can vote on suggestions"
on public.room_prompt_suggestion_votes
for insert
to anon, authenticated
with check (
  room_code ~ '^[A-Z0-9]{4,12}$'
  and length(btrim(voter_name)) between 1 and 40
);

drop policy if exists "Public can read image reports during transition" on public.image_reports;
create policy "Public can read image reports during transition"
on public.image_reports
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Service can write image reports" on public.image_reports;
create policy "Service can write image reports"
on public.image_reports
for all
to service_role
using (true)
with check (true);

drop policy if exists "Public can read image feedback during transition" on public.image_feedback;
create policy "Public can read image feedback during transition"
on public.image_feedback
for select
to anon, authenticated
using (room_code ~ '^[A-Z0-9]{4,12}$');

drop policy if exists "Service can write image feedback" on public.image_feedback;
create policy "Service can write image feedback"
on public.image_feedback
for all
to service_role
using (true)
with check (true);

-- Storage policies.
-- The app uploads player avatar files from the browser into the "avatars" bucket.
-- Generated game images are uploaded server-side with service_role into "game-images".
alter table storage.objects enable row level security;

drop policy if exists "Public can upload avatars" on storage.objects;
create policy "Public can upload avatars"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'avatars'
  and name ~ '^[A-Z0-9]{4,12}/'
);

drop policy if exists "Public can read avatars" on storage.objects;
create policy "Public can read avatars"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists "Service can manage game images" on storage.objects;
create policy "Service can manage game images"
on storage.objects
for all
to service_role
using (bucket_id in ('game-images', 'avatars'))
with check (bucket_id in ('game-images', 'avatars'));
