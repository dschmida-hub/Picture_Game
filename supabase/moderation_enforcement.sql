-- Actually enforce admin "removed" moderation decisions instead of only
-- flagging image_reports.status. Run this in Supabase SQL Editor.

alter table public.submissions
  add column if not exists hidden_at timestamptz;

create index if not exists submissions_hidden_at_idx
  on public.submissions (room_code, game_id)
  where hidden_at is not null;
