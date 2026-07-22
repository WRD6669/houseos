-- HouseOS Migration 013: Customer-property junction + follow-up records
-- Run in Supabase SQL Editor after 001-012

-- ============================================================
-- 1. Customer-Property junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'recommend'
    CHECK (relation_type IN ('recommend', 'viewed', 'favorite', 'deal')),
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_customer_id ON customer_properties(customer_id);
CREATE INDEX IF NOT EXISTS idx_cp_property_id ON customer_properties(property_id);

-- RLS
ALTER TABLE customer_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON customer_properties
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Customer follow-up records
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  follow_up_type TEXT DEFAULT 'call'
    CHECK (follow_up_type IN ('call', 'wechat', 'visit', 'message', 'other')),
  manager TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfu_customer_id ON customer_follow_ups(customer_id);

-- RLS
ALTER TABLE customer_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON customer_follow_ups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
