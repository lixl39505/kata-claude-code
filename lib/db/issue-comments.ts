import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface IssueComment {
  id: string;
  issueId: string;
  projectId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface IssueCommentData {
  issueId: string;
  projectId: string;
  authorId: string;
  content: string;
}

/**
 * Create a new comment for an issue.
 *
 * @param db - The database instance
 * @param data - The comment data
 * @returns The created comment
 */
export function createComment(
  db: Database.Database,
  data: IssueCommentData
): IssueComment {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO issue_comments (id, issue_id, project_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.issueId, data.projectId, data.authorId, data.content, createdAt);

  return {
    id,
    issueId: data.issueId,
    projectId: data.projectId,
    authorId: data.authorId,
    content: data.content,
    createdAt,
  };
}

/**
 * Find all comments for a specific issue, ordered by creation time ascending.
 *
 * @param db - The database instance
 * @param issueId - The ID of the issue
 * @returns Array of comments for the issue
 */
export function findCommentsByIssueId(
  db: Database.Database,
  issueId: string
): IssueComment[] {
  const stmt = db.prepare(`
    SELECT id, issue_id as issueId, project_id as projectId, author_id as authorId,
           content, created_at as createdAt
    FROM issue_comments
    WHERE issue_id = ?
    ORDER BY created_at ASC
  `);

  return stmt.all(issueId) as IssueComment[];
}

/**
 * Find a specific comment by ID.
 *
 * @param db - The database instance
 * @param commentId - The ID of the comment
 * @returns The comment or null if not found
 */
export function findCommentById(
  db: Database.Database,
  commentId: string
): IssueComment | null {
  const stmt = db.prepare(`
    SELECT id, issue_id as issueId, project_id as projectId, author_id as authorId,
           content, created_at as createdAt
    FROM issue_comments
    WHERE id = ?
  `);

  const row = stmt.get(commentId) as IssueComment | undefined;
  return row || null;
}

/**
 * Delete a comment by ID.
 *
 * @param db - The database instance
 * @param commentId - The ID of the comment to delete
 * @returns true if the comment was deleted, false if not found
 */
export function deleteComment(
  db: Database.Database,
  commentId: string
): boolean {
  const stmt = db.prepare(`
    DELETE FROM issue_comments
    WHERE id = ?
  `);

  const result = stmt.run(commentId);
  return result.changes > 0;
}
