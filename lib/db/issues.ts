import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  createdById: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueData {
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  createdById: string;
  assigneeId?: string | null;
}

export function createIssue(db: Database.Database, data: IssueData): Issue {
  const now = new Date().toISOString();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO issues (id, project_id, title, description, status, created_by_id, assignee_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.projectId, data.title, data.description, data.status, data.createdById, data.assigneeId ?? null, now, now);

  return {
    id,
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    status: data.status,
    createdById: data.createdById,
    assigneeId: data.assigneeId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function findIssuesByProjectId(db: Database.Database, projectId: string): Issue[] {
  const stmt = db.prepare(`
    SELECT id, project_id as projectId, title, description, status, created_by_id as createdById, assignee_id as assigneeId, created_at as createdAt, updated_at as updatedAt
    FROM issues
    WHERE project_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(projectId) as Issue[];
}

export function findIssueById(db: Database.Database, issueId: string): Issue | null {
  const stmt = db.prepare(`
    SELECT id, project_id as projectId, title, description, status, created_by_id as createdById, assignee_id as assigneeId, created_at as createdAt, updated_at as updatedAt
    FROM issues
    WHERE id = ?
  `);

  const row = stmt.get(issueId) as Issue | undefined;
  return row || null;
}

export function updateIssue(
  db: Database.Database,
  issueId: string,
  updates: Partial<Pick<IssueData, 'status' | 'assigneeId'>>
): Issue | null {
  const current = findIssueById(db, issueId);
  if (!current) return null;

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (updates.assigneeId !== undefined) {
    fields.push('assignee_id = ?');
    values.push(updates.assigneeId);
  }

  if (fields.length === 0) return current;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(issueId);

  const stmt = db.prepare(`
    UPDATE issues
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  return findIssueById(db, issueId);
}
