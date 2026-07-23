-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Atomic batch stock decrement function
--
-- Problem: The Stripe webhook's batch decrement was check-then-act:
--   1. SELECT bags_remaining
--   2. compute new value
--   3. UPDATE SET bags_remaining = computed_value
-- Two concurrent webhook deliveries for the same session (Stripe retries) could
-- both read the same bags_remaining, both compute the same new value, and both
-- write it — resulting in only one actual decrement instead of one per item.
--
-- Fix: A single SQL statement that decrements only if bags_remaining >= qty.
-- Postgres guarantees each statement is atomic, so concurrent calls serialise
-- and exactly one wins; the other returns 0 rows (detectable as an oversell).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_batch_stock(
  p_batch_id uuid,
  p_qty      integer
)
RETURNS TABLE (bags_remaining integer, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE batches
  SET    bags_remaining = batches.bags_remaining - p_qty,
         status         = CASE
                            WHEN batches.bags_remaining - p_qty <= 0 THEN 'complete'
                            ELSE batches.status
                          END
  WHERE  id             = p_batch_id
    AND  bags_remaining >= p_qty
  RETURNING batches.bags_remaining, batches.status;
$$;

-- Usage:
--   SELECT * FROM decrement_batch_stock('<uuid>', 2);
--   → one row on success (with updated bags_remaining and status)
--   → zero rows if bags_remaining < p_qty at the moment of execution
