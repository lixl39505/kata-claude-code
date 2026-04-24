import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export type NotificationType = 'MENTION' | 'ASSIGNEE_CHANGED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  issueId: string;
  commentId: string | null;
  projectId: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationData {
  userId: string;
  type: NotificationType;
  issueId: string;
  commentId?: string;
  projectId: string;
}

export interface NotificationWithDetails extends Notification {
  issueTitle: string;
  projectKey: string;
  projectName: string;
  commentContent?: string;
  authorDisplayName?: string;
}

// Internal type for raw database results (with isRead as number)
interface RawNotification {
  id: string;
  userId: string;
  type: NotificationType;
  issueId: string;
  commentId: string | null;
  projectId: string;
  isRead: number;
  createdAt: string;
}

interface RawNotificationWithDetails extends RawNotification {
  issueTitle: string;
  projectKey: string;
  projectName: string;
  commentContent?: string;
  authorDisplayName?: string;
}

export interface NotificationListFilters {
  userId: string;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Create a new notification.
 *
 * @param db - The database instance
 * @param data - The notification data
 * @returns The created notification
 */
export function createNotification(
  db: Database.Database,
  data: NotificationData
): Notification {
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO notifications (id, user_id, type, issue_id, comment_id, project_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `);

  stmt.run(
    id,
    data.userId,
    data.type,
    data.issueId,
    data.commentId || null,
    data.projectId,
    now
  );

  return {
    id,
    userId: data.userId,
    type: data.type,
    issueId: data.issueId,
    commentId: data.commentId || null,
    projectId: data.projectId,
    isRead: false, // Always false for new notifications
    createdAt: now,
  };
}

/**
 * Create multiple notifications in a batch.
 *
 * @param db - The database instance
 * @param notifications - Array of notification data to create
 * @returns Array of created notifications
 */
export function createNotifications(
  db: Database.Database,
  notifications: NotificationData[]
): Notification[] {
  if (notifications.length === 0) {
    return [];
  }

  return notifications.map((data) => createNotification(db, data));
}

/**
 * Find notifications for a user with filters and pagination.
 *
 * @param db - The database instance
 * @param filters - The filters and pagination parameters
 * @returns Array of notifications with details
 */
export function findNotificationsWithFilters(
  db: Database.Database,
  filters: NotificationListFilters
): NotificationWithDetails[] {
  const { userId, isRead, limit = 20, offset = 0 } = filters;

  // Build WHERE clause
  const whereConditions: string[] = ['n.user_id = ?'];
  const params: (string | number | boolean)[] = [userId];

  if (isRead !== undefined) {
    whereConditions.push('n.is_read = ?');
    params.push(isRead ? 1 : 0);
  }

  const whereClause = whereConditions.join(' AND ');

  const stmt = db.prepare(`
    SELECT
      n.id,
      n.user_id as userId,
      n.type,
      n.issue_id as issueId,
      n.comment_id as commentId,
      n.project_id as projectId,
      n.is_read as isRead,
      n.created_at as createdAt,
      i.title as issueTitle,
      p.key as projectKey,
      p.name as projectName,
      ic.content as commentContent,
      u.name as authorDisplayName
    FROM notifications n
    JOIN issues i ON n.issue_id = i.id
    JOIN projects p ON n.project_id = p.id
    LEFT JOIN issue_comments ic ON n.comment_id = ic.id
    LEFT JOIN users u ON ic.author_id = u.id
    WHERE ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `);

  const results = stmt.all(...params, limit, offset) as RawNotificationWithDetails[];

  // Convert SQLite INTEGER (0/1) to JavaScript boolean
  return results.map((result): NotificationWithDetails => ({
    ...result,
    isRead: result.isRead === 1,
  }));
}

/**
 * Count notifications for a user with filters.
 *
 * @param db - The database instance
 * @param filters - The filters
 * @returns The count of notifications matching the filters
 */
export function countNotificationsWithFilters(
  db: Database.Database,
  filters: Omit<NotificationListFilters, 'limit' | 'offset'>
): number {
  const { userId, isRead } = filters;

  // Build WHERE clause
  const whereConditions: string[] = ['user_id = ?'];
  const params: (string | number | boolean)[] = [userId];

  if (isRead !== undefined) {
    whereConditions.push('is_read = ?');
    params.push(isRead ? 1 : 0);
  }

  const whereClause = whereConditions.join(' AND ');

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE ${whereClause}
  `);

  const result = stmt.get(...params) as { count: number };
  return result.count;
}

/**
 * Find a notification by ID.
 *
 * @param db - The database instance
 * @param notificationId - The ID of the notification
 * @returns The notification or null if not found
 */
export function findNotificationById(
  db: Database.Database,
  notificationId: string
): Notification | null {
  const stmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      type,
      issue_id as issueId,
      comment_id as commentId,
      project_id as projectId,
      is_read as isRead,
      created_at as createdAt
    FROM notifications
    WHERE id = ?
  `);

  const result = stmt.get(notificationId) as RawNotification | null;

  if (!result) {
    return null;
  }

  // Convert SQLite INTEGER (0/1) to JavaScript boolean
  return {
    ...result,
    isRead: result.isRead === 1,
  };
}

/**
 * Mark a notification as read.
 *
 * @param db - The database instance
 * @param notificationId - The ID of the notification
 * @returns The updated notification or null if not found
 */
export function markNotificationAsRead(
  db: Database.Database,
  notificationId: string
): Notification | null {
  const stmt = db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE id = ?
  `);

