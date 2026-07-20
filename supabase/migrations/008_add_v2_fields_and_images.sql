-- HouseOS Migration 008: V2.0 new property fields and property_images table
-- Run in Supabase SQL Editor after 001-007

-- 1. New property fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_built INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_rights TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS heating TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking TEXT;

-- 2. CHECK constraints for new fields
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_rights_check;
ALTER TABLE properties ADD CONSTRAINT properties_property_rights_check
  CHECK (property_rights IN ('owned', 'mortgage', 'shared', 'other'));

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_heating_check;
ALTER TABLE properties ADD CONSTRAINT properties_heating_check
  CHECK (heating IN ('central', 'floor', 'radiator', 'ac', 'none'));

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_parking_check;
ALTER TABLE properties ADD CONSTRAINT properties_parking_check
  CHECK (parking IN ('yes', 'no', 'shared'));

-- 3. Property images table
CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  width INT,
  height INT,
  file_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pi_property_id ON property_images(property_id);

-- 4. RLS for property_images
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON property_images
  FOR ALL TO authenticated USING (true) WITH CHECK (true);