/**
 * Transaction Rollback Tests
 *
 * These tests verify that all critical write operations properly rollback
 * when any step in the transaction fails, ensuring data consistency.
 */

import { executeInTransaction } from '@/lib/db/transaction';
import { createIssue as createIssueDb, findIssueById } from '@/lib/db/issues';
import { createIssueAuditLog, findAuditLogsByIssueId } from '@/lib/db/issue-audit-logs';
import { createComment } from '@/lib/db/issue-comments';
import { createCommentMentions } from '@/lib/db/issue-comment-mentions';
import { createNotifications } from '@/lib/db/notifications';
import { addProjectMember as addProjectMemberDb, findProjectMember } from '@/lib/db/project-members';
import Database from 'better-sqlite3';

describe('Transaction Rollback Tests', () => {
  let memDb: Database.Database;

  beforeAll(() => {
    // Use in-memory database for isolation
    memDb = new Database(':memory:');
    memDb.pragma('foreign_keys = ON');

    // Create tables manually for test isolation
    memDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE projects (
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

      CREATE TABLE issues (
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
        CHECK (status IN ('OPEN', 'CLOSED'))
      );

      CREATE TABLE issue_audit_logs (
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
        CHECK (action IN ('ISSUE_CREATED', 'ISSUE_STATUS_CHANGED', 'ISSUE_ASSIGNEE_CHANGED', 'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED'))
      );

      CREATE TABLE issue_comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE issue_comment_mentions (
        id TEXT PRIMARY KEY,
        comment_id TEXT NOT NULL,
        issue_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        mentioned_user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (comment_id) REFERENCES issue_comments(id) ON DELETE CASCADE,
        UNIQUE (comment_id, mentioned_user_id)
      );

      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        issue_id TEXT NOT NULL,
        comment_id TEXT,
        project_id TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        CHECK (type IN ('MENTION', 'ASSIGNEE_CHANGED'))
      );

      CREATE TABLE project_members (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CHECK (role IN ('OWNER', 'MEMBER'))
      );
    `);
  });

  const getTimestamp = () => new Date().toISOString();

  describe('Issue Creation Rollback', () => {
    it('should rollback issue creation when audit log write fails', () => {
      const projectId = 'test-project-1';
      const userId = 'test-user-1';

      // Create project and user first
      memDb.prepare('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, 'user1@test.com', 'hash', 'User 1', getTimestamp(), getTimestamp());
      memDb.prepare('INSERT INTO projects (id, owner_id, name, key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(projectId, userId, 'Project 1', 'KEY1', getTimestamp(), getTimestamp());

      // Attempt to create issue (should rollback)
      expect(() => {
        executeInTransaction(memDb, (txnDb) => {
          // Create issue
          const issue = createIssueDb(txnDb, {
            projectId,
            title: 'Test Issue',
            description: 'Test Description',
            status: 'OPEN',
            createdById: userId,
          });

          // This should fail and rollback
          throw new Error('Audit log creation failed');
        });
      }).toThrow('Audit log creation failed');

      // Verify issue was rolled back
      const issues = memDb
        .prepare('SELECT * FROM issues WHERE project_id = ? AND title = ?')
        .get(projectId, 'Test Issue');
      expect(issues).toBeUndefined();
    });
  });

  describe('Comment Creation with Mentions Rollback', () => {
    it('should rollback comment and mentions when notification write fails', () => {
      const projectId = 'test-project-2';
      const issueId = 'test-issue-1';
      const userId = 'test-user-2';
      const mentionedUserId = 'test-user-3';

      // Create project, user, and issue first
      memDb.prepare('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, 'user2@test.com', 'hash', 'User 2', getTimestamp(), getTimestamp());
      memDb.prepare('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(mentionedUserId, 'user3@test.com', 'hash', 'User 3', getTimestamp(), getTimestamp());
      memDb.prepare('INSERT INTO projects (id, owner_id, name, key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(projectId, userId, 'Project 2', 'KEY2', getTimestamp(), getTimestamp());
      memDb.prepare('INSERT INTO issues (id, project_id, title, status, created_by_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(issueId, projectId, 'Issue 1', 'OPEN', userId, getTimestamp(), getTimestamp());

      // Attempt to create comment with mentions and notifications (should rollback)
      expect(() => {
        executeInTransaction(memDb, (txnDb) => {
          const comment = createComment(txnDb, {
            issueId,
            projectId,
            authorId: userId,
            content: '@test-user-3 please review',
          });

          createCommentMentions(txnDb, [
            {
              commentId: comment.id,
              issueId,
              projectId,
              mentionedUserId,
            },
          ]);

          // This should fail and rollback everything
          throw new Error('Notification creation failed');
        });
      }).toThrow('Notification creation failed');

      // Verify comment was rolled back
      const comments = memDb.prepare('SELECT * FROM issue_comments WHERE issue_id = ?').all(issueId);
      expect(comments.length).toBe(0);

      // Verify mentions were rolled back
      const mentions = memDb.prepare('SELECT * FROM issue_comment_mentions WHERE issue_id = ?').all(issueId);
      expect(mentions.length).toBe(0);
    });
  });

  describe('Project Member Operations Rollback', () => {
    it('should rollback add member when audit log write fails', () => {
      const projectId = 'test-project-3';
      const userId = 'test-user-4';
      const ownerId = 'test-owner-1';

      // Create project and owner first
      memDb.prepare('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(ownerId, 'owner@test.com', 'hash', 'Owner', getTimestamp(), getTimestamp());
      memDb.prepare('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, 'user4@test.com', 'hash', 'User 4', getTimestamp(), getTimestamp());
      memDb.prepare('INSERT INTO projects (id, owner_id, name, key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(projectId, ownerId, 'Project 3', 'KEY3', getTimestamp(), getTimestamp());

      // Attempt to add member (should rollback)
      expect(() => {
        executeInTransaction(memDb, (txnDb) => {
          addProjectMemberDb(txnDb, {
            projectId,
            userId,
            role: 'MEMBER',
          });

          // This should fail and rollback
          throw new Error('Audit log creation failed');
        });
      }).toThrow('Audit log creation failed');

      // Verify member was rolled back
      const member = findProjectMember(memDb, projectId, userId);
      expect(member).toBeNull();
    });
  });

  describe('Batch Operations Rollback', () => {
    it('should rollback entire batch when one operation fails', () => {
      const projectId = 'test-project-4';
      const userId = 'test-user-5';
      const issueIds = ['test-issue-2', 'test-issue-3', 'test-issue-4'];

      // Create project and user
      memDb.prepare('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, 'user5@test.com', 'hash', 'User 5', getTimestamp(), getTimestamp());
      memDb.prepare('INSERT INTO projects (id, owner_id, name, key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(projectId, userId, 'Project 4', 'KEY4', getTimestamp(), getTimestamp());

      // Create test issues
      issueIds.forEach((id) => {
        memDb.prepare('INSERT INTO issues (id, project_id, title, status, created_by_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          id,
          projectId,
          `Issue ${id}`,
          'OPEN',
          userId,
          getTimestamp(),
          getTimestamp()
        );
      });

      let callCount = 0;

      // Attempt batch update (should rollback all)
      expect(() => {
        executeInTransaction(memDb, (txnDb) => {
          issueIds.forEach((issueId) => {
            callCount++;
            txnDb.prepare('UPDATE issues SET status = ? WHERE id = ?').run('CLOSED', issueId);

            // Fail on second issue
            if (callCount === 2) {
              throw new Error('Audit log creation failed on second issue');
            }

            createIssueAuditLog(txnDb, {
              issueId,
              projectId,
              actorId: userId,
              action: 'ISSUE_STATUS_CHANGED',
              fromStatus: 'OPEN',
              toStatus: 'CLOSED',
            });
          });
        });
      }).toThrow('Audit log creation failed on second issue');

      // Verify all issues were rolled back to original status
      const rolledBackIssues = memDb
        .prepare(`SELECT id, status FROM issues WHERE id IN (${issueIds.map(() => '?').join(',')})`)
        .all(...issueIds);

      rolledBackIssues.forEach((issue: any) => {
        expect(issue.status).toBe('OPEN');
      });

      // Verify no audit logs were created
      const auditLogs = memDb
        .prepare(`SELECT COUNT(*) as count FROM issue_audit_logs WHERE issue_id IN (${issueIds.map(() => '?').join(',')})`)
        .get(...issueIds) as { count: number };
      expect(auditLogs.count).toBe(0);
    });
  });
});
