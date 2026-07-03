-- Support a rolling-24h cents spend cap independent of the MAX_IMAGES_PER_*
-- count caps (protects against a per-image cost increase from the provider).
-- Run this in Supabase SQL Editor.

alter table public.submissions
  add column if not exists created_at timestamptz not null default now();

create index if not exists submissions_created_at_idx
  on public.submissions (created_at)
  where image_url is not null;
