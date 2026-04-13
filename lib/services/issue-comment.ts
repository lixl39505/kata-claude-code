import { getDb } from '@/lib/db';
import { createComment, findCommentsByIssueId } from '@/lib/db/issue-comments';
import { findProjectById } from '@/lib/db/projects';
import { findIssueById } from '@/lib/db/issues';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError } from '@/lib/errors/helpers';
import type { CreateCommentInput } from '@/lib/validators/issue-comment';

export interface IssueComment {
  id: string;
  issueId: string;
  projectId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

/**
 * Create a new comment on an issue.
 *
 * @param projectId - The ID of the project
 * @param issueId - The ID of the issue
 * @param data - The comment data
 * @returns The created comment
 * @throws {UnauthenticatedError} If user is not authenticated
 * @throws {NotFoundError} If project or issue is not found or user doesn't own the project
 */
export async function createCommentInIssue(
  projectId: string,
  issueId: string,
  data: CreateCommentInput
): Promise<IssueComment> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Verify project exists and user owns it
  const project = findProjectById(db, projectId);
  if (!project || project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  // Verify issue exists and belongs to project
  const issue = findIssueById(db, issueId);
  if (!issue || issue.projectId !== projectId) {
    throw new NotFoundError('Issue');
  }

  // Create comment
  return createComment(db, {
    issueId,
    projectId,
    authorId: user.id,
    content: data.content,
  });
}

/**
 * List all comments for an issue.
 *
 * @param projectId - The ID of the project
 * @param issueId - The ID of the issue
 * @returns Array of comments for the issue
 * @throws {UnauthenticatedError} If user is not authenticated
 * @throws {NotFoundError} If project or issue is not found or user doesn't own the project
 */
export async function listCommentsForIssue(
  projectId: string,
  issueId: string
): Promise<IssueComment[]> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Verify project exists and user owns it
  const project = findProjectById(db, projectId);
  if (!project || project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  // Verify issue exists and belongs to project
  const issue = findIssueById(db, issueId);
  if (!issue || issue.projectId !== projectId) {
    throw new NotFoundError('Issue');
  }

  // List comments
  return findCommentsByIssueId(db, issueId);
}
