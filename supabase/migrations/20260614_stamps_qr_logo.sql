-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: stamps table + roasters.qr_version + roasters.logo_url
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New table: stamps ────────────────────────────────────────────────────────
--    Records each QR-code scan / loyalty stamp earned by a buyer.

create table if not exists public.stamps (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  roaster_id  uuid        not null references public.roasters(id) on delete cascade,
  scanned_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Index for fast per-user and per-roaster lookups
create index if not exists stamps_user_id_idx     on public.stamps(user_id);
create index if not exists stamps_roaster_id_idx  on public.stamps(roaster_id);

-- Row Level Security
alter table public.stamps enable row level security;

-- Users can read their own stamps
drop policy if exists "Users can read own stamps" on public.stamps;
create policy "Users can read own stamps"
  on public.stamps
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Authenticated users can insert their own stamps
drop policy if exists "Users can insert own stamps" on public.stamps;
create policy "Users can insert own stamps"
  on public.stamps
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Service role can do everything (for server-side stamp issuance)
drop policy if exists "Service role full access on stamps" on public.stamps;
create policy "Service role full access on stamps"
  on public.stamps
  for all
  to service_role
  using (true)
  with check (true);


-- 2. Add qr_version to roasters ───────────────────────────────────────────────
--    Incremented when a roaster rotates their QR code to invalidate old codes.

alter table public.roasters
  add column if not exists qr_version integer not null default 1;


-- 3. Add logo_url to roasters (nullable) ──────────────────────────────────────
--    Stores a roaster-uploaded logo used in QR badge and profile display.

alter table public.roasters
  add column if not exists logo_url text;
