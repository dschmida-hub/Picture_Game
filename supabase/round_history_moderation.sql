-- Let admins hide a round_history entry (offensive player name, bad
-- image, etc.) from the homepage showcase/background/rotating demo
-- without deleting the underlying record. Run this in Supabase SQL Editor.

alter table public.round_history
  add column if not exists hidden_at timestamptz;

create index if not exists round_history_hidden_at_idx
  on public.round_history (id)
  where hidden_at is null;
