-- Supports starting a game in Party Mode directly from the homepage: the
-- device that clicks "Start Free Game" becomes the TV/presenter (not a
-- player), so nobody is automatically "first to join" anymore - the
-- existing is_host = isFirstPlayer rule in /api/join-room has nothing to
-- attach to. This adds an explicit claim step instead.
--
-- Run this in Supabase SQL Editor.

-- Needed to time the auto-claim fallback below (players.last_seen_at gets
-- overwritten by every heartbeat, so it can't tell us when someone joined).
alter table public.players
  add column if not exists created_at timestamptz not null default now();

-- A player explicitly claims host. No-ops (returns false) if someone
-- already has it - first claim wins, no race-condition special-casing
-- needed for a party game.
create or replace function public.claim_host(
  room_code_input text,
  player_id_input bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  already_has_host boolean;
begin
  select exists (
    select 1 from public.players
    where room_code = room_code_input and is_host = true
  ) into already_has_host;

  if already_has_host then
    return false;
  end if;

  update public.players
  set is_host = true
  where id = player_id_input and room_code = room_code_input;

  return true;
end;
$$;

grant execute on function public.claim_host(text, bigint) to anon, authenticated;

-- Safety net so a room can't get stuck with no host forever if nobody
-- taps "Become the Host": once the earliest player has been sitting in an
-- unclaimed room for a while, promote them automatically. Called
-- opportunistically from the existing player heartbeat (every ~10s), so
-- no separate cron/timer is needed.
create or replace function public.auto_claim_host_if_unclaimed(
  room_code_input text,
  min_wait_seconds integer default 25
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  already_has_host boolean;
  earliest_player_id bigint;
  earliest_created_at timestamptz;
begin
  select exists (
    select 1 from public.players
    where room_code = room_code_input and is_host = true
  ) into already_has_host;

  if already_has_host then
    return;
  end if;

  select id, created_at into earliest_player_id, earliest_created_at
  from public.players
  where room_code = room_code_input
  order by id asc
  limit 1;

  if earliest_player_id is null then
    return;
  end if;

  if earliest_created_at > now() - make_interval(secs => min_wait_seconds) then
    return;
  end if;

  update public.players set is_host = true where id = earliest_player_id;
end;
$$;

grant execute on function public.auto_claim_host_if_unclaimed(text, integer) to anon, authenticated;
