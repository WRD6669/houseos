-- HouseOS Migration 002: Add customer detail fields
-- Run in Supabase SQL Editor after 001_initial_schema.sql

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS wechat TEXT,
  ADD COLUMN IF NOT EXISTS id_card TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make email nullable (optional for the add-customer form)
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
