-- HouseOS Migration 005: Add room_layout text column for Chinese room descriptions
-- Run in Supabase SQL Editor after 001-004

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS room_layout TEXT;

COMMENT ON COLUMN properties.room_layout IS 'Original room layout description (e.g. "三室两厅一卫")';