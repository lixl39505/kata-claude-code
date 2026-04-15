import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberData {
  projectId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
}

export interface ProjectMemberWithDetails extends ProjectMember {
  displayName: string;
  email: string;
}

/**
 * Add a member to a project
 */
export function addProjectMember(db: Database.Database, data: ProjectMemberData): ProjectMember {
  const now = new Date().toISOString();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO project_members (id, project_id, user_id, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.projectId, data.userId, data.role, now, now);

  return {
    id,
    projectId: data.projectId,
    userId: data.userId,
    role: data.role,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Remove a member from a project
 */
export function removeProjectMember(db: Database.Database, projectId: string, userId: string): boolean {
  const stmt = db.prepare(`
    DELETE FROM project_members
    WHERE project_id = ? AND user_id = ?
  `);

  const result = stmt.run(projectId, userId);
  return result.changes > 0;
}

/**
 * Find a specific project member by project and user ID
 */
export function findProjectMember(db: Database.Database, projectId: string, userId: string): ProjectMember | null {
  const stmt = db.prepare(`
    SELECT id, project_id as projectId, user_id as userId, role, created_at as createdAt, updated_at as updatedAt
    FROM project_members
    WHERE project_id = ? AND user_id = ?
  `);

  const row = stmt.get(projectId, userId) as ProjectMember | undefined;
  return row || null;
}

/**
 * Get all members of a project with user details
 */
export function findProjectMembersWithDetails(db: Database.Database, projectId: string): ProjectMemberWithDetails[] {
  const stmt = db.prepare(`
    SELECT
      pm.id,
      pm.project_id as projectId,
      pm.user_id as userId,
      pm.role,
      pm.created_at as createdAt,
      pm.updated_at as updatedAt,
      u.name as displayName,
      u.email
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY pm.created_at ASC
  `);

  return stmt.all(projectId) as ProjectMemberWithDetails[];
}

/**
 * Count the number of owners for a project
 */
export function countProjectOwners(db: Database.Database, projectId: string): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM project_members
    WHERE project_id = ? AND role = 'OWNER'
  `);

  const result = stmt.get(projectId) as { count: number };
  return result.count;
}

/**
 * Check if a user is a member of a project
 */
export function isProjectMember(db: Database.Database, projectId: string, userId: string): boolean {
  const member = findProjectMember(db, projectId, userId);
  return member !== null;
}

/**
 * Check if a user is an owner of a project
 */
export function isProjectOwner(db: Database.Database, projectId: string, userId: string): boolean {
  const member = findProjectMember(db, projectId, userId);
  return member !== null && member.role === 'OWNER';
}

/**
 * Find all unclosed issues assigned to a user in a project
 */
export function findUnclosedIssuesByAssigneeInProject(
  db: Database.Database,
  projectId: string,
  assigneeId: string
): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM issues
    WHERE project_id = ? AND assignee_id = ? AND status != 'CLOSED'
  `);

  const result = stmt.get(projectId, assigneeId) as { count: number };
  return result.count;
}

/**
 * Get all project IDs for a user
 */
export function findProjectIdsByUserId(db: Database.Database, userId: string): string[] {
  const stmt = db.prepare(`
    SELECT project_id as projectId
    FROM project_members
    WHERE user_id = ?
  `);

  const rows = stmt.all(userId) as { projectId: string }[];
  return rows.map(row => row.projectId);
}
