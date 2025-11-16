-- Migration: Insert authenticated users into users table
-- Description: Ensures all Supabase Auth users have corresponding records in users table
-- Author: System
-- Date: 2025-01-16

-- Temporarily disable RLS to allow insertion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Insert authenticated users from auth.users into public.users if they don't exist
INSERT INTO users (id, email, role, created_at, updated_at)
SELECT
  id,
  email,
  'admin' as role,
  created_at,
  updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE users IS 'Application users synchronized from Supabase Auth';
