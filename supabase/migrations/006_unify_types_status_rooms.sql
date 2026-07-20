-- HouseOS Migration 006: Unify property types, status values, and room layout structure
-- Run in Supabase SQL Editor after 001-005

-- 1. Add living_rooms column for room layout parsing
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS living_rooms INT;

-- 2. Extend type CHECK to include shop and office
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_type_check;
ALTER TABLE properties ADD CONSTRAINT properties_type_check
  CHECK (type IN ('apartment', 'villa', 'loft', 'cottage', 'commercial', 'shop', 'office'));

-- 3. Extend status CHECK to include sold and pending
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE properties ADD CONSTRAINT properties_status_check
  CHECK (status IN ('vacant', 'occupied', 'sold', 'maintenance', 'pending'));
