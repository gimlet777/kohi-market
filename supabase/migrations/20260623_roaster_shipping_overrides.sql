-- ── Shipping addresses for seed/demo roasters ────────────────────────────────
-- The `roasters` table is keyed to auth.users and only holds rows for
-- authenticated accounts. Seed/placeholder roasters exist only in `products`
-- and can never have rows there. This table provides shipping addresses for
-- those roasters, looked up by name in /api/shipping-rates as a fallback.
CREATE TABLE IF NOT EXISTS public.roaster_shipping_overrides (
  roaster_name     text PRIMARY KEY,
  shipping_address jsonb NOT NULL
);

-- Service role (used by API routes via supabaseAdmin) bypasses RLS.
-- Enable RLS to block direct client access.
ALTER TABLE public.roaster_shipping_overrides ENABLE ROW LEVEL SECURITY;

-- ── Seed demo addresses ───────────────────────────────────────────────────────
INSERT INTO public.roaster_shipping_overrides (roaster_name, shipping_address)
VALUES
  (
    'Glitch Coffee & Roasters',
    '{"postal_code":"101-0054","prefecture":"東京都","city":"千代田区","district":"神田錦町3-16","building":"","phone":"0352445458"}'
  ),
  (
    'Takamura Wine & Coffee Roasters',
    '{"postal_code":"550-0002","prefecture":"大阪府","city":"大阪市西区","district":"江戸堀2-2-18","building":"","phone":"0666433519"}'
  ),
  (
    'Leaves Coffee Roasters',
    '{"postal_code":"130-0004","prefecture":"東京都","city":"墨田区","district":"本所1-8-8","building":"","phone":"0356378718"}'
  ),
  (
    '% Arabica',
    '{"postal_code":"150-0001","prefecture":"東京都","city":"渋谷区","district":"神宮前4-15-2","building":"","phone":"0334025700"}'
  )
ON CONFLICT (roaster_name)
  DO UPDATE SET shipping_address = EXCLUDED.shipping_address;
