import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  closeReason: string | null;
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
  closeReason?: string | null;
  createdById: string;
  assigneeId?: string | null;
}

export function createIssue(db: Database.Database, data: IssueData): Issue {
  const now = new Date().toISOString();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO issues (id, project_id, title, description, status, close_reason, created_by_id, assignee_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.projectId, data.title, data.description, data.status, data.closeReason ?? null, data.createdById, data.assigneeId ?? null, now, now);

  return {
    id,
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    status: data.status,
    closeReason: data.closeReason ?? null,
    createdById: data.createdById,
    assigneeId: data.assigneeId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function findIssuesByProjectId(db: Database.Database, projectId: string): Issue[] {
  const stmt = db.prepare(`
    SELECT id, project_id as projectId, title, description, status, close_reason as closeReason, created_by_id as createdById, assignee_id as assigneeId, created_at as createdAt, updated_at as updatedAt
    FROM issues
    WHERE project_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(projectId) as Issue[];
}

export function findIssueById(db: Database.Database, issueId: string): Issue | null {
  const stmt = db.prepare(`
    SELECT id, project_id as projectId, title, description, status, close_reason as closeReason, created_by_id as createdById, assignee_id as assigneeId, created_at as createdAt, updated_at as updatedAt
    FROM issues
    WHERE id = ?
  `);

  const row = stmt.get(issueId) as Issue | undefined;
  return row || null;
}

export function updateIssue(
  db: Database.Database,
  issueId: string,
  updates: Partial<Pick<IssueData, 'status' | 'closeReason' | 'assigneeId'>>
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

  if (updates.closeReason !== undefined) {
    fields.push('close_reason = ?');
    values.push(updates.closeReason);
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

export interface IssueFilters {
  projectId?: string;
  projectIds?: string[];
  status?: string;
  closeReason?: string;
  assigneeId?: string;
}

export function countIssuesWithFilters(
  db: Database.Database,
  filters: IssueFilters
): number {
  const conditions: string[] = [];
  const values: string[] = [];

  if (filters.projectId) {
    conditions.push('project_id = ?');
    values.push(filters.projectId);
  } else if (filters.projectIds && filters.projectIds.length > 0) {
    // Use IN clause for multiple project IDs (permission filtering)
    const placeholders = filters.projectIds.map(() => '?').join(',');
    conditions.push(`project_id IN (${placeholders})`);
    values.push(...filters.projectIds);
  }

  if (filters.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  if (filters.closeReason) {
    conditions.push('close_reason = ?');
    values.push(filters.closeReason);
  }

  if (filters.assigneeId) {
    conditions.push('assignee_id = ?');
    values.push(filters.assigneeId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const stmt = db.prepare(`SELECT COUNT(*) as count FROM issues ${whereClause}`);
  const result = stmt.get(...values) as { count: number };
  return result.count;
}

export function findIssuesWithFilters(
  db: Database.Database,
  filters: IssueFilters,
  pagination: { offset: number; limit: number },
  sorting: { sortBy: string; order: string }
): Issue[] {
  const conditions: string[] = [];
  const values: string[] = [];

  if (filters.projectId) {
    conditions.push('project_id = ?');
    values.push(filters.projectId);
  } else if (filters.projectIds && filters.projectIds.length > 0) {
    // Use IN clause for multiple project IDs (permission filtering)
    const placeholders = filters.projectIds.map(() => '?').join(',');
    conditions.push(`project_id IN (${placeholders})`);
    values.push(...filters.projectIds);
  }

  if (filters.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  if (filters.closeReason) {
    conditions.push('close_reason = ?');
    values.push(filters.closeReason);
  }

  if (filters.assigneeId) {
    conditions.push('assignee_id = ?');
    values.push(filters.assigneeId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Map sortBy to actual column names
  const sortColumnMap: Record<string, string> = {
    createdAt: 'created_at',
  };

  const sortColumn = sortColumnMap[sorting.sortBy] || sorting.sortBy;
  const orderClause = sorting.order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const stmt = db.prepare(`
    SELECT id, project_id as projectId, title, description, status, close_reason as closeReason,
           created_by_id as createdById, assignee_id as assigneeId,
           created_at as createdAt, updated_at as updatedAt
    FROM issues
    ${whereClause}
    ORDER BY ${sortColumn} ${orderClause}
    LIMIT ? OFFSET ?
  `);

  return stmt.all(...values, pagination.limit, pagination.offset) as Issue[];
}

export interface CloseReasonStats {
  closeReason: 'COMPLETED' | 'NOT_PLANNED' | 'DUPLICATE';
  count: number;
}

export interface CloseReasonStatsResult {
  items: CloseReasonStats[];
  total: number;
}

export function getCloseReasonStats(
  db: Database.Database,
  filters: { projectId?: string; projectIds?: string[] }
): CloseReasonStatsResult {
  const conditions: string[] = ['status = ?']; // Only count CLOSED issues
  const values: string[] = ['CLOSED'];

  if (filters.projectId) {
    conditions.push('project_id = ?');
    values.push(filters.projectId);
  } else if (filters.projectIds && filters.projectIds.length > 0) {
    // Use IN clause for multiple project IDs (permission filtering)
    const placeholders = filters.projectIds.map(() => '?').join(',');
    conditions.push(`project_id IN (${placeholders})`);
    values.push(...filters.projectIds);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get close reason statistics
  const stmt = db.prepare(`
    SELECT close_reason as closeReason, COUNT(*) as count
    FROM issues
    ${whereClause}
    GROUP BY close_reason
    ORDER BY count DESC
  `);

  const items = stmt.all(...values) as CloseReasonStats[];

  // Calculate total count
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return {
    items,
    total,
  };
}
