-- Optional cleanup: make game_id columns numeric so they match public.games.id.
-- Run this after supabase/costs_and_reports.sql is working.
--
-- If this raises an error about bad game_id values, run:
-- select id, game_id from public.submissions where game_id is null or btrim(game_id) = '' or game_id !~ '^[0-9]+$';
-- select id, game_id from public.votes where game_id is null or btrim(game_id) = '' or game_id !~ '^[0-9]+$';
-- Then fix/delete those old bad rows before rerunning.

drop view if exists public.game_cost_summary;

do $$
declare
  bad_game_id_count integer;
  current_data_type text;
begin
  select data_type
  into current_data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'submissions'
    and column_name = 'game_id';

  if current_data_type in ('character varying', 'text') then
    select count(*)
    into bad_game_id_count
    from public.submissions
    where game_id is null
      or btrim(game_id) = ''
      or game_id !~ '^[0-9]+$';

    if bad_game_id_count > 0 then
      raise exception 'public.submissions has % non-numeric game_id value(s). Fix those rows before converting game_id to bigint.', bad_game_id_count;
    end if;

    alter table public.submissions
      alter column game_id type bigint using game_id::bigint;
  end if;
end $$;

do $$
declare
  bad_game_id_count integer;
  current_data_type text;
begin
  select data_type
  into current_data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'votes'
    and column_name = 'game_id';

  if current_data_type in ('character varying', 'text') then
    select count(*)
    into bad_game_id_count
    from public.votes
    where game_id is null
      or btrim(game_id) = ''
      or game_id !~ '^[0-9]+$';

    if bad_game_id_count > 0 then
      raise exception 'public.votes has % non-numeric game_id value(s). Fix those rows before converting game_id to bigint.', bad_game_id_count;
    end if;

    alter table public.votes
      alter column game_id type bigint using game_id::bigint;
  end if;
end $$;

create or replace view public.game_cost_summary as
select
  games.id as game_id,
  games.room_code,
  games.game_mode,
  games.image_style,
  games.estimated_image_cost_cents as game_estimated_image_cost_cents,
  count(submissions.id) filter (where submissions.image_url is not null) as generated_image_count,
  coalesce(sum(submissions.estimated_image_cost_cents), 0) as submission_estimated_image_cost_cents
from public.games
left join public.submissions on submissions.game_id = games.id
group by
  games.id,
  games.room_code,
  games.game_mode,
  games.image_style,
  games.estimated_image_cost_cents;
