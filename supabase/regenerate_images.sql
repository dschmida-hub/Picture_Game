alter table public.submissions
  add column if not exists regenerate_count integer not null default 0;

create index if not exists submissions_regenerate_count_idx
  on public.submissions (game_id, regenerate_count);
