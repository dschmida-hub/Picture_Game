-- Adds "Party Mode": a host-selectable, per-round toggle where the reveal
-- stage shows submitted images one at a time (paced for a shared TV/laptop
-- screen) instead of the normal all-at-once voting grid. Run this in the
-- Supabase SQL Editor.

alter table public.games add column if not exists party_mode boolean not null default false;
alter table public.games add column if not exists reveal_started_at timestamptz;

-- Superseding the 10-arg version from allow_solo_rounds.sql with an 11th
-- (defaulted) party_mode_input param. Postgres treats a different arg count
-- as a distinct overload, so the old signature is dropped explicitly rather
-- than left dangling alongside the new one.
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
