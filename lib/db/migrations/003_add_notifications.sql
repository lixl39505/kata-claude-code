-- Migration: Notifications
-- Description: Add support for user notifications (mentions and assignee changes)
-- Requirements:
--   - Must be idempotent (can be run multiple times safely)
--   - Must preserve data integrity
--   - Must support cascade delete when related entities are deleted
--   - Must support efficient queries for user notifications

-- Start transaction for atomic migration
BEGIN TRANSACTION;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  comment_id TEXT,
  project_id TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES issue_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK (type IN ('MENTION', 'ASSIGNEE_CHANGED')),
  CHECK (is_read IN (0, 1))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_issue_id ON notifications(issue_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Commit the transaction
COMMIT;

-- Verify migration success (queries for manual verification)
-- Check table was created
-- SELECT COUNT(*) as table_exists FROM sqlite_master WHERE type='table' AND name='notifications';

-- Verify indexes were created
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='notifications';
