-- HouseOS Migration 009: Real estate agent business fields
-- Run in Supabase SQL Editor after 001-008

-- ============================================================
-- 1. Property Number (unique agent ID)
-- ============================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_no TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_property_no ON properties(property_no);

-- ============================================================
-- 2. Location breakdown
-- ============================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS unit_num TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS room_number TEXT;

-- ============================================================
-- 3. Property details
-- ============================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS usage_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS kitchens INT DEFAULT 1;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS balconies INT DEFAULT 0;

-- ============================================================
-- 4. Transaction fields
-- ============================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- ============================================================
-- 5. Management fields
-- ============================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager TEXT;

-- ============================================================
-- 6. Follow-up fields
-- ============================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS follow_up_content TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_follow_up_time TIMESTAMPTZ;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS viewing_method TEXT;

-- ============================================================
-- 7. Extend property_rights CHECK for ownership
-- ============================================================
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_rights_check;
ALTER TABLE properties ADD CONSTRAINT properties_property_rights_check
  CHECK (property_rights IN ('owned','mortgage','shared','other','public','commercial','military'));

-- ============================================================
-- Index
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_manager ON properties(manager);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);