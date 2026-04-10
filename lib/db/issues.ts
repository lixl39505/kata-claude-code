import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

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

export function createIssue(db: Database.Database, data: IssueData): Issue {
  const now = new Date().toISOString();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO issues (id, project_id, title, description, status, created_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.projectId, data.title, data.description, data.status, data.createdById, now, now);

  return {
    id,
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    status: data.status,
    createdById: data.createdById,
    createdAt: now,
    updatedAt: now,
  };
}

export function findIssuesByProjectId(db: Database.Database, projectId: string): Issue[] {
  const stmt = db.prepare(`
    SELECT id, project_id as projectId, title, description, status, created_by_id as createdById, created_at as createdAt, updated_at as updatedAt
    FROM issues
    WHERE project_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(projectId) as Issue[];
}

export function findIssueById(db: Database.Database, issueId: string): Issue | null {
  const stmt = db.prepare(`
    SELECT id, project_id as projectId, title, description, status, created_by_id as createdById, created_at as createdAt, updated_at as updatedAt
    FROM issues
    WHERE id = ?
  `);

  const row = stmt.get(issueId) as Issue | undefined;
  return row || null;
}
