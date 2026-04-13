import Database from 'better-sqlite3';
import {
  createComment,
  findCommentsByIssueId,
} from '@/lib/db/issue-comments';

describe('Issue Comment Database Operations', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create an in-memory database for testing
    db = new Database(':memory:');

    // Create necessary tables
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        key TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      );

      CREATE TABLE issues (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        created_by_id TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (created_by_id) REFERENCES users(id)
      );

      CREATE TABLE issue_comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (issue_id) REFERENCES issues(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (author_id) REFERENCES users(id),
        CHECK (length(content) >= 1 AND length(content) <= 5000)
      );
    `);

    // Insert test data
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      'user-1',
      'user@example.com',
      'hash',
      'Test User'
    );

    db.prepare('INSERT INTO projects (id, owner_id, name, key, description) VALUES (?, ?, ?, ?, ?)').run(
      'project-1',
      'user-1',
      'Test Project',
      'TEST',
      'A test project'
    );

    db.prepare('INSERT INTO issues (id, project_id, title, description, status, created_by_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      'issue-1',
      'project-1',
      'Test Issue',
      'A test issue',
      'OPEN',
      'user-1'
    );
  });

  describe('createComment', () => {
    it('should create a new comment', () => {
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'This is a test comment',
      };

      const comment = createComment(db, commentData);

      expect(comment.id).toBeDefined();
      expect(comment.issueId).toBe(commentData.issueId);
      expect(comment.projectId).toBe(commentData.projectId);
      expect(comment.authorId).toBe(commentData.authorId);
      expect(comment.content).toBe(commentData.content);
      expect(comment.createdAt).toBeDefined();
    });

    it('should create comment with minimal content (1 character)', () => {
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'a',
      };

      const comment = createComment(db, commentData);

      expect(comment.content).toBe('a');
    });

    it('should create comment with maximum content (5000 characters)', () => {
      const longContent = 'a'.repeat(5000);
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: longContent,
      };

      const comment = createComment(db, commentData);

      expect(comment.content).toBe(longContent);
    });

    it('should create comment with special characters', () => {
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Comment with @user #tag and https://example.com',
      };

      const comment = createComment(db, commentData);

      expect(comment.content).toBe(commentData.content);
    });

    it('should create comment with newlines and tabs', () => {
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Line 1\nLine 2\n\tTabbed',
      };

      const comment = createComment(db, commentData);

      expect(comment.content).toBe(commentData.content);
    });

    it('should create comment with unicode characters', () => {
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Comment with emoji 🎉 and 中文',
      };

      const comment = createComment(db, commentData);

      expect(comment.content).toBe(commentData.content);
    });

    it('should generate unique IDs for each comment', () => {
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'This is a test comment',
      };

      const comment1 = createComment(db, commentData);
      const comment2 = createComment(db, commentData);

      expect(comment1.id).not.toBe(comment2.id);
    });

    it('should generate timestamps in ISO format', () => {
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'This is a test comment',
      };

      const comment = createComment(db, commentData);

      expect(comment.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(comment.createdAt)).toBeInstanceOf(Date);
    });

    it('should store comment in database', () => {
      const commentData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'This is a test comment',
      };

      const created = createComment(db, commentData);
      const found = findCommentsByIssueId(db, commentData.issueId);

      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(created.id);
      expect(found[0].content).toBe(created.content);
    });
  });

  describe('findCommentsByIssueId', () => {
    it('should return empty array for issue with no comments', () => {
      const comments = findCommentsByIssueId(db, 'issue-1');

      expect(comments).toEqual([]);
    });

    it('should find all comments for an issue', () => {
      const issueId = 'issue-1';

      createComment(db, {
        issueId,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'First comment',
      });

      createComment(db, {
        issueId,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Second comment',
      });

      const comments = findCommentsByIssueId(db, issueId);

      expect(comments).toHaveLength(2);
      expect(comments[0].content).toBe('First comment');
      expect(comments[1].content).toBe('Second comment');
    });

    it('should return comments ordered by created_at ascending', () => {
      const issueId = 'issue-1';

      const comment1 = createComment(db, {
        issueId,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'First comment',
      });

      // Small delay to ensure different timestamps
      const startTime = Date.now();
      while (Date.now() - startTime < 2) {
        // Wait
      }

      const comment2 = createComment(db, {
        issueId,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Second comment',
      });

      const comments = findCommentsByIssueId(db, issueId);

      expect(comments).toHaveLength(2);
      expect(comments[0].id).toBe(comment1.id);
      expect(comments[1].id).toBe(comment2.id);
    });

    it('should not return comments from other issues', () => {
      const issue1Id = 'issue-1';
      const issue2Id = 'issue-2';

      // Create a second issue for testing
      db.prepare('INSERT INTO issues (id, project_id, title, description, status, created_by_id) VALUES (?, ?, ?, ?, ?, ?)').run(
        'issue-2',
        'project-1',
        'Test Issue 2',
        'Another test issue',
        'OPEN',
        'user-1'
      );

      createComment(db, {
        issueId: issue1Id,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Comment for issue 1',
      });

      createComment(db, {
        issueId: issue2Id,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Comment for issue 2',
      });

      const comments1 = findCommentsByIssueId(db, issue1Id);
      const comments2 = findCommentsByIssueId(db, issue2Id);

      expect(comments1).toHaveLength(1);
      expect(comments1[0].content).toBe('Comment for issue 1');

      expect(comments2).toHaveLength(1);
      expect(comments2[0].content).toBe('Comment for issue 2');
    });

    it('should return comments with all required fields', () => {
      const issueId = 'issue-1';
      const commentData = {
        issueId,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'This is a test comment',
      };

      const created = createComment(db, commentData);
      const comments = findCommentsByIssueId(db, issueId);

      expect(comments).toHaveLength(1);
      expect(comments[0]).toEqual({
        id: created.id,
        issueId: commentData.issueId,
        projectId: commentData.projectId,
        authorId: commentData.authorId,
        content: commentData.content,
        createdAt: created.createdAt,
      });
    });

    it('should handle comments from multiple authors', () => {
      const issueId = 'issue-1';

      // Create a second user for testing
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
        'user-2',
        'user2@example.com',
        'hash',
        'Test User 2'
      );

      createComment(db, {
        issueId,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Comment from user 1',
      });

      createComment(db, {
        issueId,
        projectId: 'project-1',
        authorId: 'user-2',
        content: 'Comment from user 2',
      });

      const comments = findCommentsByIssueId(db, issueId);

      expect(comments).toHaveLength(2);
      expect(comments[0].authorId).toBe('user-1');
      expect(comments[1].authorId).toBe('user-2');
    });

    it('should handle comments from different projects', () => {
      const issueId = 'issue-1';

      // Create a second project for testing
      db.prepare('INSERT INTO projects (id, owner_id, name, key, description) VALUES (?, ?, ?, ?, ?)').run(
        'project-2',
        'user-1',
        'Test Project 2',
        'TEST2',
        'Another test project'
      );

      createComment(db, {
        issueId,
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Comment from project 1',
      });

      createComment(db, {
        issueId,
        projectId: 'project-2',
        authorId: 'user-1',
        content: 'Comment from project 2',
      });

      const comments = findCommentsByIssueId(db, issueId);

      expect(comments).toHaveLength(2);
      expect(comments[0].projectId).toBe('project-1');
      expect(comments[1].projectId).toBe('project-2');
    });
  });
});
