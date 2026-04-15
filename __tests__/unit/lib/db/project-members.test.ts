import Database from 'better-sqlite3';
import {
  addProjectMember,
  removeProjectMember,
  findProjectMember,
  findProjectMembersWithDetails,
  countProjectOwners,
  isProjectMember,
  isProjectOwner,
  findUnclosedIssuesByAssigneeInProject,
  findProjectIdsByUserId,
} from '@/lib/db/project-members';

describe('Project Members Database Layer', () => {
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

      CREATE TABLE project_members (
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
      INSERT INTO users VALUES ('user1', 'user1@example.com', 'hash', 'User One', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO users VALUES ('user2', 'user2@example.com', 'hash', 'User Two', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO users VALUES ('user3', 'user3@example.com', 'hash', 'User Three', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

      INSERT INTO projects VALUES ('project1', 'user1', 'Project One', 'PROJ1', 'Description', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO projects VALUES ('project2', 'user1', 'Project Two', 'PROJ2', 'Description', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

      INSERT INTO project_members VALUES ('member1', 'project1', 'user1', 'OWNER', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO project_members VALUES ('member2', 'project1', 'user2', 'MEMBER', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO project_members VALUES ('member3', 'project2', 'user1', 'OWNER', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

      INSERT INTO issues VALUES ('issue1', 'project1', 'Issue One', 'Description', 'OPEN', NULL, 'user1', 'user2', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO issues VALUES ('issue2', 'project1', 'Issue Two', 'Description', 'CLOSED', 'COMPLETED', 'user1', 'user2', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO issues VALUES ('issue3', 'project1', 'Issue Three', 'Description', 'OPEN', NULL, 'user1', 'user2', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('addProjectMember', () => {
    it('should add a member to a project', () => {
      const result = addProjectMember(db, {
        projectId: 'project1',
        userId: 'user3',
        role: 'MEMBER',
      });

      expect(result).toMatchObject({
        projectId: 'project1',
        userId: 'user3',
        role: 'MEMBER',
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should throw error when adding duplicate member', () => {
      expect(() => {
        addProjectMember(db, {
          projectId: 'project1',
          userId: 'user1',
          role: 'MEMBER',
        });
      }).toThrow();
    });
  });

  describe('removeProjectMember', () => {
    it('should remove a member from a project', () => {
      const result = removeProjectMember(db, 'project1', 'user2');
      expect(result).toBe(true);

      // Verify member is removed
      const member = findProjectMember(db, 'project1', 'user2');
      expect(member).toBeNull();
    });

    it('should return false when removing non-existent member', () => {
      const result = removeProjectMember(db, 'project1', 'user3');
      expect(result).toBe(false);
    });
  });

  describe('findProjectMember', () => {
    it('should find existing member', () => {
      const member = findProjectMember(db, 'project1', 'user1');
      expect(member).toMatchObject({
        projectId: 'project1',
        userId: 'user1',
        role: 'OWNER',
      });
    });

    it('should return null for non-existent member', () => {
      const member = findProjectMember(db, 'project1', 'user3');
      expect(member).toBeNull();
    });
  });

  describe('findProjectMembersWithDetails', () => {
    it('should return all members with user details', () => {
      const members = findProjectMembersWithDetails(db, 'project1');

      expect(members).toHaveLength(2);
      expect(members[0]).toMatchObject({
        userId: 'user1',
        displayName: 'User One',
        email: 'user1@example.com',
        role: 'OWNER',
      });
      expect(members[1]).toMatchObject({
        userId: 'user2',
        displayName: 'User Two',
        email: 'user2@example.com',
        role: 'MEMBER',
      });
    });

    it('should return empty array for project with no members', () => {
      const members = findProjectMembersWithDetails(db, 'project2');
      expect(members).toHaveLength(1); // Only user1 as owner
    });
  });

  describe('countProjectOwners', () => {
    it('should count owners correctly', () => {
      const count = countProjectOwners(db, 'project1');
      expect(count).toBe(1);
    });

    it('should return 0 for project with no owners', () => {
      // Remove all owners first
      removeProjectMember(db, 'project2', 'user1');

      const count = countProjectOwners(db, 'project2');
      expect(count).toBe(0);
    });
  });

  describe('isProjectMember', () => {
    it('should return true for members', () => {
      expect(isProjectMember(db, 'project1', 'user1')).toBe(true);
      expect(isProjectMember(db, 'project1', 'user2')).toBe(true);
    });

    it('should return false for non-members', () => {
      expect(isProjectMember(db, 'project1', 'user3')).toBe(false);
    });
  });

  describe('isProjectOwner', () => {
    it('should return true for owners', () => {
      expect(isProjectOwner(db, 'project1', 'user1')).toBe(true);
    });

    it('should return false for regular members', () => {
      expect(isProjectOwner(db, 'project1', 'user2')).toBe(false);
    });

    it('should return false for non-members', () => {
      expect(isProjectOwner(db, 'project1', 'user3')).toBe(false);
    });
  });

  describe('findUnclosedIssuesByAssigneeInProject', () => {
    it('should count unclosed issues for assignee', () => {
      const count = findUnclosedIssuesByAssigneeInProject(db, 'project1', 'user2');
      expect(count).toBe(2); // issue1 and issue3 are OPEN
    });

    it('should return 0 for assignee with no unclosed issues', () => {
      const count = findUnclosedIssuesByAssigneeInProject(db, 'project1', 'user1');
      expect(count).toBe(0);
    });
  });

  describe('findProjectIdsByUserId', () => {
    it('should return all project IDs for user', () => {
      const projectIds = findProjectIdsByUserId(db, 'user1');
      expect(projectIds).toContain('project1');
      expect(projectIds).toContain('project2');
      expect(projectIds).toHaveLength(2);
    });

    it('should return empty array for user with no projects', () => {
      const projectIds = findProjectIdsByUserId(db, 'user3');
      expect(projectIds).toEqual([]);
    });
  });
});
