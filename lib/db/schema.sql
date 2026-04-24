-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Index for email lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (owner_id, key)
);

-- Indexes for project lookups
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_key ON projects(key);

-- Project members table
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (project_id, user_id),
  CHECK (role IN ('OWNER', 'MEMBER'))
);

-- Indexes for efficient member lookups
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  close_reason TEXT,
  created_by_id TEXT NOT NULL,
  assignee_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('OPEN', 'CLOSED')),
  CHECK (close_reason IS NULL OR status = 'CLOSED'),
  CHECK (close_reason IS NULL OR close_reason IN ('COMPLETED', 'NOT_PLANNED', 'DUPLICATE'))
);

-- Indexes for project lookups
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON issues(assignee_id);

-- Issue audit logs table
CREATE TABLE IF NOT EXISTS issue_audit_logs (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
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
  CHECK (action IN ('ISSUE_CREATED', 'ISSUE_STATUS_CHANGED', 'ISSUE_ASSIGNEE_CHANGED'))
);

-- Indexes for efficient audit log queries
CREATE INDEX IF NOT EXISTS idx_issue_audit_logs_issue_id ON issue_audit_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_audit_logs_project_id ON issue_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_issue_audit_logs_created_at ON issue_audit_logs(created_at);

-- Issue comments table
CREATE TABLE IF NOT EXISTS issue_comments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(content) >= 1 AND length(content) <= 5000)
);

-- Indexes for efficient comment queries
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_project_id ON issue_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_created_at ON issue_comments(created_at);

-- Notifications table
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

-- Indexes for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_issue_id ON notifications(issue_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
