-- Make default_duration nullable in recovery_types table
ALTER TABLE recovery_types
ALTER COLUMN default_duration DROP NOT NULL;
