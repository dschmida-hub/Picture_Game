-- Allow a room to start a round solo (1 player), for the public demo/
-- Reddit-linked solo trial. Solo rounds skip voting entirely on the
-- client (there's no one to vote against) and auto-award the lone
-- player once their image is ready. Run this in Supabase SQL Editor.

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
  ) then
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
  ) then
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
