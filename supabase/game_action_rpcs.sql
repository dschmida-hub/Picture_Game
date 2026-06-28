-- Batched/atomic game action RPCs for Picture This.
-- Run this in Supabase SQL Editor.

create or replace function public.submit_room_prompt_suggestion(
  room_code_input text,
  prompt_input text,
  game_mode_input text,
  image_style_input text,
  submitted_by_input text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_suggestion_id bigint;
begin
  if room_code_input !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'Invalid room code';
  end if;

  if length(btrim(prompt_input)) < 1 or length(btrim(prompt_input)) > 180 then
    raise exception 'Invalid prompt';
  end if;

  if length(btrim(submitted_by_input)) < 1 or length(btrim(submitted_by_input)) > 40 then
    raise exception 'Invalid player name';
  end if;

  insert into public.room_prompt_suggestions (
    room_code,
    prompt,
    game_mode,
    image_style,
    submitted_by
  )
  values (
    room_code_input,
    btrim(prompt_input),
    game_mode_input,
    image_style_input,
    btrim(submitted_by_input)
  )
  returning id into new_suggestion_id;

  insert into public.room_prompt_suggestion_votes (
    room_code,
    suggestion_id,
    voter_name
  )
  values (
    room_code_input,
    new_suggestion_id,
    btrim(submitted_by_input)
  )
  on conflict do nothing;

  return new_suggestion_id;
end;
$$;

create or replace function public.vote_for_room_prompt_suggestion(
  room_code_input text,
  suggestion_id_input bigint,
  voter_name_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if room_code_input !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'Invalid room code';
  end if;

  if length(btrim(voter_name_input)) < 1 or length(btrim(voter_name_input)) > 40 then
    raise exception 'Invalid voter name';
  end if;

  insert into public.room_prompt_suggestion_votes (
    room_code,
    suggestion_id,
    voter_name
  )
  values (
    room_code_input,
    suggestion_id_input,
    btrim(voter_name_input)
  )
  on conflict do nothing;
end;
$$;

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
  ) then
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
  ) then
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
  voting_duration_seconds_input integer
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
    submission_deadline_input,
    voting_duration_seconds_input,
    false
  )
  returning id into new_game_id;

  return new_game_id;
end;
$$;

grant execute on function public.submit_room_prompt_suggestion(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.vote_for_room_prompt_suggestion(text, bigint, text) to anon, authenticated, service_role;
grant execute on function public.remove_player_from_room(text, bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.start_rematch(text, bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.create_game_round(text, bigint, text, bigint, text, text, text, timestamptz, integer) to anon, authenticated, service_role;
