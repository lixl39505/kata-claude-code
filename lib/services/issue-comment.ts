import { getDb } from '@/lib/db';
import { createComment, findCommentsByIssueId } from '@/lib/db/issue-comments';
import {
  createCommentMentions,
  findMentionsByCommentId,
} from '@/lib/db/issue-comment-mentions';
import { findProjectById } from '@/lib/db/projects';
import { findIssueById } from '@/lib/db/issues';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError } from '@/lib/errors/helpers';
import { parseMentions } from './comment-mention-parser';
import { validateAndResolveMentions } from './comment-mention-validator';
import { executeInTransactionAsync } from '@/lib/db/transaction';
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
