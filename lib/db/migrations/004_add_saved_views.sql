-- Migration: Saved Views
-- Description: Add support for user-defined saved views (persistent issue filters)
-- Requirements:
--   - Must be idempotent (can be run multiple times safely)
--   - Must preserve data integrity
--   - Must support cascade delete when user is deleted
--   - Must enforce uniqueness of view names per user
--   - Must support efficient queries for user's saved views

-- Start transaction for atomic migration
BEGIN TRANSACTION;

-- Create saved_views table if it doesn't exist
CREATE TABLE IF NOT EXISTS saved_views (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, name),
  CHECK (length(filters_json) > 0)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_created_at ON saved_views(created_at);

-- Commit the transaction
COMMIT;

-- Verify migration success (queries for manual verification)
-- Check table was created
-- SELECT COUNT(*) as table_exists FROM sqlite_master WHERE type='table' AND name='saved_views';

-- Verify indexes were created
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='saved_views';
