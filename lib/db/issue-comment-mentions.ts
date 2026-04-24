import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface CommentMention {
  id: string;
  commentId: string;
  issueId: string;
  projectId: string;
  mentionedUserId: string;
  createdAt: string;
}

export interface CommentMentionData {
  commentId: string;
  issueId: string;
  projectId: string;
  mentionedUserId: string;
}

export interface CommentMentionWithDetails extends CommentMention {
  displayName: string;
  email: string;
}

/**
 * Create multiple comment mentions in a batch.
 *
 * @param db - The database instance
 * @param mentions - Array of mention data to create
 * @returns Array of created mentions
 */
export function createCommentMentions(
  db: Database.Database,
  mentions: CommentMentionData[]
): CommentMention[] {
  if (mentions.length === 0) {
    return [];
  }

  const stmt = db.prepare(`
    INSERT INTO issue_comment_mentions (id, comment_id, issue_id, project_id, mentioned_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const created: CommentMention[] = [];
  const now = new Date().toISOString();

  for (const mention of mentions) {
    const id = randomUUID();
    stmt.run(id, mention.commentId, mention.issueId, mention.projectId, mention.mentionedUserId, now);

    created.push({
      id,
      commentId: mention.commentId,
      issueId: mention.issueId,
      projectId: mention.projectId,
      mentionedUserId: mention.mentionedUserId,
      createdAt: now,
    });
  }

  return created;
}

/**
 * Find all mentions for a specific comment with user details.
 *
 * @param db - The database instance
 * @param commentId - The ID of the comment
 * @returns Array of mentions with user details
 */
export function findMentionsByCommentId(
  db: Database.Database,
  commentId: string
): CommentMentionWithDetails[] {
  const stmt = db.prepare(`
    SELECT
      icm.id,
      icm.comment_id as commentId,
      icm.issue_id as issueId,
      icm.project_id as projectId,
      icm.mentioned_user_id as mentionedUserId,
      icm.created_at as createdAt,
      u.name as displayName,
      u.email
    FROM issue_comment_mentions icm
    JOIN users u ON icm.mentioned_user_id = u.id
    WHERE icm.comment_id = ?
    ORDER BY icm.created_at ASC
  `);

  return stmt.all(commentId) as CommentMentionWithDetails[];
}

/**
 * Find all mentions for all comments in an issue.
 *
 * @param db - The database instance
 * @param issueId - The ID of the issue
 * @returns Array of mentions with user details
 */
export function findMentionsByIssueId(
  db: Database.Database,
  issueId: string
): CommentMentionWithDetails[] {
  const stmt = db.prepare(`
    SELECT
      icm.id,
      icm.comment_id as commentId,
      icm.issue_id as issueId,
      icm.project_id as projectId,
      icm.mentioned_user_id as mentionedUserId,
      icm.created_at as createdAt,
      u.name as displayName,
      u.email
    FROM issue_comment_mentions icm
    JOIN users u ON icm.mentioned_user_id = u.id
    WHERE icm.issue_id = ?
    ORDER BY icm.created_at ASC
  `);

  return stmt.all(issueId) as CommentMentionWithDetails[];
}

/**
 * Delete all mentions for a specific comment.
 * This is typically handled by cascade delete, but provided for manual cleanup if needed.
 *
 * @param db - The database instance
 * @param commentId - The ID of the comment
 * @returns Number of deleted mentions
 */
export function deleteMentionsByCommentId(
  db: Database.Database,
  commentId: string
): number {
  const stmt = db.prepare(`
    DELETE FROM issue_comment_mentions
    WHERE comment_id = ?
  `);

  const result = stmt.run(commentId);
  return result.changes;
}
