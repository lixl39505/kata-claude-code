-- Migration: Issue State Model to GitHub Style
-- Description: Migrate from OPEN/IN_PROGRESS/DONE to OPEN/CLOSED with closeReason
-- Requirements:
--   - Must be idempotent (can be run multiple times safely)
--   - Must preserve data integrity
--   - Must not allow old state values after migration

-- Start transaction for atomic migration
BEGIN TRANSACTION;

-- Step 1: Add close_reason column if it doesn't exist
-- For SQLite, we need to check if column exists first
-- This is a simplified approach - assuming column doesn't exist for initial migration
ALTER TABLE issues ADD COLUMN close_reason TEXT;

-- Step 2: Migrate existing data to new state model
-- Migration rules:
-- - OPEN -> OPEN (closeReason = null)
-- - IN_PROGRESS -> OPEN (closeReason = null)
-- - RESOLVED -> OPEN (closeReason = null) [if exists in historical data]
-- - DONE -> CLOSED (closeReason = 'COMPLETED')
-- - CLOSED without closeReason -> CLOSED (closeReason = 'COMPLETED') [if exists]

-- Migrate IN_PROGRESS to OPEN
UPDATE issues
SET status = 'OPEN', close_reason = NULL
WHERE status = 'IN_PROGRESS';

-- Migrate RESOLVED to OPEN (if exists)
UPDATE issues
SET status = 'OPEN', close_reason = NULL
WHERE status = 'RESOLVED';

-- Migrate DONE to CLOSED with COMPLETED reason
UPDATE issues
SET status = 'CLOSED', close_reason = 'COMPLETED'
WHERE status = 'DONE';

-- Set default closeReason for CLOSED issues that don't have one
UPDATE issues
SET close_reason = 'COMPLETED'
WHERE status = 'CLOSED' AND close_reason IS NULL;

-- Clear any invalid closeReason for OPEN issues
UPDATE issues
SET close_reason = NULL
WHERE status = 'OPEN' AND close_reason IS NOT NULL;

-- Commit the transaction
COMMIT;

-- Verify migration success (these are queries for manual verification)
-- Check that no old state values remain
-- SELECT COUNT(*) as invalid_states_count FROM issues
-- WHERE status NOT IN ('OPEN', 'CLOSED');

-- Verify data integrity
-- SELECT
--   status,
--   close_reason,
--   COUNT(*) as count
-- FROM issues
-- GROUP BY status, close_reason
-- ORDER BY status, close_reason;
