import Database from 'better-sqlite3';
import { createCommentMentions, findMentionsByCommentId, findMentionsByIssueId, deleteMentionsByCommentId } from '@/lib/db/issue-comment-mentions';
import { createComment } from '@/lib/db/issue-comments';
import { createUser } from '@/lib/db/users';
import { createProject } from '@/lib/db/projects';
import { createIssue } from '@/lib/db/issues';
import type { User } from '@/lib/db/users';
import type { Project } from '@/lib/db/projects';
import type { Issue } from '@/lib/db/issues';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create all necessary tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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
      CHECK (status IN ('OPEN', 'CLOSED'))
    );

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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
    CREATE INDEX IF NOT EXISTS idx_issue_comment_mentions_comment_id ON issue_comment_mentions(comment_id);
  `);

  return db;
}

describe('Issue Comment Mentions DB Layer', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('createCommentMentions', () => {
    let user1: User;
    let user2: User;
    let user3: User;
    let project: Project;
    let issue: Issue;
    let comment: ReturnType<typeof createComment>;

    beforeEach(() => {
      // Setup test data
      user1 = createUser(db, {
        email: 'user1@example.com',
        passwordHash: 'hash1',
        name: 'User One',
      });

      user2 = createUser(db, {
        email: 'user2@example.com',
        passwordHash: 'hash2',
        name: 'User Two',
      });

      user3 = createUser(db, {
        email: 'user3@example.com',
        passwordHash: 'hash3',
        name: 'User Three',
      });

      project = createProject(db, {
        ownerId: user1.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'Test',
      });

      issue = createIssue(db, {
        projectId: project.id,
        title: 'Test Issue',
        description: 'Test',
        status: 'OPEN',
        closeReason: null,
        createdById: user1.id,
        assigneeId: null,
      });

      comment = createComment(db, {
        issueId: issue.id,
        projectId: project.id,
        authorId: user1.id,
        content: 'Test comment',
      });
    });

    it('should create single mention successfully', () => {
      const mentionData = {
        commentId: comment.id,
        issueId: issue.id,
        projectId: project.id,
        mentionedUserId: user1.id,
      };

      const result = createCommentMentions(db, [mentionData]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        commentId: comment.id,
        issueId: issue.id,
        projectId: project.id,
        mentionedUserId: user1.id,
      });
      expect(result[0].id).toBeDefined();
      expect(result[0].createdAt).toBeDefined();
    });

    it('should create multiple mentions successfully', () => {
      const mentionsData = [
        {
          commentId: comment.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user1.id,
        },
        {
          commentId: comment.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user2.id,
        },
        {
          commentId: comment.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user3.id,
        },
      ];

      const result = createCommentMentions(db, mentionsData);

      expect(result).toHaveLength(3);
      expect(result[0].mentionedUserId).toBe(user1.id);
      expect(result[1].mentionedUserId).toBe(user2.id);
      expect(result[2].mentionedUserId).toBe(user3.id);
    });

    it('should return empty array when no mentions provided', () => {
      const result = createCommentMentions(db, []);
      expect(result).toEqual([]);
    });

    it('should throw error when trying to create duplicate mention for same comment and user', () => {
      const mentionData = {
        commentId: comment.id,
        issueId: issue.id,
        projectId: project.id,
        mentionedUserId: user1.id,
      };

      // First creation should succeed
      createCommentMentions(db, [mentionData]);

      // Second creation with same data should fail due to unique constraint
      expect(() => {
        createCommentMentions(db, [mentionData]);
      }).toThrow();
    });

    it('should allow same user to be mentioned in different comments', () => {
      const comment2 = createComment(db, {
        issueId: issue.id,
        projectId: project.id,
        authorId: user1.id,
        content: 'Test comment 2',
      });

      const mentionsData = [
        {
          commentId: comment.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user1.id,
        },
        {
          commentId: comment2.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user1.id,
        },
      ];

      const result = createCommentMentions(db, mentionsData);

      expect(result).toHaveLength(2);
    });
  });

  describe('findMentionsByCommentId', () => {
    let user1: User;
    let user2: User;
    let project: Project;
    let issue: Issue;
    let comment1: ReturnType<typeof createComment>;

    beforeEach(() => {
      // Setup test data
      user1 = createUser(db, {
        email: 'user1@example.com',
        passwordHash: 'hash1',
        name: 'User One',
      });

      user2 = createUser(db, {
        email: 'user2@example.com',
        passwordHash: 'hash2',
        name: 'User Two',
      });

      project = createProject(db, {
        ownerId: user1.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'Test',
      });

      issue = createIssue(db, {
        projectId: project.id,
        title: 'Test Issue',
        description: 'Test',
        status: 'OPEN',
        closeReason: null,
        createdById: user1.id,
        assigneeId: null,
      });

      comment1 = createComment(db, {
        issueId: issue.id,
        projectId: project.id,
        authorId: user1.id,
        content: 'Test comment',
      });

      // Create mentions
      createCommentMentions(db, [
        {
          commentId: comment1.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user2.id,
        },
      ]);
    });

    it('should find mentions by comment id with user details', () => {
      const mentions = findMentionsByCommentId(db, comment1.id);

      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toMatchObject({
        commentId: comment1.id,
        mentionedUserId: user2.id,
        displayName: user2.name,
        email: user2.email,
      });
    });

    it('should return empty array when no mentions exist for comment', () => {
      const mentions = findMentionsByCommentId(db, 'nonexistent-comment');
      expect(mentions).toEqual([]);
    });

    it('should return multiple mentions for a comment', () => {
      const user3 = createUser(db, {
        email: 'user3@example.com',
        passwordHash: 'hash3',
        name: 'User Three',
      });

      createCommentMentions(db, [
        {
          commentId: comment1.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user3.id,
        },
      ]);

      const mentions = findMentionsByCommentId(db, comment1.id);

      expect(mentions).toHaveLength(2);
      const displayNames = mentions.map(m => m.displayName).sort();
      expect(displayNames).toEqual(['User Three', 'User Two']);
    });

    it('should order mentions by created_at', () => {
      // Create more mentions
      createCommentMentions(db, [
        {
          commentId: comment1.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user1.id,
        },
      ]);

      const mentions = findMentionsByCommentId(db, comment1.id);

      expect(mentions.length).toBeGreaterThan(0);
      // Verify order is maintained
      const firstMention = mentions[0];
      expect(firstMention).toBeDefined();
    });
  });

  describe('findMentionsByIssueId', () => {
    let user1: User;
    let user2: User;
    let project: Project;
    let issue: Issue;

    beforeEach(() => {
      user1 = createUser(db, {
        email: 'user1@example.com',
        passwordHash: 'hash1',
        name: 'User One',
      });

      user2 = createUser(db, {
        email: 'user2@example.com',
        passwordHash: 'hash2',
        name: 'User Two',
      });

      project = createProject(db, {
        ownerId: user1.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'Test',
      });

      issue = createIssue(db, {
        projectId: project.id,
        title: 'Test Issue',
        description: 'Test',
        status: 'OPEN',
        closeReason: null,
        createdById: user1.id,
        assigneeId: null,
      });

      const comment1 = createComment(db, {
        issueId: issue.id,
        projectId: project.id,
        authorId: user1.id,
        content: 'Test comment 1',
      });

      const comment2 = createComment(db, {
        issueId: issue.id,
        projectId: project.id,
        authorId: user1.id,
        content: 'Test comment 2',
      });

      // Create mentions for both comments
      createCommentMentions(db, [
        {
          commentId: comment1.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user2.id,
        },
        {
          commentId: comment2.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user1.id,
        },
      ]);
    });

    it('should find all mentions for an issue', () => {
      const mentions = findMentionsByIssueId(db, issue.id);

      expect(mentions).toHaveLength(2);
      const mentionedUsers = mentions.map(m => m.mentionedUserId).sort();
      expect(mentionedUsers).toEqual([user1.id, user2.id].sort());
    });

    it('should return empty array when no mentions exist for issue', () => {
      const mentions = findMentionsByIssueId(db, 'nonexistent-issue');
      expect(mentions).toEqual([]);
    });

    it('should include user details in mentions', () => {
      const mentions = findMentionsByIssueId(db, issue.id);

      expect(mentions.length).toBeGreaterThan(0);
      mentions.forEach(mention => {
        expect(mention.displayName).toBeDefined();
        expect(mention.email).toBeDefined();
      });
    });
  });

  describe('deleteMentionsByCommentId', () => {
    let user1: User;
    let project: Project;
    let issue: Issue;
    let comment1: ReturnType<typeof createComment>;

    beforeEach(() => {
      user1 = createUser(db, {
        email: 'user1@example.com',
        passwordHash: 'hash1',
        name: 'User One',
      });

      project = createProject(db, {
        ownerId: user1.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'Test',
      });

      issue = createIssue(db, {
        projectId: project.id,
        title: 'Test Issue',
        description: 'Test',
        status: 'OPEN',
        closeReason: null,
        createdById: user1.id,
        assigneeId: null,
      });

      comment1 = createComment(db, {
        issueId: issue.id,
        projectId: project.id,
        authorId: user1.id,
        content: 'Test comment',
      });

      createCommentMentions(db, [
        {
          commentId: comment1.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user1.id,
        },
      ]);
    });

    it('should delete all mentions for a comment', () => {
      // Verify mention exists
      let mentions = findMentionsByCommentId(db, comment1.id);
      expect(mentions).toHaveLength(1);

      // Delete mentions
      const deletedCount = deleteMentionsByCommentId(db, comment1.id);
      expect(deletedCount).toBe(1);

      // Verify mentions are deleted
      mentions = findMentionsByCommentId(db, comment1.id);
      expect(mentions).toHaveLength(0);
    });

    it('should return 0 when deleting mentions for nonexistent comment', () => {
      const deletedCount = deleteMentionsByCommentId(db, 'nonexistent-comment');
      expect(deletedCount).toBe(0);
    });

    it('should only delete mentions for specified comment', () => {
      const comment2 = createComment(db, {
        issueId: issue.id,
        projectId: project.id,
        authorId: user1.id,
        content: 'Test comment 2',
      });

      createCommentMentions(db, [
        {
          commentId: comment2.id,
          issueId: issue.id,
          projectId: project.id,
          mentionedUserId: user1.id,
        },
      ]);

      // Delete mentions for comment1
      deleteMentionsByCommentId(db, comment1.id);

      // Verify comment1 mentions are deleted
      let mentions = findMentionsByCommentId(db, comment1.id);
      expect(mentions).toHaveLength(0);

      // Verify comment2 mentions still exist
      mentions = findMentionsByCommentId(db, comment2.id);
      expect(mentions).toHaveLength(1);
    });
  });
});
