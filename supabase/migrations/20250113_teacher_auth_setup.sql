-- Migration: Teacher Authentication Setup
-- Description: Add role constraints, indexes, and RLS policies for teacher self-service

-- 1. Update users.role constraint to include 'teacher'
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'teacher'));

-- 2. Add index on teachers.email for fast OAuth provisioning lookups
CREATE INDEX IF NOT EXISTS idx_teachers_email
  ON teachers(email)
  WHERE email IS NOT NULL;

-- 3. Add index on teachers.user_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_teachers_user_id
  ON teachers(user_id)
  WHERE user_id IS NOT NULL;

-- 4. Add index on users.email for provisioning
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

-- 5. Ensure teachers.email is not null (data quality)
-- Note: Run this manually after verifying all teachers have emails
-- ALTER TABLE teachers
--   ALTER COLUMN email SET NOT NULL;

-- 6. Add comment for documentation
COMMENT ON COLUMN users.role IS 'User role: admin (full access) or teacher (self-service only)';
COMMENT ON COLUMN teachers.user_id IS 'Links teacher to authentication user account';
COMMENT ON COLUMN teachers.email IS 'Email address for Google Workspace authentication (@piaggia.it)';

-- 7. Row Level Security Policies (Optional - for future hardening)
-- Enable RLS on recovery_activities
-- ALTER TABLE recovery_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can see all activities
-- CREATE POLICY "admin_all_activities" ON recovery_activities
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role = 'admin'
--     )
--   );

-- Policy: Teachers can only see their own activities
-- CREATE POLICY "teacher_own_activities" ON recovery_activities
--   FOR SELECT
--   TO authenticated
--   USING (
--     teacher_id IN (
--       SELECT id FROM teachers
--       WHERE user_id = auth.uid()
--     )
--   );

-- Policy: Teachers can insert their own activities
-- CREATE POLICY "teacher_insert_own_activities" ON recovery_activities
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     teacher_id IN (
--       SELECT id FROM teachers
--       WHERE user_id = auth.uid()
--     )
--   );

-- Policy: Teachers can update their own planned activities
-- CREATE POLICY "teacher_update_own_planned_activities" ON recovery_activities
--   FOR UPDATE
--   TO authenticated
--   USING (
--     teacher_id IN (
--       SELECT id FROM teachers
--       WHERE user_id = auth.uid()
--     )
--     AND status = 'planned'
--   )
--   WITH CHECK (
--     teacher_id IN (
--       SELECT id FROM teachers
--       WHERE user_id = auth.uid()
--     )
--   );

-- Policy: Teachers can delete their own planned activities
-- CREATE POLICY "teacher_delete_own_planned_activities" ON recovery_activities
--   FOR DELETE
--   TO authenticated
--   USING (
--     teacher_id IN (
--       SELECT id FROM teachers
--       WHERE user_id = auth.uid()
--     )
--     AND status = 'planned'
--   );
