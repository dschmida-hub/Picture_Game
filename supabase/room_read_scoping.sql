-- Closes the read-side counterpart of the hole
-- anon_identity_and_rls_hardening.sql closed for writes: every SELECT
-- policy on the core game tables only checked that room_code LOOKED like
-- a valid code (`room_code ~ '^[A-Z0-9]{4,12}$'`), never that the caller
-- was actually a member of that room. Since NEXT_PUBLIC_SUPABASE_ANON_KEY
-- is public by design, this meant anyone could read every room's players,
-- written answers, images, votes, and history - past or present, not just
-- the room they joined - directly against the Supabase REST API. Supabase
-- Realtime enforces the same SELECT policies for postgres_changes, so this
-- also let anyone subscribe to live updates for any room.
--
-- Fix: reuse the real anonymous-auth identity (auth.uid()) already
-- established for writes. Players already get one at join time. TV Mode
-- (a spectator, not a player) gets a new lightweight "room viewer"
-- registration. Reads are scoped to "you're a player in this room, or a
-- registered viewer of it" - no bootstrap/legacy fallback, since unlike
-- the write policy this isn't protecting an in-flight game from going
-- dark mid-migration (see rollout note at the bottom of this file).
--
-- The homepage's public showcase (recent winning images) and its "does
-- this room exist" check for the join form legitimately need to work
-- without room membership, so those move to narrow, purpose-built RPCs
-- that expose only what the homepage actually shows - not raw table
-- access.
--
-- Run this in Supabase SQL Editor AFTER the client code that calls
-- register_room_viewer / the new RPCs below has been deployed. Deploying
-- SQL first would blank out any TV Mode tab that's already open until it
-- reloads with the new client code.

-- 1. TV Mode / spectator registration. A lightweight parallel to how
-- players.auth_user_id proves room membership, for sessions that watch a
-- room without joining it as a scoring player.
create table if not exists public.room_viewers (
  room_code text not null,
  auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (room_code, auth_user_id)
);

alter table public.room_viewers enable row level security;
-- Deliberately no anon/authenticated grants here - only reachable through
-- register_room_viewer() below and read internally by is_room_participant().

create or replace function public.register_room_viewer(room_code_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'An anonymous session is required to watch a room.';
  end if;

  if room_code_input !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'Invalid room code.';
  end if;

  insert into public.room_viewers (room_code, auth_user_id)
  values (room_code_input, auth.uid())
  on conflict (room_code, auth_user_id) do nothing;
end;
$$;

grant execute on function public.register_room_viewer(text) to anon, authenticated;

-- 2. The actual access check used by every read policy below: a real
-- player in this room, or a registered viewer of it.
create or replace function public.is_room_participant(room_code_input text)
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
    or exists (
      select 1 from public.room_viewers
      where room_code = room_code_input
        and auth_user_id = auth.uid()
    );
$$;

grant execute on function public.is_room_participant(text) to anon, authenticated;

-- 3. Replace every format-only SELECT policy with a real membership check.
drop policy if exists "Public can read games" on public.games;
create policy "Room participants can read games"
on public.games
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read players" on public.players;
create policy "Room participants can read players"
on public.players
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read submissions" on public.submissions;
create policy "Room participants can read submissions"
on public.submissions
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read votes" on public.votes;
create policy "Room participants can read votes"
on public.votes
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read round history" on public.round_history;
create policy "Room participants can read round history"
on public.round_history
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read prompt suggestions" on public.room_prompt_suggestions;
create policy "Room participants can read prompt suggestions"
on public.room_prompt_suggestions
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read suggestion votes" on public.room_prompt_suggestion_votes;
create policy "Room participants can read suggestion votes"
on public.room_prompt_suggestion_votes
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read image reports during transition" on public.image_reports;
create policy "Room participants can read image reports"
on public.image_reports
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read image feedback during transition" on public.image_feedback;
create policy "Room participants can read image feedback"
on public.image_feedback
for select
to anon, authenticated
using (public.is_room_participant(room_code));

drop policy if exists "Public can read prompt skip votes" on public.prompt_skip_votes;
create policy "Room participants can read prompt skip votes"
on public.prompt_skip_votes
for select
to anon, authenticated
using (public.is_room_participant(room_code));

-- 4. The homepage's public showcase and "does this room exist" check are
-- legitimately public (no room membership possible before you've joined
-- anything), so they move to narrow RPCs that return only what the
-- homepage actually displays instead of raw table access.
create or replace function public.room_exists(room_code_input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    room_code_input ~ '^[A-Z0-9]{4,12}$'
    and (
      exists (select 1 from public.players where room_code = room_code_input)
      or exists (select 1 from public.games where room_code = room_code_input)
    );
$$;

grant execute on function public.room_exists(text) to anon, authenticated;

create or replace function public.get_homepage_showcase()
returns table(answer text, image_url text, question text)
language sql
stable
security definer
set search_path = public
as $$
  select
    rh.winner_prompt as answer,
    coalesce(rh.gallery_thumbnail_url, rh.winner_image_url) as image_url,
    coalesce(g.prompt, 'A recent winning prompt') as question
  from public.round_history rh
  left join public.games g on g.id = rh.game_id
  where rh.winner_image_url is not null
    and rh.hidden_at is null
  order by rh.id desc
  limit 8;
$$;

grant execute on function public.get_homepage_showcase() to anon, authenticated;

create or replace function public.get_homepage_stats()
returns table(games_count bigint, images_count bigint, players_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.round_history) as games_count,
    (select count(*) from public.submissions where image_url is not null) as images_count,
    (select count(*) from public.players) as players_count;
$$;

grant execute on function public.get_homepage_stats() to anon, authenticated;

-- 5. Keep room_viewers from growing forever - clean it up alongside
-- everything else purge_stale_room already deletes for an expired room.
create or replace function public.purge_stale_room(room_code_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.image_reports where room_code = room_code_input;
  delete from public.votes where room_code = room_code_input;
  delete from public.prompt_skip_votes where room_code = room_code_input;
  delete from public.room_prompt_suggestions where room_code = room_code_input;
  delete from public.room_viewers where room_code = room_code_input;
  delete from public.submissions where room_code = room_code_input;
  delete from public.players where room_code = room_code_input;
  delete from public.games where room_code = room_code_input;
end;
$$;

revoke all on function public.purge_stale_room(text) from public;
grant execute on function public.purge_stale_room(text) to service_role;

-- Rollout note: is_room_participant has no "no members yet" bootstrap
-- fallback (unlike is_room_member, used for writes). That fallback exists
-- there to keep in-flight games writable through the moment the write
-- migration runs, for tabs that already have a persisted session from
-- before it. The same protection applies here for free: anyone who has
-- already joined a room has a persisted anon-auth session from that join,
-- which supabase-js reattaches automatically on every request without
-- needing new client code, so their reads keep working the instant this
-- runs. The one gap is TV Mode, which never established a session or
-- viewer registration before this migration - that's why the client code
-- must ship first.
