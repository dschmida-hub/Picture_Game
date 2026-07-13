-- Closes the TOCTOU race in the daily image-spend cap (S4 from the
-- security review): generate-image/regenerate-image checked the rolling
-- 24h spend, then generated (15-20s), then wrote the real cost back.
-- Any requests arriving inside that window all read the same
-- pre-generation total and all passed the check, so the realized
-- overshoot was bounded only by how many concurrent requests an attacker
-- could get in flight, not by the configured cap.
--
-- Fix: reserve the estimated cost atomically before generating (serialized
-- with a transaction-scoped advisory lock so concurrent callers can't all
-- read the same pre-reservation total), and release the reservation once
-- the real cost is written back (success) or the attempt fails. A
-- reservation that's never released (e.g. the function crashes mid-request
-- with no chance to clean up) still self-expires after 24h since it's
-- only ever summed within the rolling window - fail-safe, not fail-open.
--
-- service_role only - this is called from the API routes with the
-- service-role key, never directly from a browser.
--
-- Run this in Supabase SQL Editor.

create table if not exists public.image_spend_reservations (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  estimated_cents integer not null,
  room_code text not null
);

create index if not exists image_spend_reservations_created_at_idx
  on public.image_spend_reservations (created_at);

alter table public.image_spend_reservations enable row level security;

grant select, insert, delete on public.image_spend_reservations to service_role;
grant usage, select on sequence public.image_spend_reservations_id_seq to service_role;

create or replace function public.reserve_image_spend(
  room_code_input text,
  estimated_cents_input integer,
  max_daily_cents_input integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - interval '24 hours';
  current_spend numeric;
  new_reservation_id bigint;
begin
  -- Serializes all concurrent callers so the check-then-insert below is
  -- atomic - without this, two requests arriving within the same
  -- generation window would both read the same "current total" and both
  -- pass, which is the exact race this migration closes.
  perform pg_advisory_xact_lock(hashtext('image_spend_cap'));

  select
    coalesce((
      select sum(estimated_image_cost_cents) from public.submissions
      where image_url is not null and created_at >= since
    ), 0)
    + coalesce((
      select sum(estimated_cents) from public.image_spend_reservations
      where created_at >= since
    ), 0)
  into current_spend;

  if current_spend + estimated_cents_input > max_daily_cents_input then
    return null;
  end if;

  insert into public.image_spend_reservations (room_code, estimated_cents)
  values (room_code_input, estimated_cents_input)
  returning id into new_reservation_id;

  return new_reservation_id;
end;
$$;

grant execute on function public.reserve_image_spend(text, integer, integer) to service_role;

create or replace function public.release_image_spend_reservation(
  reservation_id_input bigint
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.image_spend_reservations where id = reservation_id_input;
$$;

grant execute on function public.release_image_spend_reservation(bigint) to service_role;
