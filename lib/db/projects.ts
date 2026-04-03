import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  ownerId: string;
  name: string;
  key: string;
  description: string | null;
}

export function createProject(db: Database.Database, data: ProjectData): Project {
  const now = new Date().toISOString();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO projects (id, owner_id, name, key, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.ownerId, data.name, data.key, data.description, now, now);

  return {
    id,
    ownerId: data.ownerId,
    name: data.name,
    key: data.key,
    description: data.description,
    createdAt: now,
    updatedAt: now,
  };
}

export function findProjectById(db: Database.Database, id: string): Project | null {
  const stmt = db.prepare(`
    SELECT id, owner_id as ownerId, name, key, description, created_at as createdAt, updated_at as updatedAt
    FROM projects
    WHERE id = ?
  `);

  const row = stmt.get(id) as Project | undefined;
  return row || null;
}

export function findProjectsByOwnerId(db: Database.Database, ownerId: string): Project[] {
  const stmt = db.prepare(`
    SELECT id, owner_id as ownerId, name, key, description, created_at as createdAt, updated_at as updatedAt
    FROM projects
    WHERE owner_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(ownerId) as Project[];
}

export function findProjectByOwnerAndKey(
  db: Database.Database,
  ownerId: string,
  key: string
): Project | null {
  const stmt = db.prepare(`
    SELECT id, owner_id as ownerId, name, key, description, created_at as createdAt, updated_at as updatedAt
    FROM projects
    WHERE owner_id = ? AND key = ?
  `);

  const row = stmt.get(ownerId, key) as Project | undefined;
  return row || null;
}
