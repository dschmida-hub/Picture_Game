-- Closes a real security hole in the host-only and player-identity RPCs:
-- every one of them checks "does *some* row with this id have is_host =
-- true / exist in this room", but never that the row actually belongs to
-- the browser session making the call. Since every player's id and
-- is_host flag are already visible to every other player in the room
-- (the client's own roster query returns them), any player could call
-- these RPCs directly with the real host's id - via the public anon key,
-- same as anon_identity_and_rls_hardening.sql's original hole - and take
-- over the room (kick players, wipe scores, force reveals, claim host)
-- without ever controlling the host's actual session.
--
-- Fix: reuse the auth_user_id identity already established at join time
-- (see anon_identity_and_rls_hardening.sql) and require it to match the
-- calling session for every RPC that takes a player/host id as "this is
-- who's calling". Same compatibility tradeoff as is_room_member: a row
-- with no auth_user_id (legacy room, or a session whose anonymous-auth
-- token failed to establish at join) is treated as unverifiable rather
-- than blocked outright, so a real player is never locked out by this.
--
-- Run this in Supabase SQL Editor.

create or replace function public.is_player_session(
  player_id_input bigint,
  room_code_input text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players
    where id = player_id_input
      and room_code = room_code_input
      and (auth_user_id is null or auth_user_id = auth.uid())
  );
$$;

grant execute on function public.is_player_session(bigint, text) to anon, authenticated;

create or replace function public.remove_player_from_room(
  room_code_input text,
  host_player_id_input bigint,
  player_id_input bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_player_name text;
begin
  if not exists (
    select 1
    from public.players
    where id = host_player_id_input
      and room_code = room_code_input
      and is_host = true
  ) or not public.is_player_session(host_player_id_input, room_code_input) then
    raise exception 'Only the host can remove players';
  end if;

  select name into target_player_name
  from public.players
  where id = player_id_input
    and room_code = room_code_input
    and is_host = false;

  if target_player_name is null then
    raise exception 'Player not found';
  end if;

  delete from public.submissions
  where room_code = room_code_input
    and player_name = target_player_name;

  delete from public.votes
  where room_code = room_code_input
    and (
      voter_name = target_player_name
      or voted_for like target_player_name || ':%'
    );

  delete from public.players
  where id = player_id_input
    and room_code = room_code_input
    and is_host = false;
end;
$$;

create or replace function public.start_rematch(
  room_code_input text,
  host_player_id_input bigint,
  game_id_input bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.players
    where id = host_player_id_input
      and room_code = room_code_input
      and is_host = true
  ) or not public.is_player_session(host_player_id_input, room_code_input) then
    raise exception 'Only the host can start a rematch';
  end if;

  update public.players
  set points = 0
  where room_code = room_code_input;

  update public.games
  set stage = 'lobby'
  where id = game_id_input
    and room_code = room_code_input;
end;
$$;

create or replace function public.create_game_round(
  room_code_input text,
  host_player_id_input bigint,
  prompt_input text,
  prompt_id_input bigint,
  prompt_source_input text,
  game_mode_input text,
  image_style_input text,
  submission_deadline_input timestamptz,
  voting_duration_seconds_input integer,
  content_rating_input text default 'everyone'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_game_id bigint;
begin
  if room_code_input !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'Invalid room code';
  end if;

  if not exists (
    select 1
    from public.players
    where id = host_player_id_input
      and room_code = room_code_input
      and is_host = true
  ) or not public.is_player_session(host_player_id_input, room_code_input) then
    raise exception 'Only the host can start rounds';
  end if;

  if (
    select count(*)
    from public.players
    where room_code = room_code_input
  ) < 2 then
    raise exception 'At least two players are required';
  end if;

  if length(btrim(prompt_input)) < 1 or length(btrim(prompt_input)) > 300 then
    raise exception 'Invalid prompt';
  end if;

  insert into public.games (
    room_code,
    stage,
    prompt,
    prompt_id,
    prompt_source,
    game_mode,
    image_style,
    content_rating,
    submission_deadline,
    voting_duration_seconds,
    winner_awarded
  )
  values (
    room_code_input,
    'submitting',
    btrim(prompt_input),
    prompt_id_input,
    prompt_source_input,
    game_mode_input,
    image_style_input,
    case when content_rating_input = 'pg13' then 'pg13' else 'everyone' end,
    submission_deadline_input,
    voting_duration_seconds_input,
    false
  )
  returning id into new_game_id;

  return new_game_id;
end;
$$;

create or replace function public.delete_round_submission(
  room_code_input text,
  host_player_id_input bigint,
  game_id_input bigint,
  submission_id_input bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_player_name text;
begin
  if not exists (
    select 1 from public.players
    where id = host_player_id_input
      and room_code = room_code_input
      and is_host = true
  ) or not public.is_player_session(host_player_id_input, room_code_input) then
    raise exception 'Only the host can delete submissions';
  end if;

  select player_name into target_player_name
  from public.submissions
  where id = submission_id_input
    and game_id = game_id_input
    and room_code = room_code_input;

  if target_player_name is null then
    raise exception 'Submission not found';
  end if;

  delete from public.votes
  where game_id = game_id_input
    and room_code = room_code_input
    and voted_for like target_player_name || ':%';

  delete from public.submissions
  where id = submission_id_input
    and game_id = game_id_input
    and room_code = room_code_input;
end;
$$;

create or replace function public.force_reveal_round(
  room_code_input text,
  host_player_id_input bigint,
  game_id_input bigint,
  voting_deadline_input timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.players
    where id = host_player_id_input
      and room_code = room_code_input
      and is_host = true
  ) or not public.is_player_session(host_player_id_input, room_code_input) then
    raise exception 'Only the host can reveal images';
  end if;

  if not exists (
    select 1 from public.submissions
    where game_id = game_id_input
      and room_code = room_code_input
      and image_url is not null
  ) then
    raise exception 'At least one finished image is needed before reveal';
  end if;

  delete from public.submissions
  where game_id = game_id_input
    and room_code = room_code_input
    and image_url is null;

  update public.games
  set stage = 'reveal',
      voting_deadline = voting_deadline_input
  where id = game_id_input
    and room_code = room_code_input;
end;
$$;

create or replace function public.return_round_to_lobby(
  room_code_input text,
  host_player_id_input bigint,
  game_id_input bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.players
    where id = host_player_id_input
      and room_code = room_code_input
      and is_host = true
  ) or not public.is_player_session(host_player_id_input, room_code_input) then
    raise exception 'Only the host can return to lobby';
  end if;

  update public.games
  set stage = 'lobby'
  where id = game_id_input
    and room_code = room_code_input;
end;
$$;

create or replace function public.end_voting_now(
  room_code_input text,
  host_player_id_input bigint,
  game_id_input bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.players
    where id = host_player_id_input
      and room_code = room_code_input
      and is_host = true
  ) or not public.is_player_session(host_player_id_input, room_code_input) then
    raise exception 'Only the host can end voting';
  end if;

  if not exists (
    select 1 from public.votes
    where game_id = game_id_input
      and room_code = room_code_input
  ) then
    raise exception 'At least one vote is needed to choose a winner';
  end if;

  update public.games
  set stage = 'winner'
  where id = game_id_input
    and room_code = room_code_input;
end;
$$;

create or replace function public.replace_skipped_round_prompt(
  room_code_input text,
  skipped_game_id_input bigint,
  player_id_input bigint,
  prompt_input text,
  prompt_id_input bigint,
  prompt_source_input text,
  game_mode_input text,
  image_style_input text,
  submission_deadline_input timestamptz,
  voting_duration_seconds_input integer,
  threshold_ratio_input numeric default 0.75,
  content_rating_input text default 'everyone'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_game_id bigint;
  player_count_value integer;
  skip_count_value integer;
  votes_needed_value integer;
begin
  if room_code_input !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'Invalid room code';
  end if;

  if not exists (
    select 1
    from public.players
    where id = player_id_input
      and room_code = room_code_input
  ) or not public.is_player_session(player_id_input, room_code_input) then
    raise exception 'Player not found in this room';
  end if;

  if not exists (
    select 1
    from public.games
    where id = skipped_game_id_input
      and room_code = room_code_input
      and stage = 'submitting'
  ) then
    raise exception 'Skipped round not found';
  end if;

  select count(*)::integer into player_count_value
  from public.players
  where room_code = room_code_input;

  if player_count_value < 2 then
    raise exception 'At least two players are required';
  end if;

  select count(*)::integer into skip_count_value
  from public.prompt_skip_votes
  where room_code = room_code_input
    and game_id = skipped_game_id_input;

  votes_needed_value := greatest(1, ceiling(player_count_value * coalesce(threshold_ratio_input, 0.75))::integer);

  if skip_count_value < votes_needed_value then
    raise exception 'Not enough skip votes yet';
  end if;

  if length(btrim(prompt_input)) < 1 or length(btrim(prompt_input)) > 300 then
    raise exception 'Invalid prompt';
  end if;

  delete from public.votes
  where room_code = room_code_input
    and game_id = skipped_game_id_input;

  delete from public.submissions
  where room_code = room_code_input
    and game_id = skipped_game_id_input;

  update public.games
  set
    stage = 'lobby',
    submission_deadline = null,
    voting_deadline = null
  where id = skipped_game_id_input
    and room_code = room_code_input;

  insert into public.games (
    room_code,
    stage,
    prompt,
    prompt_id,
    prompt_source,
    game_mode,
    image_style,
    content_rating,
    submission_deadline,
    voting_duration_seconds,
    winner_awarded
  )
  values (
    room_code_input,
    'submitting',
    btrim(prompt_input),
    prompt_id_input,
    prompt_source_input,
    game_mode_input,
    image_style_input,
    case when content_rating_input = 'pg13' then 'pg13' else 'everyone' end,
    submission_deadline_input,
    voting_duration_seconds_input,
    false
  )
  returning id into new_game_id;

  return new_game_id;
end;
$$;

-- claim_host and heartbeat_player (party_mode_host_claim.sql /
-- host_migration.sql): same gap, same fix - both take a player_id_input
-- representing "the caller" with no check that the caller's session
-- actually is that player.

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
  if not public.is_player_session(player_id_input, room_code_input) then
    raise exception 'Not authorized to claim host for this player';
  end if;

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

create or replace function public.heartbeat_player(
  room_code_input text,
  player_id_input bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No-op rather than raise: this fires on a ~10s timer for every
  -- connected client, and a session mismatch here should just skip the
  -- last_seen_at update (letting the existing stale-host takeover handle
  -- it) rather than surface a hard error off a background call nobody's
  -- watching for one.
  if not public.is_player_session(player_id_input, room_code_input) then
    return;
  end if;

  update public.players
  set last_seen_at = now()
  where id = player_id_input
    and room_code = room_code_input;
end;
$$;
