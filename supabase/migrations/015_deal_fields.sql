-- 015: Deal fields for customer_properties
-- Adds deal_price, deal_date, and commission for structured deal recording

ALTER TABLE customer_properties
  ADD COLUMN IF NOT EXISTS deal_price NUMERIC,
  ADD COLUMN IF NOT EXISTS deal_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission NUMERIC;
