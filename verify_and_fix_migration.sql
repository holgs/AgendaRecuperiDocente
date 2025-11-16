-- Step 1: Verify current column constraint
-- Run this first to check if default_duration is nullable or not
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'recovery_types'
    AND column_name = 'default_duration';

-- Expected result:
-- If is_nullable = 'NO', you need to run Step 2
-- If is_nullable = 'YES', the migration has already been applied

-- ============================================

-- Step 2: Apply the migration (only if Step 1 shows is_nullable = 'NO')
-- Uncomment the line below and run it
-- ALTER TABLE recovery_types ALTER COLUMN default_duration DROP NOT NULL;

-- ============================================

-- Step 3: Verify the migration was successful
-- Run this after Step 2 to confirm
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'recovery_types'
    AND column_name = 'default_duration';

-- Expected result: is_nullable should now be 'YES'
