-- Migration: Issue Comment Mentions
-- Description: Add support for @ mentions in issue comments
-- Requirements:
--   - Must be idempotent (can be run multiple times safely)
--   - Must preserve data integrity
--   - Must support cascade delete when comments are deleted

-- Start transaction for atomic migration
BEGIN TRANSACTION;

-- Create issue_comment_mentions table if it doesn't exist
CREATE TABLE IF NOT EXISTS issue_comment_mentions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  mentioned_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (comment_id) REFERENCES issue_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (comment_id, mentioned_user_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_issue_comment_mentions_comment_id ON issue_comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_issue_comment_mentions_issue_id ON issue_comment_mentions(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comment_mentions_project_id ON issue_comment_mentions(project_id);
CREATE INDEX IF NOT EXISTS idx_issue_comment_mentions_mentioned_user_id ON issue_comment_mentions(mentioned_user_id);

-- Commit the transaction
COMMIT;

-- Verify migration success (queries for manual verification)
-- Check table was created
-- SELECT COUNT(*) as table_exists FROM sqlite_master WHERE type='table' AND name='issue_comment_mentions';

-- Verify indexes were created
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='issue_comment_mentions';
