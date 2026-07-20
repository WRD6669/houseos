-- HouseOS Migration 003: Add property detail fields
-- Run in Supabase SQL Editor after 001 and 002

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS owner_name  TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS notes       TEXT,
  ADD COLUMN IF NOT EXISTS area        NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS rooms       INT;