  const result = stmt.run(notificationId);
  if (result.changes === 0) {
    return null;
  }

  return findNotificationById(db, notificationId);
}

/**
 * Mark all notifications for a user as read.
 *
 * @param db - The database instance
 * @param userId - The ID of the user
 * @returns The number of notifications marked as read
 */
export function markAllNotificationsAsRead(
  db: Database.Database,
  userId: string
): number {
  const stmt = db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ? AND is_read = 0
  `);

  const result = stmt.run(userId);
  return result.changes;
}

/**
 * Delete all notifications for a specific issue.
 * This is typically handled by cascade delete, but provided for manual cleanup if needed.
 *
 * @param db - The database instance
 * @param issueId - The ID of the issue
 * @returns Number of deleted notifications
 */
export function deleteNotificationsByIssueId(
  db: Database.Database,
  issueId: string
): number {
  const stmt = db.prepare(`
    DELETE FROM notifications
    WHERE issue_id = ?
  `);

  const result = stmt.run(issueId);
  return result.changes;
}

/**
 * Delete all notifications for a specific comment.
 * This is typically handled by cascade delete, but provided for manual cleanup if needed.
 *
 * @param db - The database instance
 * @param commentId - The ID of the comment
 * @returns Number of deleted notifications
 */
export function deleteNotificationsByCommentId(
  db: Database.Database,
  commentId: string
): number {
  const stmt = db.prepare(`
    DELETE FROM notifications
    WHERE comment_id = ?
  `);

  const result = stmt.run(commentId);
  return result.changes;
}

/**
 * Delete all notifications for a specific user.
 * This is typically handled by cascade delete when user is deleted.
 *
 * @param db - The database instance
 * @param userId - The ID of the user
 * @returns Number of deleted notifications
 */
export function deleteNotificationsByUserId(
  db: Database.Database,
  userId: string
): number {
  const stmt = db.prepare(`
    DELETE FROM notifications
    WHERE user_id = ?
  `);

  const result = stmt.run(userId);
  return result.changes;
}

/**
 * Mark multiple notifications as read by their IDs.
 * Only marks notifications that belong to the specified user.
 *
 * @param db - The database instance
 * @param userId - The ID of the user (for security isolation)
 * @param notificationIds - Array of notification IDs to mark as read
 * @returns The number of notifications marked as read
 */
export function markNotificationsAsReadByIds(
  db: Database.Database,
  userId: string,
  notificationIds: string[]
): number {
  if (notificationIds.length === 0) {
    return 0;
  }

  // Build placeholders for IN clause
  const placeholders = notificationIds.map(() => '?').join(',');
  const params = [userId, ...notificationIds];

  const stmt = db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ? AND id IN (${placeholders}) AND is_read = 0
  `);

  const result = stmt.run(...params);
  return result.changes;
}
