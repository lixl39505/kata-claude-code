import { getDb } from '@/lib/db';
import { createComment, findCommentsByIssueId, findCommentById, deleteComment as deleteCommentDb } from '@/lib/db/issue-comments';
import {
  createCommentMentions,
  findMentionsByCommentId,
} from '@/lib/db/issue-comment-mentions';
import { findProjectById } from '@/lib/db/projects';
import { findIssueById } from '@/lib/db/issues';
import { createIssueAuditLog } from '@/lib/db/issue-audit-logs';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import { parseMentions } from './comment-mention-parser';
import { validateAndResolveMentions } from './comment-mention-validator';
import { executeInTransactionAsync } from '@/lib/db/transaction';
import { createMentionNotifications } from './notification';
import { isProjectOwner } from './project-members';
import type { CreateCommentInput } from '@/lib/validators/issue-comment';

export interface IssueComment {
  id: string;
  issueId: string;
  projectId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface CommentMention {
  userId: string;
  displayName: string;
}

export interface CommentWithMentions extends IssueComment {
  mentions: CommentMention[];
}

/**
 * Create a new comment on an issue with @ mentions support.
 *
 * This function:
 * 1. Parses @ mentions from the comment content
 * 2. Validates that mentioned users are project members
 * 3. Creates the comment and its mentions in a single transaction
 * 4. Returns the comment with resolved mention details
 *
 * @param projectId - The ID of the project
 * @param issueId - The ID of the issue
 * @param data - The comment data
 * @returns The created comment with mentions
 * @throws {UnauthenticatedError} If user is not authenticated
 * @throws {NotFoundError} If project or issue is not found or user doesn't own the project
 * @throws {ValidationError} If mentioned users are not project members
 */
export async function createCommentInIssue(
  projectId: string,
  issueId: string,
  data: CreateCommentInput
): Promise<CommentWithMentions> {
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

  // Parse mentions from content
  const mentionIdentifiers = parseMentions(data.content);

  // Validate mentions and resolve to user IDs
  let mentionedUsers: Array<{ userId: string; displayName: string }> = [];
  if (mentionIdentifiers.length > 0) {
    mentionedUsers = validateAndResolveMentions(db, projectId, mentionIdentifiers);
  }

  // Create comment and mentions in a transaction
  const result = await executeInTransactionAsync(db, (transactionDb) => {
    // Create comment
    const comment = createComment(transactionDb, {
      issueId,
      projectId,
      authorId: user.id,
      content: data.content,
    });

    // Create mentions if any
    if (mentionedUsers.length > 0) {
      const mentionData = mentionedUsers.map((user) => ({
        commentId: comment.id,
        issueId,
        projectId,
        mentionedUserId: user.userId,
      }));

      createCommentMentions(transactionDb, mentionData);

      // Create notifications for mentioned users (pass transaction db for consistency)
      const mentionedUserIds = mentionedUsers.map((u) => u.userId);
      createMentionNotifications(mentionedUserIds, issueId, comment.id, projectId, transactionDb);
    }

    return comment;
  });

  // Return comment with mentions
  return {
    ...result,
    mentions: mentionedUsers,
  };
}

/**
 * List all comments for an issue with @ mentions.
 *
 * @param projectId - The ID of the project
 * @param issueId - The ID of the issue
 * @returns Array of comments with mentions for the issue
 * @throws {UnauthenticatedError} If user is not authenticated
 * @throws {NotFoundError} If project or issue is not found or user doesn't own the project
 */
export async function listCommentsForIssue(
  projectId: string,
  issueId: string
): Promise<CommentWithMentions[]> {
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
  const comments = findCommentsByIssueId(db, issueId);

  // Load mentions for each comment
  const commentsWithMentions: CommentWithMentions[] = comments.map((comment) => {
    const mentions = findMentionsByCommentId(db, comment.id);

    return {
      ...comment,
      mentions: mentions.map((m) => ({
        userId: m.mentionedUserId,
        displayName: m.displayName,
      })),
    };
  });

  return commentsWithMentions;
}

/**
 * Delete a comment from an issue.
 *
 * This function:
 * 1. Verifies the user has permission to delete the comment (author or project owner)
 * 2. Deletes the comment in a transaction (mentions are cascade deleted)
 * 3. Writes an audit log
 *
 * @param projectId - The ID of the project
 * @param issueId - The ID of the issue
 * @param commentId - The ID of the comment to delete
 * @returns Success indicator
 * @throws {UnauthenticatedError} If user is not authenticated
 * @throws {NotFoundError} If project, issue, or comment is not found
 * @throws {ForbiddenError} If user doesn't have permission to delete the comment
 */
export async function deleteCommentFromIssue(
  projectId: string,
  issueId: string,
  commentId: string
): Promise<{ success: true }> {
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

  // Verify comment exists and belongs to issue
  const comment = findCommentById(db, commentId);
  if (!comment || comment.issueId !== issueId) {
    throw new NotFoundError('Comment');
  }

  // Check if user is the comment author or a project owner
  const isOwner = isProjectOwner(projectId, user.id);
  if (comment.authorId !== user.id && !isOwner) {
    throw new ForbiddenError('You do not have permission to delete this comment');
  }

  // Use transaction to ensure atomicity of comment deletion and audit logging
  executeInTransactionAsync(db, (txnDb) => {
    // Delete comment (mentions will be cascade deleted)
    const deleted = deleteCommentDb(txnDb, commentId);
    if (!deleted) {
      throw new Error('Failed to delete comment');
    }

    // Write audit log for comment deletion
    createIssueAuditLog(txnDb, {
      issueId: issueId,
      projectId: projectId,
      actorId: user.id,
      action: 'ISSUE_COMMENT_DELETED',
    });
  });

  return { success: true };
}
