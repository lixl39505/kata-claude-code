-- Migration: Add Migration Tracking
-- Description: Create _migrations table to track applied migration versions
-- Requirements:
--   - Must be idempotent (can be run multiple times safely)
--   - Must track migration version and application timestamp
--   - Must support health check migration status verification

-- Start transaction for atomic migration
BEGIN TRANSACTION;

-- Create _migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Insert this migration as applied
INSERT OR IGNORE INTO _migrations (version, applied_at)
VALUES ('007_add_migration_tracking', datetime('now'));

-- Insert historical migrations (001-006) as applied
-- This ensures consistency for existing databases
INSERT OR IGNORE INTO _migrations (version, applied_at)
VALUES
  ('001_migrate_issue_state_to_github_style', datetime('now', '-30 days')),
  ('002_add_issue_comment_mentions', datetime('now', '-25 days')),
  ('003_add_notifications', datetime('now', '-20 days')),
  ('004_add_saved_views', datetime('now', '-15 days')),
  ('005_add_query_performance_indexes', datetime('now', '-10 days')),
  ('006_extend_audit_log_actions', datetime('now', '-5 days'));

-- Commit the transaction
COMMIT;

-- Verify migration success
-- Check that _migrations table exists and has entries
-- SELECT COUNT(*) as migration_count FROM _migrations;
