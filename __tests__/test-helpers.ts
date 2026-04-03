import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { User, UserData } from '@/lib/db/users';

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
