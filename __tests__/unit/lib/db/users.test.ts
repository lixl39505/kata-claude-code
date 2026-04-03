import Database from 'better-sqlite3';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} from '@/lib/db/users';
import type { UserData } from '@/lib/db/users';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

function createTestUserData(overrides?: Partial<UserData>): UserData {
  return {
    email: overrides?.email || 'test@example.com',
    passwordHash: overrides?.passwordHash || 'test-hash',
    name: overrides?.name || 'Test User',
  };
}

describe('User Database Operations', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('createUser', () => {
    it('should create a new user', () => {
      const userData = createTestUserData({
        email: 'new@example.com',
        passwordHash: 'hash-123',
        name: 'New User',
      });

      const user = createUser(db, userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.passwordHash).toBe(userData.passwordHash);
      expect(user.name).toBe(userData.name);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should generate unique IDs for different users', () => {
      const userData1 = createTestUserData({ email: 'user1@example.com' });
      const userData2 = createTestUserData({ email: 'user2@example.com' });

      const user1 = createUser(db, userData1);
      const user2 = createUser(db, userData2);

      expect(user1.id).not.toBe(user2.id);
    });

    it('should set createdAt and updatedAt to current time', () => {
      const userData = createTestUserData({ email: 'test@example.com' });
      const user = createUser(db, userData);

      const createdDate = new Date(user.createdAt);
      const now = new Date();

      // Check within last minute
      expect(now.getTime() - createdDate.getTime()).toBeLessThan(60000);
      expect(user.updatedAt).toBe(user.createdAt);
    });
  });

  describe('findUserByEmail', () => {
    it('should find existing user by email', () => {
      const userData = createTestUserData({ email: 'find@example.com' });
      const created = createUser(db, userData);

      const found = findUserByEmail(db, 'find@example.com');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(userData.email);
    });

    it('should return null for non-existent email', () => {
      const found = findUserByEmail(db, 'nonexistent@example.com');

      expect(found).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find existing user by id', () => {
      const userData = createTestUserData({ email: 'findbyid@example.com' });
      const created = createUser(db, userData);

      const found = findUserById(db, created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(userData.email);
    });

    it('should return null for non-existent id', () => {
      const found = findUserById(db, 'non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user password', () => {
      const userData = createTestUserData({ email: 'update@example.com' });
      const user = createUser(db, userData);

      const updated = updateUser(db, user.id, {
        passwordHash: 'new-hash',
      });

      expect(updated).not.toBeNull();
      expect(updated?.passwordHash).toBe('new-hash');
      expect(updated?.name).toBe(userData.name);
    });

    it('should update user name', () => {
      const userData = createTestUserData({ email: 'update@example.com' });
      const user = createUser(db, userData);

      const updated = updateUser(db, user.id, {
        name: 'Updated Name',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.passwordHash).toBe(userData.passwordHash);
    });

    it('should update multiple fields', () => {
      const userData = createTestUserData({ email: 'update@example.com' });
      const user = createUser(db, userData);

      const updated = updateUser(db, user.id, {
        passwordHash: 'new-hash',
        name: 'Updated Name',
      });

      expect(updated).not.toBeNull();
      expect(updated?.passwordHash).toBe('new-hash');
      expect(updated?.name).toBe('Updated Name');
    });

    it('should not update if no fields provided', () => {
      const userData = createTestUserData({ email: 'update@example.com' });
      const user = createUser(db, userData);

      const updated = updateUser(db, user.id, {});

      expect(updated).not.toBeNull();
      expect(updated?.passwordHash).toBe(userData.passwordHash);
      expect(updated?.name).toBe(userData.name);
    });

    it('should update updatedAt timestamp', async () => {
      const userData = createTestUserData({ email: 'update@example.com' });
      const user = createUser(db, userData);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = updateUser(db, user.id, {
        name: 'Updated Name',
      });

      expect(updated).not.toBeNull();
      expect(updated?.updatedAt).not.toBe(user.updatedAt);
    });

    it('should return null for non-existent user', () => {
      const updated = updateUser(db, 'non-existent-id', {
        name: 'New Name',
      });

      expect(updated).toBeNull();
    });
  });
});
