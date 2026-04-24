import { getDb } from '@/lib/db';
import {
  findNotificationsWithFilters,
  countNotificationsWithFilters,
  findNotificationById,
  markNotificationAsRead as markNotificationAsReadDb,
  type NotificationType,
  type NotificationData,
} from '@/lib/db/notifications';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError, ForbiddenError } from '@/lib/errors/helpers';
import type { ListNotificationsInput } from '@/lib/validators/notification';

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

export interface NotificationWithDetails extends Notification {
  issueTitle: string;
  projectKey: string;
  projectName: string;
  commentContent?: string;
  authorDisplayName?: string;
}

export interface NotificationListResult {
  items: NotificationWithDetails[];
  total: number;
}

/**
 * List notifications for the current user with filters and pagination.
 *
 * @param filters - The filters and pagination parameters
 * @returns The notifications list with total count
 * @throws {UnauthenticatedError} If user is not authenticated
 */
export async function listNotifications(
  filters: ListNotificationsInput
): Promise<NotificationListResult> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Get notifications for current user only (security isolation)
  const items = findNotificationsWithFilters(db, {
    userId: user.id,
    isRead: filters.isRead,
    limit: filters.limit,
    offset: filters.offset,
  });

  // Get total count
  const total = countNotificationsWithFilters(db, {
    userId: user.id,
    isRead: filters.isRead,
  });

  return {
    items,
    total,
  };
}

/**
 * Mark a notification as read.
 *
 * @param notificationId - The ID of the notification
 * @returns The updated notification
 * @throws {UnauthenticatedError} If user is not authenticated
 * @throws {NotFoundError} If notification is not found
 * @throws {ForbiddenError} If notification does not belong to current user
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<Notification> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Find the notification
  const notification = findNotificationById(db, notificationId);
  if (!notification) {
    throw new NotFoundError('Notification');
  }

  // Verify the notification belongs to current user (security check)
  if (notification.userId !== user.id) {
    throw new ForbiddenError('You do not have access to this notification');
  }

  // Mark as read
  const updated = markNotificationAsReadDb(db, notificationId);
  if (!updated) {
    throw new NotFoundError('Notification');
  }

  return updated;
}

/**
 * Create notifications for mentioned users in a comment.
 * This function is called internally by the comment service.
 *
 * @param userIds - Array of user IDs to notify
 * @param issueId - The ID of the issue
 * @param commentId - The ID of the comment
 * @param projectId - The ID of the project
 * @returns Array of created notifications
 */
export function createMentionNotifications(
  userIds: string[],
  issueId: string,
  commentId: string,
  projectId: string
): Notification[] {
  const db = getDb();

  if (userIds.length === 0) {
    return [];
  }

  // Prepare notification data for each mentioned user
  const notificationData: NotificationData[] = userIds.map((userId) => ({
    userId,
    type: 'MENTION',
    issueId,
    commentId,
    projectId,
  }));

  // Create notifications in batch
  return createNotifications(db, notificationData);
}

/**
 * Create a notification for assignee change.
 * This function is called internally by the issue service.
 *
 * @param assigneeId - The ID of the new assignee
 * @param issueId - The ID of the issue
 * @param projectId - The ID of the project
 * @returns The created notification or null if assigneeId is null
 */
export function createAssigneeChangedNotification(
  assigneeId: string | null,
  issueId: string,
  projectId: string
): Notification | null {
  if (!assigneeId) {
    return null;
  }

  const db = getDb();

  const notificationData: NotificationData = {
    userId: assigneeId,
    type: 'ASSIGNEE_CHANGED',
    issueId,
    projectId,
  };

  const notifications = createNotifications(db, [notificationData]);
  return notifications[0] || null;
}

/**
 * Internal function to create notifications in batch.
 * This is a wrapper around the DB function for service-level usage.
 *
 * @param db - The database instance
 * @param notifications - Array of notification data to create
 * @returns Array of created notifications
 */
function createNotifications(
  db: Parameters<typeof import('@/lib/db/notifications')['createNotifications']>[0],
  notifications: NotificationData[]
): ReturnType<typeof import('@/lib/db/notifications')['createNotifications']> {
  const { createNotifications: dbCreateNotifications } = require('@/lib/db/notifications');
  return dbCreateNotifications(db, notifications);
}
