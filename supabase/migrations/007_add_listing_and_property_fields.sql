-- HouseOS Migration 007: Listing type, prices, and core property fields
-- Run in Supabase SQL Editor after 001-006

-- 1. Transaction model
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'rent';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10, 2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2);

DO $$ BEGIN
  UPDATE properties SET rent_price = rent;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- 2. Core property fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS community TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS decoration TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS orientation TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS furniture TEXT;

-- 3. CHECK constraints
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_listing_type_check;
ALTER TABLE properties ADD CONSTRAINT properties_listing_type_check CHECK (listing_type IN ('rent', 'sale'));

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_decoration_check;
ALTER TABLE properties ADD CONSTRAINT properties_decoration_check CHECK (decoration IN ('furnished', 'standard', 'unfurnished', 'shell'));

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_furniture_check;
ALTER TABLE properties ADD CONSTRAINT properties_furniture_check CHECK (furniture IN ('full', 'partial', 'none'));