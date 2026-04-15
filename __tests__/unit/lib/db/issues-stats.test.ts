import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  getCloseReasonStats,
  createIssue,
} from '@/lib/db/issues';
import { createProject } from '@/lib/db/projects';

describe('Issue Close Reason Stats - Database Layer', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Create test schema
    db.exec(`
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
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
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
        CHECK (status IN ('OPEN', 'CLOSED'))
      );
    `);

    // Insert test data
    db.exec(`
      INSERT INTO users VALUES ('user-1', 'user1@example.com', 'hash', 'User One', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO users VALUES ('user-2', 'user2@example.com', 'hash', 'User Two', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('getCloseReasonStats', () => {
    it('should return empty stats when no closed issues exist', () => {
      // Create a project
      const project = createProject(db, {
        name: 'Test Project',
        key: 'TEST',
        description: 'Test Description',
        ownerId: 'user-1',
      });

      // Get stats
      const result = getCloseReasonStats(db, { projectId: project.id });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should aggregate stats by close reason for a specific project', () => {
      // Create a project
      const project = createProject(db, {
        name: 'Test Project',
        key: 'TEST',
        description: 'Test Description',
        ownerId: 'user-1',
      });

      // Create closed issues with different close reasons
      createIssue(db, {
        projectId: project.id,
        title: 'Issue 1',
        description: null,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
        createdById: 'user-1',
      });

      createIssue(db, {
        projectId: project.id,
        title: 'Issue 2',
        description: null,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
        createdById: 'user-1',
      });

      createIssue(db, {
        projectId: project.id,
        title: 'Issue 3',
        description: null,
        status: 'CLOSED',
        closeReason: 'NOT_PLANNED',
        createdById: 'user-1',
      });

      createIssue(db, {
        projectId: project.id,
        title: 'Issue 4',
        description: null,
        status: 'CLOSED',
        closeReason: 'DUPLICATE',
        createdById: 'user-1',
      });

      // Get stats
      const result = getCloseReasonStats(db, { projectId: project.id });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(4);

      // Check COMPLETED count (should be first as it has highest count)
      const completed = result.items.find(item => item.closeReason === 'COMPLETED');
      expect(completed?.count).toBe(2);

      // Check other close reasons
      const notPlanned = result.items.find(item => item.closeReason === 'NOT_PLANNED');
      expect(notPlanned?.count).toBe(1);

      const duplicate = result.items.find(item => item.closeReason === 'DUPLICATE');
      expect(duplicate?.count).toBe(1);
    });

    it('should only count CLOSED issues, not OPEN issues', () => {
      // Create a project
      const project = createProject(db, {
        name: 'Test Project',
        key: 'TEST',
        description: 'Test Description',
        ownerId: 'user-1',
      });

      // Create closed issues
      createIssue(db, {
        projectId: project.id,
        title: 'Closed Issue',
        description: null,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
        createdById: 'user-1',
      });

      // Create open issues (should not be counted)
      createIssue(db, {
        projectId: project.id,
        title: 'Open Issue',
        description: null,
        status: 'OPEN',
        closeReason: null,
        createdById: 'user-1',
      });

      // Get stats
      const result = getCloseReasonStats(db, { projectId: project.id });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].closeReason).toBe('COMPLETED');
      expect(result.items[0].count).toBe(1);
    });

    it('should aggregate stats across multiple projects using projectIds filter', () => {
      // Create two projects
      const project1 = createProject(db, {
        name: 'Project 1',
        key: 'PROJ1',
        description: 'Description 1',
        ownerId: 'user-1',
      });

      const project2 = createProject(db, {
        name: 'Project 2',
        key: 'PROJ2',
        description: 'Description 2',
        ownerId: 'user-1',
      });

      // Create issues in project1
      createIssue(db, {
        projectId: project1.id,
        title: 'Issue 1',
        description: null,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
        createdById: 'user-1',
      });

      createIssue(db, {
        projectId: project1.id,
        title: 'Issue 2',
        description: null,
        status: 'CLOSED',
        closeReason: 'NOT_PLANNED',
        createdById: 'user-1',
      });

      // Create issues in project2
      createIssue(db, {
        projectId: project2.id,
        title: 'Issue 3',
        description: null,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
        createdById: 'user-1',
      });

      // Get stats for both projects
      const result = getCloseReasonStats(db, {
        projectIds: [project1.id, project2.id],
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);

      // Should have 2 COMPLETED (one from each project)
      const completed = result.items.find(item => item.closeReason === 'COMPLETED');
      expect(completed?.count).toBe(2);

      // Should have 1 NOT_PLANNED
      const notPlanned = result.items.find(item => item.closeReason === 'NOT_PLANNED');
      expect(notPlanned?.count).toBe(1);
    });

    it('should return results ordered by count descending', () => {
      // Create a project
      const project = createProject(db, {
        name: 'Test Project',
        key: 'TEST',
        description: 'Test Description',
        ownerId: 'user-1',
      });

      // Create issues with varying counts
      for (let i = 0; i < 5; i++) {
        createIssue(db, {
          projectId: project.id,
          title: `Issue ${i}`,
          description: null,
          status: 'CLOSED',
          closeReason: 'COMPLETED',
          createdById: 'user-1',
        });
      }

      for (let i = 0; i < 3; i++) {
        createIssue(db, {
          projectId: project.id,
          title: `Issue ${i + 5}`,
          description: null,
          status: 'CLOSED',
          closeReason: 'NOT_PLANNED',
          createdById: 'user-1',
        });
      }

      for (let i = 0; i < 2; i++) {
        createIssue(db, {
          projectId: project.id,
          title: `Issue ${i + 8}`,
          description: null,
          status: 'CLOSED',
          closeReason: 'DUPLICATE',
          createdById: 'user-1',
        });
      }

      // Get stats
      const result = getCloseReasonStats(db, { projectId: project.id });

      // Should be ordered by count descending
      expect(result.items[0].closeReason).toBe('COMPLETED');
      expect(result.items[0].count).toBe(5);
      expect(result.items[1].closeReason).toBe('NOT_PLANNED');
      expect(result.items[1].count).toBe(3);
      expect(result.items[2].closeReason).toBe('DUPLICATE');
      expect(result.items[2].count).toBe(2);
    });

    it('should handle empty projectIds array', () => {
      // Get stats with empty projectIds array
      const result = getCloseReasonStats(db, { projectIds: [] });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
