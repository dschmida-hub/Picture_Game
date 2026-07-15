-- Two related game-flow fixes. Run this in the Supabase SQL Editor, after
-- host_rpc_identity_hardening.sql (this file's function bodies are based on
-- that later version, not the original ones in game_action_rpcs.sql, so the
-- is_player_session() identity checks are preserved).
--
-- 1) end_voting_now previously refused to end a round with zero votes cast,
--    which permanently stalled any round where the voting timer expired
--    before anyone voted (small rooms, an AFK player, etc). The client now
--    handles a zero-vote result gracefully (see loadWinner() in
--    app/game/[code]/page.tsx), so this guard is no longer needed.
--
-- 2) voted_for is stored as "<player_name>: <prompt>" and two cleanup
--    queries used `voted_for like target_player_name || ':%'` to find a
--    removed/deleted player's votes. Player names aren't restricted from
--    containing a colon, so a name like "Bob: The Builder" would break that
--    match (and, on the client side, broke loadWinner()'s parsing of the
--    same composite string). The app now stores voted_for as
--    "<player_name>|||<prompt>" instead (see app/api/vote/route.ts), so
--    these cleanup queries are updated to match. The LIKE pattern also now
--    escapes any literal LIKE wildcard characters in the player name.

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

  update public.games
  set stage = 'winner'
  where id = game_id_input
    and room_code = room_code_input;
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
      or voted_for like replace(replace(target_player_name, '%', '\%'), '_', '\_') || '|||%' escape '\'
    );

  delete from public.players
  where id = player_id_input
    and room_code = room_code_input
    and is_host = false;
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
    and voted_for like replace(replace(target_player_name, '%', '\%'), '_', '\_') || '|||%' escape '\';

  delete from public.submissions
  where id = submission_id_input
    and game_id = game_id_input
    and room_code = room_code_input;
end;
$$;
