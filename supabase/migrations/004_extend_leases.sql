-- HouseOS Migration 004: Extend leases with additional fields
-- Run in Supabase SQL Editor after 001, 002, 003

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS deposit     NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payment_day INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes       TEXT;
