-- Backs the daily storage-retention cron (app/api/cron/cleanup-storage).
-- Rooms with no game activity in the last N days get their DB rows and
-- storage objects (avatars, generated images) deleted. round_history
-- (the homepage showcase) is never touched by this - it's retained
-- indefinitely and curated manually via /admin/showcase.

-- Returns room codes whose most recent game is older than `cutoff`, oldest
-- first, capped at `max_rooms` per call as a safety limit on how much a
-- single cron run can delete.
create or replace function public.find_stale_rooms(cutoff timestamptz, max_rooms int default 50)
returns table(room_code text)
language sql
stable
security definer
set search_path = public
as $$
  select g.room_code
  from public.games g
  group by g.room_code
  having max(g.created_at) < cutoff
  order by max(g.created_at) asc
  limit max_rooms;
$$;

revoke all on function public.find_stale_rooms(timestamptz, int) from public;
grant execute on function public.find_stale_rooms(timestamptz, int) to service_role;

-- Deletes every row belonging to one room across all gameplay tables, in an
-- order that doesn't depend on foreign keys existing, wrapped in the
-- function's implicit transaction so a failure partway through rolls the
-- whole room back instead of leaving it half-deleted. Storage objects are
-- deleted separately via the Storage API before this is called.
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
  delete from public.submissions where room_code = room_code_input;
  delete from public.players where room_code = room_code_input;
  delete from public.games where room_code = room_code_input;
end;
$$;

revoke all on function public.purge_stale_room(text) from public;
grant execute on function public.purge_stale_room(text) to service_role;
