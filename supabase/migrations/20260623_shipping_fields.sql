-- ── Shipping origin address per roaster ──────────────────────────────────────
-- Stored as JSONB so the full address can be read/written atomically.
-- Fields: postal_code, prefecture, city, district, building, phone
ALTER TABLE public.roasters
  ADD COLUMN IF NOT EXISTS shipping_address jsonb;

-- ── Selected shipping carrier/service on each order ───────────────────────────
-- Populated by the Stripe webhook from the session metadata set at checkout.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS shipping_service text,
  ADD COLUMN IF NOT EXISTS shipping_cost    integer;
