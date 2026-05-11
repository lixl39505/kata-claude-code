-- Migration: Make Audit Logs Support Project-Level Operations
-- Description: Allow audit logs to record project-level operations by making issue_id nullable
-- Requirements:
--   - Must be idempotent (can be run multiple times safely)
--   - Must preserve data integrity
--   - Must support both issue-level and project-level audit logs

-- Start transaction for atomic migration
BEGIN TRANSACTION;

-- Recreate the table to make issue_id nullable
CREATE TABLE IF NOT EXISTS issue_audit_logs_new (
  id TEXT PRIMARY KEY,
  issue_id TEXT,
  project_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  from_assignee_id TEXT,
  to_assignee_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (action IN (
    'ISSUE_CREATED',
    'ISSUE_STATUS_CHANGED',
    'ISSUE_ASSIGNEE_CHANGED',
    'ISSUE_TITLE_CHANGED',
    'ISSUE_DESCRIPTION_CHANGED',
    'PROJECT_MEMBER_ADDED',
    'PROJECT_MEMBER_REMOVED',
    'ISSUE_COMMENT_DELETED'
  ))
);

-- Copy existing data to new table
INSERT INTO issue_audit_logs_new
SELECT * FROM issue_audit_logs;

-- Drop old table
DROP TABLE issue_audit_logs;

-- Rename new table to original name
ALTER TABLE issue_audit_logs_new RENAME TO issue_audit_logs;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_issue_audit_logs_issue_id ON issue_audit_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_audit_logs_project_id ON issue_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_issue_audit_logs_created_at ON issue_audit_logs(created_at);

-- Commit the transaction
COMMIT;

-- Verify migration success (queries for manual verification)
-- Check table still exists
-- SELECT COUNT(*) as table_exists FROM sqlite_master WHERE type='table' AND name='issue_audit_logs';

-- Verify data was preserved
-- SELECT COUNT(*) as row_count FROM issue_audit_logs;

-- Verify project-level logs can be created (issue_id should be NULL)
-- INSERT INTO issue_audit_logs (id, issue_id, project_id, actor_id, action, created_at)
-- VALUES ('test-id', NULL, 'test-project', 'test-user', 'PROJECT_MEMBER_ADDED', '2024-01-01T00:00:00.000Z');
