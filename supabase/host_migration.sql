-- Auto-promote a new host when the current host goes stale (tab closed,
-- app backgrounded, connection dropped) so a room doesn't soft-lock.
-- Run this in Supabase SQL Editor.

alter table public.players
  add column if not exists last_seen_at timestamptz not null default now();

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
  update public.players
  set last_seen_at = now()
  where id = player_id_input
    and room_code = room_code_input;
end;
$$;

grant execute on function public.heartbeat_player(text, bigint) to anon, authenticated, service_role;

create or replace function public.promote_next_host_if_stale(
  room_code_input text,
  stale_seconds integer default 45
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_host_id bigint;
  current_host_last_seen timestamptz;
  next_host_id bigint;
begin
  select id, last_seen_at into current_host_id, current_host_last_seen
  from public.players
  where room_code = room_code_input and is_host = true
  order by id asc
  limit 1;

  if current_host_id is null then
    return;
  end if;

  if current_host_last_seen >= now() - make_interval(secs => stale_seconds) then
    return;
  end if;

  select id into next_host_id
  from public.players
  where room_code = room_code_input
    and id != current_host_id
    and last_seen_at >= now() - make_interval(secs => stale_seconds)
  order by last_seen_at desc
  limit 1;

  if next_host_id is null then
    return;
  end if;

  update public.players set is_host = false where id = current_host_id;
  update public.players set is_host = true where id = next_host_id;
end;
$$;

grant execute on function public.promote_next_host_if_stale(text, integer) to anon, authenticated, service_role;
