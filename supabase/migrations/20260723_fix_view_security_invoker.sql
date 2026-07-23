-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix SECURITY DEFINER views in public schema
--
-- Problem: Supabase creates views with SECURITY DEFINER by default, meaning
-- the view executes with the creator's permissions and bypasses RLS on the
-- underlying tables. This lets any authenticated user read other users' rows.
--
-- Fix: Set security_invoker = true so the view runs as the QUERYING USER,
-- causing Postgres to enforce RLS normally. Requires Postgres 15+ (Supabase).
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Fix user_points ───────────────────────────────────────────────────────
--
-- user_points aggregates stamp counts per user. With security_invoker = true,
-- the query inside the view hits public.stamps as the calling user, so the
-- RLS policy "Users can read own stamps" (auth.uid() = user_id) applies and
-- each user can only ever see their own total_points row.

ALTER VIEW public.user_points SET (security_invoker = true);


-- ── 2. Detect any other affected views ───────────────────────────────────────
--
-- Run this SELECT after applying the migration to confirm no remaining views
-- in the public schema are missing security_invoker. It should return 0 rows
-- once all views are fixed.
--
-- SELECT c.relname AS view_name,
--        c.reloptions
-- FROM   pg_class c
-- JOIN   pg_namespace n ON n.oid = c.relnamespace
-- WHERE  c.relkind = 'v'
--   AND  n.nspname = 'public'
--   AND  NOT (
--          c.reloptions IS NOT NULL
--          AND 'security_invoker=on' = ANY(c.reloptions)
--        )
-- ORDER BY c.relname;
--
-- If it returns additional view names, apply this pattern for each:
--   ALTER VIEW public.<view_name> SET (security_invoker = true);


-- ── 3. Confirm RLS on the underlying stamps table ────────────────────────────
--
-- A security_invoker view is only as safe as the RLS on the tables it reads.
-- The stamps table already has RLS enabled (migration 20260614_stamps_qr_logo)
-- with the policy:
--   "Users can read own stamps"  →  using (auth.uid() = user_id)
--
-- Verify with:
-- SELECT tablename, rowsecurity AS rls_enabled
-- FROM   pg_tables
-- WHERE  schemaname = 'public'
--   AND  tablename  = 'stamps';
--
-- Expected result: rls_enabled = true
--
-- Also confirm the SELECT policy exists:
-- SELECT policyname, cmd, qual
-- FROM   pg_policies
-- WHERE  schemaname = 'public'
--   AND  tablename  = 'stamps'
--   AND  cmd        = 'SELECT';
--
-- Expected: at least one row with qual containing auth.uid() = user_id
