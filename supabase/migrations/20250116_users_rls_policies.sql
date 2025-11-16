-- Migration: Add RLS policies for users table
-- Description: Enable authenticated users to auto-create their own user record
-- Author: System
-- Date: 2025-01-16

-- Policy: Allow authenticated users to insert themselves into users table
-- This enables auto-provisioning when users first login
CREATE POLICY "users_insert_self" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Allow users to read their own user record
CREATE POLICY "users_read_self" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Allow users to update their own user record
CREATE POLICY "users_update_self" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add comment for documentation
COMMENT ON POLICY "users_insert_self" ON users IS 'Allows authenticated users to create their own user record on first login';
COMMENT ON POLICY "users_read_self" ON users IS 'Allows authenticated users to read their own user record';
COMMENT ON POLICY "users_update_self" ON users IS 'Allows authenticated users to update their own user record';
