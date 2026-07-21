-- HouseOS Migration 011: Add follow_up column for Excel import
-- ============================================================
-- Import field "跟进" maps to follow_up (separate from follow_up_content)

ALTER TABLE properties ADD COLUMN IF NOT EXISTS follow_up TEXT;

COMMENT ON COLUMN properties.follow_up IS 'Raw follow-up notes from Excel import (跟进)';