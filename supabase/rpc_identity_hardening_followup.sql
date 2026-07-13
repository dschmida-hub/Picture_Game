-- Follow-up to host_rpc_identity_hardening.sql, closing gaps a fresh
-- independent review caught in that fix:
--
-- 1. create_game_round: host_rpc_identity_hardening.sql hardened the
--    10-argument signature from game_action_rpcs.sql/allow_solo_rounds.sql.
--    But party_mode.sql (committed after those, before this) had already
--    superseded it with an 11-argument version (added party_mode_input)
--    and explicitly dropped the 10-arg one. Postgres treats different
--    argument counts as distinct overloads, so re-hardening the 10-arg
--    signature just created a dead, unreachable copy - the real client
--    (app/game/[code]/page.tsx) always passes party_mode_input, which
--    resolves to the 11-arg overload, which was never hardened at all.
--    Any anon-key browser could call it with another player's
--    host_player_id_input and start rounds as if they were host, fully
--    bypassing the identity check the earlier migration was supposed to
--    add. Fixed here by hardening the actual live 11-arg signature and
--    dropping the dead 10-arg one this file's predecessor created.
--
-- 2. replace_skipped_round_prompt: same signature both times (so the
--    earlier hardening pass did correctly take effect on the real
--    function, no security gap there) - but it was copied from
--    game_action_rpcs.sql's pre-solo-rounds body instead of
--    allow_solo_rounds.sql's, silently reverting the "1 player is enough"
--    allowance for the public solo demo back to "2 players required".
--    Fixed by restoring the < 1 check.
--
-- 3. vote_to_skip_round_prompt: takes player_id_input as "the caller" the
--    same way every other hardened RPC does, but was missed entirely by
--    the original pass (it isn't host-gated, so it didn't fit that file's
--    "host-only RPCs" framing, but the identity gap is identical - any
--    player could cast a skip vote as any other player id in the room).
--    Fixed by adding the same is_player_session check.
--
-- Run this in Supabase SQL Editor.

drop function if exists public.create_game_round(text, bigint, text, bigint, text, text, text, timestamptz, integer, text);

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
  content_rating_input text default 'everyone',
  party_mode_input boolean default false
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
  ) < 1 then
    raise exception 'At least one player is required';
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
    winner_awarded,
    party_mode
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
    false,
    coalesce(party_mode_input, false)
  )
  returning id into new_game_id;

  return new_game_id;
end;
$$;

grant execute on function public.create_game_round(text, bigint, text, bigint, text, text, text, timestamptz, integer, text, boolean) to anon, authenticated, service_role;

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

  if player_count_value < 1 then
    raise exception 'At least one player is required';
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

create or replace function public.vote_to_skip_round_prompt(
  room_code_input text,
  game_id_input bigint,
  player_id_input bigint,
  threshold_ratio_input numeric default 0.75
)
returns table (
  skip_count integer,
  player_count integer,
  votes_needed integer,
  skipped boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  voter_name_value text;
  prompt_id_value bigint;
  prompt_source_value text;
  game_stage_value text;
begin
  if room_code_input !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'Invalid room code';
  end if;

  if not public.is_player_session(player_id_input, room_code_input) then
    raise exception 'Player not found in this room';
  end if;

  select name into voter_name_value
  from public.players
  where id = player_id_input
    and room_code = room_code_input;

  if voter_name_value is null then
    raise exception 'Player not found in this room';
  end if;

  select prompt_id, prompt_source, stage
    into prompt_id_value, prompt_source_value, game_stage_value
  from public.games
  where id = game_id_input
    and room_code = room_code_input;

  if prompt_id_value is null then
    raise exception 'Prompt not found for this round';
  end if;

  if game_stage_value <> 'submitting' then
    raise exception 'Prompt skip voting is only available while submitting';
  end if;

  insert into public.prompt_skip_votes (
    room_code,
    game_id,
    voter_name
  )
  values (
    room_code_input,
    game_id_input,
    voter_name_value
  )
  on conflict do nothing;

  select count(*)::integer into player_count
  from public.players
  where room_code = room_code_input;

  select count(*)::integer into skip_count
  from public.prompt_skip_votes
  where room_code = room_code_input
    and game_id = game_id_input;

  votes_needed := greatest(1, ceiling(player_count * coalesce(threshold_ratio_input, 0.75))::integer);
  skipped := skip_count >= votes_needed;

  if skipped then
    if prompt_source_value = 'classic' then
      update public.prompts
      set prompt_rating = 'bad'
      where id = prompt_id_value;
    elsif prompt_source_value = 'cards' then
      update public.cah_prompts
      set prompt_rating = 'bad'
      where id = prompt_id_value;
    end if;

  end if;

  return next;
end;
$$;

grant execute on function public.vote_to_skip_round_prompt(text, bigint, bigint, numeric) to anon, authenticated, service_role;
