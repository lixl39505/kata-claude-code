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
