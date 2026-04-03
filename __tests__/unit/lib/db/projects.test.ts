import Database from 'better-sqlite3';
import {
  createProject,
  findProjectById,
  findProjectsByOwnerId,
  findProjectByOwnerAndKey,
} from '@/lib/db/projects';
import { createUser } from '@/lib/db/users';
import { createTestDb } from '../../../test-helpers';
import type { ProjectData } from '@/lib/db/projects';
import type { UserData } from '@/lib/db/users';

describe('Project Database Operations', () => {
  let db: Database.Database;

  const createTestUser = (overrides?: Partial<UserData>) => {
    const userData: UserData = {
      email: overrides?.email || 'test@example.com',
      passwordHash: overrides?.passwordHash || 'test-hash',
      name: overrides?.name || 'Test User',
    };
    return createUser(db, userData);
  };

  beforeEach(() => {
    db = createTestDb();
  });

  describe('createProject', () => {
    it('should create a new project with generated ID and timestamps', () => {
      const user = createTestUser();
      const projectData: ProjectData = {
        ownerId: user.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      };

      const project = createProject(db, projectData);

      expect(project.id).toBeDefined();
      expect(typeof project.id).toBe('string');
      expect(project.ownerId).toBe(projectData.ownerId);
      expect(project.name).toBe(projectData.name);
      expect(project.key).toBe(projectData.key);
      expect(project.description).toBe(projectData.description);
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });

    it('should create project with null description', () => {
      const user = createTestUser();
      const projectData: ProjectData = {
        ownerId: user.id,
        name: 'Test Project',
        key: 'TEST',
        description: null,
      };

      const project = createProject(db, projectData);

      expect(project.description).toBeNull();
    });

    it('should store project in database', () => {
      const user = createTestUser();
      const projectData: ProjectData = {
        ownerId: user.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      };

      const created = createProject(db, projectData);
      const found = findProjectById(db, created.id);

      expect(found).toEqual(created);
    });
  });

  describe('findProjectById', () => {
    it('should return project when it exists', () => {
      const user = createTestUser();
      const projectData: ProjectData = {
        ownerId: user.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      };

      const created = createProject(db, projectData);
      const found = findProjectById(db, created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should return null when project does not exist', () => {
      const found = findProjectById(db, 'non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findProjectsByOwnerId', () => {
    it('should return empty array when user has no projects', () => {
      const user = createTestUser();
      const projects = findProjectsByOwnerId(db, user.id);
      expect(projects).toEqual([]);
    });

    it('should return all projects for a user', () => {
      const user = createTestUser();
      const project1 = createProject(db, {
        ownerId: user.id,
        name: 'Project 1',
        key: 'PROJ1',
        description: 'First project',
      });

      const project2 = createProject(db, {
        ownerId: user.id,
        name: 'Project 2',
        key: 'PROJ2',
        description: 'Second project',
      });

      // Create project for different user
      const otherUser = createTestUser({
        email: 'other@example.com',
        passwordHash: 'other-hash',
        name: 'Other User',
      });
      createProject(db, {
        ownerId: otherUser.id,
        name: 'Other Project',
        key: 'OTHER',
        description: 'Other user project',
      });

      const projects = findProjectsByOwnerId(db, user.id);

      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.id)).toContain(project1.id);
      expect(projects.map((p) => p.id)).toContain(project2.id);
    });

    it('should return projects in descending order of creation', () => {
      const user = createTestUser();
      const project1 = createProject(db, {
        ownerId: user.id,
        name: 'Project 1',
        key: 'PROJ1',
        description: 'First project',
      });

      // Add a small delay to ensure different timestamps
      const startTime = Date.now();
      while (Date.now() - startTime < 2) {
        // Wait
      }

      const project2 = createProject(db, {
        ownerId: user.id,
        name: 'Project 2',
        key: 'PROJ2',
        description: 'Second project',
      });

      const projects = findProjectsByOwnerId(db, user.id);

      expect(projects[0].id).toBe(project2.id);
      expect(projects[1].id).toBe(project1.id);
    });
  });

  describe('findProjectByOwnerAndKey', () => {
    it('should return project when owner and key match', () => {
      const user = createTestUser();
      const projectData: ProjectData = {
        ownerId: user.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      };

      const created = createProject(db, projectData);
      const found = findProjectByOwnerAndKey(db, user.id, 'TEST');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should return null when owner does not match', () => {
      const user = createTestUser();
      createProject(db, {
        ownerId: user.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      });

      const otherUser = createTestUser({
        email: 'other@example.com',
        passwordHash: 'other-hash',
        name: 'Other User',
      });
      const found = findProjectByOwnerAndKey(db, otherUser.id, 'TEST');
      expect(found).toBeNull();
    });

    it('should return null when key does not match', () => {
      const user = createTestUser();
      createProject(db, {
        ownerId: user.id,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      });

      const found = findProjectByOwnerAndKey(db, user.id, 'OTHER');
      expect(found).toBeNull();
    });

    it('should return null when project does not exist', () => {
      const user = createTestUser();
      const found = findProjectByOwnerAndKey(db, user.id, 'TEST');
      expect(found).toBeNull();
    });

    it('should allow different users to have projects with same key', () => {
      const user1 = createTestUser({
        email: 'user1@example.com',
        passwordHash: 'hash1',
        name: 'User 1',
      });
      const project1 = createProject(db, {
        ownerId: user1.id,
        name: 'Project 1',
        key: 'TEST',
        description: 'First user project',
      });

      const user2 = createTestUser({
        email: 'user2@example.com',
        passwordHash: 'hash2',
        name: 'User 2',
      });
      const project2 = createProject(db, {
        ownerId: user2.id,
        name: 'Project 2',
        key: 'TEST',
        description: 'Second user project',
      });

      const found1 = findProjectByOwnerAndKey(db, user1.id, 'TEST');
      const found2 = findProjectByOwnerAndKey(db, user2.id, 'TEST');

      expect(found1?.id).toBe(project1.id);
      expect(found2?.id).toBe(project2.id);
      expect(found1?.id).not.toBe(found2?.id);
    });
  });

  describe('unique constraint', () => {
    it('should enforce unique constraint on (ownerId, key)', () => {
      const user = createTestUser();
      createProject(db, {
        ownerId: user.id,
        name: 'Project 1',
        key: 'TEST',
        description: 'First project',
      });

      expect(() => {
        createProject(db, {
          ownerId: user.id,
          name: 'Project 2',
          key: 'TEST',
          description: 'Duplicate key',
        });
      }).toThrow();
    });
  });
});
