-- 014: Add viewing schedule fields to customer_follow_ups
-- Adds scheduled_at, result, and property_id for structured viewing management

ALTER TABLE customer_follow_ups
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('pending', 'satisfied', 'thinking', 'rejected', 'deal')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- Index for viewing schedule queries
CREATE INDEX IF NOT EXISTS idx_customer_follow_ups_scheduled_at ON customer_follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_customer_follow_ups_property_id ON customer_follow_ups(property_id);
