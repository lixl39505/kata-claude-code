import { getDb } from '@/lib/db';
import {
  findAuditLogsByIssueIdPaginated,
  countAuditLogsByIssueId,
} from '@/lib/db/issue-audit-logs';
import { findIssueById } from '@/lib/db/issues';
import { requireProjectMember } from './project-members';
import { NotFoundError } from '@/lib/errors/helpers';

/**
 * Get audit logs for a specific issue with pagination.
 * Project members (both owner and member) can retrieve audit logs for their project's issues.
 *
 * @param projectId - The ID of the project
 * @param issueId - The ID of the issue
 * @param limit - Maximum number of records to return (default: 20)
 * @param offset - Number of records to skip (default: 0)
 * @returns Object containing audit log items and total count
 * @throws UnauthenticatedError if user is not authenticated
 * @throws ForbiddenError if user is not a project member
 * @throws NotFoundError if project doesn't exist
 * @throws NotFoundError if issue doesn't exist or doesn't belong to the project
 */
export async function getAuditLogsForIssue(
  projectId: string,
  issueId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  items: Array<{
    id: string;
    action: string;
    actorId: string;
    createdAt: string;
  }>;
  total: number;
}> {
  const db = getDb();

  // Verify project exists and user is a member
  await requireProjectMember(projectId);

  // Verify issue exists and belongs to the specified project
  const issue = findIssueById(db, issueId);
  if (!issue || issue.projectId !== projectId) {
    throw new NotFoundError('Issue');
  }

  // Get total count
  const total = countAuditLogsByIssueId(db, issueId);

  // Get audit logs for the issue with pagination
  const auditLogs = findAuditLogsByIssueIdPaginated(db, issueId, limit, offset);

  // Transform to simplified output format
  const items = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    actorId: log.actorId,
    createdAt: log.createdAt,
  }));

  return { items, total };
}
