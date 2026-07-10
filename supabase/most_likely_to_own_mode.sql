-- Promotes "Most Likely To" from a Classic-mode category into its own
-- top-level game mode, mirroring the existing public.prompts /
-- public.cah_prompts split. Run this in the Supabase SQL Editor.

create table if not exists public.most_likely_to_prompts (
  id bigint primary key,
  prompt text not null,
  category text,
  active boolean not null default true,
  personal boolean not null default false,
  image_style text not null default 'cartoon',
  prompt_rating text
);

alter table public.most_likely_to_prompts enable row level security;

grant select on public.most_likely_to_prompts to anon, authenticated;

drop policy if exists "Public can read active Most Likely To prompts" on public.most_likely_to_prompts;
create policy "Public can read active Most Likely To prompts"
on public.most_likely_to_prompts
for select
to anon, authenticated
using (active = true);

-- Move the 80 rows added by most_likely_to_prompts.sql (which lived in
-- public.prompts under category = 'most_likely_to') into the new table,
-- then remove them from public.prompts so Classic's "Random" category
-- pool and category dropdown no longer include them.
insert into public.most_likely_to_prompts (id, prompt, category, active, personal, image_style, prompt_rating)
select id, prompt, category, active, personal, image_style, prompt_rating
from public.prompts
where category = 'most_likely_to'
on conflict (id) do nothing;

delete from public.prompts
where category = 'most_likely_to';
