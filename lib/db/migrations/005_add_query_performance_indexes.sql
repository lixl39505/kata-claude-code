-- Migration: Query Performance Indexes
-- Description: Add missing indexes for common query patterns to improve performance
-- Requirements:
--   - Must be idempotent (can be run multiple times safely)
--   - Must preserve data integrity
--   - Must improve query performance for common access patterns
--
-- Indexes being added:
--   1. issues.status - For filtering by status (OPEN/CLOSED)
--   2. issues.created_at - For ordering by creation time (DESC)
--
-- Query patterns optimized:
--   - WHERE status = ? (used in issue list filters)
--   - ORDER BY created_at DESC (used in issue listing and sorting)
--   - Combined queries with status filtering and time-based sorting

-- Start transaction for atomic migration
BEGIN TRANSACTION;

-- Add index for issues.status to optimize status filtering
-- Common queries: SELECT * FROM issues WHERE status = 'OPEN'
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

-- Add index for issues.created_at to optimize time-based sorting
-- Common queries: SELECT * FROM issues ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);

-- Commit the transaction
COMMIT;

-- Verify migration success (queries for manual verification)
-- Check that indexes were created
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='issues' AND name IN ('idx_issues_status', 'idx_issues_created_at');

-- Verify index usage with query plan analysis
-- EXPLAIN QUERY PLAN SELECT * FROM issues WHERE status = 'OPEN';
-- Expected: Should show usage of idx_issues_status
--
-- EXPLAIN QUERY PLAN SELECT * FROM issues ORDER BY created_at DESC;
-- Expected: Should show usage of idx_issues_created_at
