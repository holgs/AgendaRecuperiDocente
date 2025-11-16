-- Migration: Add co_teacher_name column to recovery_activities table
-- Description: Stores the name of the co-teacher for "Copresenza" activities
-- Author: System
-- Date: 2025-01-16

-- Add co_teacher_name column
ALTER TABLE recovery_activities
ADD COLUMN IF NOT EXISTS co_teacher_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN recovery_activities.co_teacher_name IS 'Nome del docente in compresenza (solo per tipo "Copresenza")';
