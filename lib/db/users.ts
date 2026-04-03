import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  email: string;
  passwordHash: string;
  name: string;
}

export function createUser(db: Database.Database, data: UserData): User {
  const now = new Date().toISOString();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.email, data.passwordHash, data.name, now, now);

  return {
    id,
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    createdAt: now,
    updatedAt: now,
  };
}

export function findUserByEmail(db: Database.Database, email: string): User | null {
  const stmt = db.prepare(`
    SELECT id, email, password_hash as passwordHash, name, created_at as createdAt, updated_at as updatedAt
    FROM users
    WHERE email = ?
  `);

  const row = stmt.get(email) as User | undefined;
  return row || null;
}

export function findUserById(db: Database.Database, id: string): User | null {
  const stmt = db.prepare(`
    SELECT id, email, password_hash as passwordHash, name, created_at as createdAt, updated_at as updatedAt
    FROM users
    WHERE id = ?
  `);

  const row = stmt.get(id) as User | undefined;
  return row || null;
}

export function updateUser(
  db: Database.Database,
  id: string,
  updates: Partial<Omit<UserData, 'email'>>
): User | null {
  const current = findUserById(db, id);
  if (!current) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.passwordHash !== undefined) {
    fields.push('password_hash = ?');
    values.push(updates.passwordHash);
  }
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (fields.length === 0) return current;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  return findUserById(db, id);
}
