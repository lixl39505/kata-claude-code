import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface IssueAuditLog {
  id: string;
  issueId: string;
  projectId: string;
  actorId: string;
  action: 'ISSUE_CREATED' | 'ISSUE_STATUS_CHANGED';
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
}

export interface IssueAuditLogData {
  issueId: string;
  projectId: string;
  actorId: string;
  action: 'ISSUE_CREATED' | 'ISSUE_STATUS_CHANGED';
  fromStatus: string | null;
  toStatus: string | null;
}

/**
 * Create a new audit log entry for an Issue operation.
 *
 * @param db - The database instance
 * @param data - The audit log data
 * @returns The created audit log entry
 */
export function createIssueAuditLog(
  db: Database.Database,
  data: IssueAuditLogData
): IssueAuditLog {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO issue_audit_logs (id, issue_id, project_id, actor_id, action, from_status, to_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.issueId, data.projectId, data.actorId, data.action, data.fromStatus, data.toStatus, createdAt);

  return {
    id,
    issueId: data.issueId,
    projectId: data.projectId,
    actorId: data.actorId,
    action: data.action,
    fromStatus: data.fromStatus,
    toStatus: data.toStatus,
    createdAt,
  };
}

/**
 * Find all audit logs for a specific issue, ordered by creation time ascending.
 *
 * @param db - The database instance
 * @param issueId - The ID of the issue
 * @returns Array of audit logs for the issue
 */
export function findAuditLogsByIssueId(
  db: Database.Database,
  issueId: string
): IssueAuditLog[] {
  const stmt = db.prepare(`
    SELECT id, issue_id as issueId, project_id as projectId, actor_id as actorId,
           action, from_status as fromStatus, to_status as toStatus, created_at as createdAt
    FROM issue_audit_logs
    WHERE issue_id = ?
    ORDER BY created_at ASC
  `);

  return stmt.all(issueId) as IssueAuditLog[];
}

/**
 * Find all audit logs for a specific project, ordered by creation time descending.
 *
 * @param db - The database instance
 * @param projectId - The ID of the project
 * @returns Array of audit logs for the project
 */
export function findAuditLogsByProjectId(
  db: Database.Database,
  projectId: string
): IssueAuditLog[] {
  const stmt = db.prepare(`
    SELECT id, issue_id as issueId, project_id as projectId, actor_id as actorId,
           action, from_status as fromStatus, to_status as toStatus, created_at as createdAt
    FROM issue_audit_logs
    WHERE project_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(projectId) as IssueAuditLog[];
}
