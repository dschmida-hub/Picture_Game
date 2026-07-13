-- Replaces the in-memory rate limiter (app/api/_utils/security.ts) with a
-- Postgres-backed one. The in-memory Map only lived inside a single
-- serverless function instance - on Vercel, concurrent requests routinely
-- land on different instances (and every cold start wipes it entirely),
-- so the configured limits were far weaker in practice than they read in
-- code. This gives every request a shared, durable view of the count.
--
-- Uses a fixed window (reset every window_ms) rather than a sliding one -
-- simpler to store (one row per bucket instead of an array of
-- timestamps), and precise enough for abuse protection rather than
-- billing. Serialized per-bucket with a transaction-scoped advisory lock,
-- same pattern as reserve_image_spend, so concurrent requests against the
-- same bucket can't all read the same pre-increment count and all pass.
--
-- Run this in Supabase SQL Editor.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0
);

alter table public.rate_limit_buckets enable row level security;

grant select, insert, update, delete on public.rate_limit_buckets to service_role;

create or replace function public.check_rate_limit(
  bucket_key_input text,
  window_ms_input integer,
  max_requests_input integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window_start timestamptz;
  current_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(bucket_key_input));

  select window_start, request_count into current_window_start, current_count
  from public.rate_limit_buckets
  where bucket_key = bucket_key_input;

  if current_window_start is null
    or current_window_start < now() - make_interval(secs => window_ms_input / 1000.0)
  then
    insert into public.rate_limit_buckets (bucket_key, window_start, request_count)
    values (bucket_key_input, now(), 1)
    on conflict (bucket_key) do update
      set window_start = excluded.window_start,
          request_count = 1;
    return true;
  end if;

  if current_count >= max_requests_input then
    return false;
  end if;

  update public.rate_limit_buckets
  set request_count = request_count + 1
  where bucket_key = bucket_key_input;

  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Bucket rows are tiny but accumulate one per distinct (route, IP/room)
-- pair forever without this - the nightly storage-retention cron already
-- exists, so it also sweeps buckets untouched for a day (well past any
-- real rate-limit window in this app).
create or replace function public.cleanup_stale_rate_limit_buckets()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_buckets
  where window_start < now() - interval '1 day';
$$;

grant execute on function public.cleanup_stale_rate_limit_buckets() to service_role;
