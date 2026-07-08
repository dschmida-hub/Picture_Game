-- Closes a real security hole: every write policy on the core game
-- tables ("...during transition" policies) only checked that room_code
-- LOOKED like a valid code, never that the caller was actually a member
-- of that room. Since NEXT_PUBLIC_SUPABASE_ANON_KEY is public by design
-- (it's in the JS bundle), this meant anyone could use it directly
-- against the Supabase REST API - bypassing the app's UI entirely - to
-- rewrite or delete ANY row in ANY room: hijack host status, tamper
-- with scores/votes, deface other players' games.
--
-- Fix: give each browser tab a real Supabase Anonymous Auth identity
-- (auth.uid()), tie it to the players row created at join time, and
-- require it for writes instead of just a plausible-looking room code.
--
-- Run this in Supabase SQL Editor.

-- 1. Link each player row to the browser session that joined as them.
-- Set by the server (service_role, via /api/join-room) after verifying
-- the caller's session token - never trust a client-supplied value here.
alter table public.players
  add column if not exists auth_user_id uuid;

create index if not exists players_auth_user_id_idx
  on public.players (auth_user_id);

-- 2. Helper used by policies below: is the current caller actually a
-- member of this room? Rooms created before this migration have no
-- auth_user_id on any of their players (the column is new), so also
-- allow membership for any such "legacy" room rather than freezing an
-- in-progress game's ability to advance stages the moment this runs.
-- Rooms expire in 24h, so this compatibility window is naturally short.
create or replace function public.is_room_member(room_code_input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.players
      where room_code = room_code_input
        and auth_user_id = auth.uid()
    )
    or not exists (
      select 1 from public.players
      where room_code = room_code_input
        and auth_user_id is not null
    );
$$;

grant execute on function public.is_room_member(text) to anon, authenticated;

-- 3. players: audited - the app has zero direct client writes to this
-- table. Every mutation already goes through service_role API routes
-- (join-room) or SECURITY DEFINER RPCs (heartbeat_player,
-- promote_next_host_if_stale, award_winners_once, remove_player_from_room,
-- start_rematch), all of which bypass grants/RLS entirely and already
-- validate host status server-side. Revoking direct anon write access
-- closes the hole with no functional change to the app.
revoke insert, update, delete on public.players from anon, authenticated;

drop policy if exists "Public can join rooms" on public.players;
drop policy if exists "Public can update players during transition" on public.players;
drop policy if exists "Public can remove players during transition" on public.players;

-- 4. submissions: same audit result - submit-answer, generate-image,
-- regenerate-image, and delete_round_submission all use service_role
-- or SECURITY DEFINER. Revoke direct anon writes.
revoke insert, update, delete on public.submissions from anon, authenticated;

drop policy if exists "Public can create submissions" on public.submissions;
drop policy if exists "Public can update submissions during transition" on public.submissions;
drop policy if exists "Public can delete submissions during transition" on public.submissions;

-- 5. votes: same - /api/vote uses service_role.
revoke insert, update, delete on public.votes from anon, authenticated;

drop policy if exists "Public can vote" on public.votes;
drop policy if exists "Public can delete votes during transition" on public.votes;

-- 6. games: the one table with real direct client writes (stage and
-- deadline transitions), fired by both host and non-host players during
-- normal play (e.g. any player extending their own submission deadline
-- after a rejected image). Room creation itself already goes through
-- create_game_round (SECURITY DEFINER), so anon never needs direct
-- insert - only update, and only for rooms they've actually joined.
revoke insert on public.games from anon, authenticated;

drop policy if exists "Public can create games" on public.games;
drop policy if exists "Public can update games during transition" on public.games;

create policy "Members can update their room's game"
on public.games
for update
to anon, authenticated
using (public.is_room_member(room_code))
with check (public.is_room_member(room_code));

-- 7. round_history: winner-recording fires from every connected client
-- when a round ends (not host-gated), so scope to room membership too.
drop policy if exists "Public can write round history during transition" on public.round_history;
drop policy if exists "Public can update round history during transition" on public.round_history;

create policy "Members can write their room's round history"
on public.round_history
for insert
to anon, authenticated
with check (public.is_room_member(room_code));

create policy "Members can update their room's round history"
on public.round_history
for update
to anon, authenticated
using (public.is_room_member(room_code))
with check (public.is_room_member(room_code));
