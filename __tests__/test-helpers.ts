import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { User, UserData } from '@/lib/db/users';
import type { Project, ProjectData } from '@/lib/db/projects';

// Create an in-memory test database
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

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

    CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_projects_key ON projects(key);

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
  `);

  return db;
}

// Create a test user
export function createTestUser(overrides?: Partial<User>): User {
  const now = new Date().toISOString();
  const id = overrides?.id || randomUUID();

  return {
    id,
    email: overrides?.email || 'test@example.com',
    passwordHash: overrides?.passwordHash || 'test-hash',
    name: overrides?.name || 'Test User',
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  };
}

// Create test user data
export function createTestUserData(overrides?: Partial<UserData>): UserData {
  return {
    email: overrides?.email || 'test@example.com',
    passwordHash: overrides?.passwordHash || 'test-hash',
    name: overrides?.name || 'Test User',
  };
}

// Create a test project
export function createTestProject(overrides?: Partial<Project>): Project {
  const now = new Date().toISOString();
  const id = overrides?.id || randomUUID();

  return {
    id,
    ownerId: overrides?.ownerId || 'user-123',
    name: overrides?.name || 'Test Project',
    key: overrides?.key || 'TEST',
    description: overrides?.description || 'A test project',
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  };
}

// Create test project data
export function createTestProjectData(overrides?: Partial<ProjectData>): ProjectData {
  return {
    ownerId: overrides?.ownerId || 'user-123',
    name: overrides?.name || 'Test Project',
    key: overrides?.key || 'TEST',
    description: overrides?.description || 'A test project',
  };
}

// Issue interfaces (will be properly imported from lib/db/issues once created)
export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueData {
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  createdById: string;
}

// Create a test issue
export function createTestIssue(overrides?: Partial<Issue>): Issue {
  const now = new Date().toISOString();
  const id = overrides?.id || randomUUID();

  return {
    id,
    projectId: overrides?.projectId || 'project-123',
    title: overrides?.title || 'Test Issue',
    description: overrides?.description || 'A test issue',
    status: overrides?.status || 'OPEN',
    createdById: overrides?.createdById || 'user-123',
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  };
}

// Create test issue data
export function createTestIssueData(overrides?: Partial<IssueData>): IssueData {
  return {
    projectId: overrides?.projectId || 'project-123',
    title: overrides?.title || 'Test Issue',
    description: overrides?.description || 'A test issue',
    status: overrides?.status || 'OPEN',
    createdById: overrides?.createdById || 'user-123',
  };
}
