import { getDb } from '@/lib/db';
import { findAuditLogsByIssueId } from '@/lib/db/issue-audit-logs';
import { findProjectById } from '@/lib/db/projects';
import { findIssueById } from '@/lib/db/issues';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError } from '@/lib/errors/helpers';
import type { IssueAuditLog } from '@/lib/db/issue-audit-logs';

/**
 * Get all audit logs for a specific issue.
 * Only the project owner can retrieve audit logs for their project's issues.
 *
 * @param projectId - The ID of the project
 * @param issueId - The ID of the issue
 * @returns Array of audit logs for the issue, ordered by creation time ascending
 * @throws UnauthenticatedError if user is not authenticated
 * @throws NotFoundError if project doesn't exist or user doesn't own it
 * @throws NotFoundError if issue doesn't exist or doesn't belong to the project
 */
export async function getAuditLogsForIssue(
  projectId: string,
  issueId: string
): Promise<IssueAuditLog[]> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Verify project exists and user owns it
  const project = findProjectById(db, projectId);
  if (!project || project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  // Verify issue exists and belongs to the specified project
  const issue = findIssueById(db, issueId);
  if (!issue || issue.projectId !== projectId) {
    throw new NotFoundError('Issue');
  }

  // Get audit logs for the issue
  return findAuditLogsByIssueId(db, issueId);
}
