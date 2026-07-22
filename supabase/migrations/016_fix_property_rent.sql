-- HouseOS Migration 016: Fix properties.rent NOT NULL constraint
-- Allows rent to be NULL (for sale properties that don't have rent)
-- Sets default to 0 for backward compatibility

ALTER TABLE properties ALTER COLUMN rent DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN rent SET DEFAULT 0;
