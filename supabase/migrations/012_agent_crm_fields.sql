-- HouseOS Migration 012: Agent CRM fields for customers table
-- Run in Supabase SQL Editor after 001-011

-- ============================================================
-- 1. Customer type
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT;

-- ============================================================
-- 2. Budget
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS budget_min NUMERIC(10, 2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS budget_max NUMERIC(10, 2);

-- ============================================================
-- 3. Target location
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS target_city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS target_district TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS target_community TEXT;

-- ============================================================
-- 4. Property preferences
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS property_type_pref TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bedrooms_pref INT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS area_min NUMERIC(10, 2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS area_max NUMERIC(10, 2);

-- ============================================================
-- 5. Management fields
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS manager TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_follow_up_time TIMESTAMPTZ;

-- ============================================================
-- 6. Extend status CHECK (keep old values, add new)
-- ============================================================
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_status_check
  CHECK (status IN (
    'active','inactive','pending',
    'new','contacting','viewing','deal','closed'
  ));
