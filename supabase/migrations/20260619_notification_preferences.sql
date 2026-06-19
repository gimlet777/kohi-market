-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: roaster_notification_preferences + orders.reminder_sent
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Notification preferences per roaster ────────────────────────────────────

create table if not exists public.roaster_notification_preferences (
  roaster_id     uuid        primary key references public.roasters(id) on delete cascade,
  new_order      boolean     not null default true,
  order_reminder boolean     not null default true,
  low_stock      boolean     not null default true,
  batch_expired  boolean     not null default true,
  updated_at     timestamptz not null default now()
);

alter table public.roaster_notification_preferences enable row level security;

drop policy if exists "Roasters read own notif prefs"   on public.roaster_notification_preferences;
drop policy if exists "Roasters upsert own notif prefs" on public.roaster_notification_preferences;
drop policy if exists "Service role full access on notif prefs" on public.roaster_notification_preferences;

create policy "Roasters read own notif prefs"
  on public.roaster_notification_preferences
  for select
  to authenticated
  using (auth.uid() = roaster_id);

create policy "Roasters upsert own notif prefs"
  on public.roaster_notification_preferences
  for all
  to authenticated
  using (auth.uid() = roaster_id)
  with check (auth.uid() = roaster_id);

create policy "Service role full access on notif prefs"
  on public.roaster_notification_preferences
  for all
  to service_role
  using (true)
  with check (true);


-- 2. Track whether a 3-day shipping reminder has been sent per order ─────────

alter table public.orders
  add column if not exists reminder_sent boolean not null default false;
