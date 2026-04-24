import Database from 'better-sqlite3';
import {
  createNotification,
  markNotificationAsRead as markNotificationAsReadDb,
  findNotificationById,
} from '@/lib/db/notifications';
import {
  listNotifications,
  markNotificationAsRead,
  getUnreadCount,
  markNotificationsAsRead,
} from '@/lib/services/notification';

// Mock the auth module
jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

// Mock the db module
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

import { requireAuthenticatedUser } from '@/lib/services/auth';
import { getDb } from '@/lib/db';

describe('Notification Service', () => {
  let db: Database.Database;
  let mockUser: {
    id: string;
    email: string;
    name: string;
  };

  beforeEach(() => {
    // Create an in-memory database for testing
    db = new Database(':memory:');

    // Create necessary tables
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        key TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      );

      CREATE TABLE issues (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        created_by_id TEXT NOT NULL,
        assignee_id TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (created_by_id) REFERENCES users(id),
        FOREIGN KEY (assignee_id) REFERENCES users(id)
      );

      CREATE TABLE issue_comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (issue_id) REFERENCES issues(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
      );

      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        issue_id TEXT NOT NULL,
        comment_id TEXT,
        project_id TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (issue_id) REFERENCES issues(id),
        FOREIGN KEY (comment_id) REFERENCES issue_comments(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        CHECK (type IN ('MENTION', 'ASSIGNEE_CHANGED')),
        CHECK (is_read IN (0, 1))
      );
    `);

    // Insert test data
    mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    };

    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      mockUser.id,
      mockUser.email,
      'hash',
      mockUser.name
    );

    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      'user-2',
      'user2@example.com',
      'hash',
      'Test User 2'
    );

    db.prepare('INSERT INTO projects (id, owner_id, name, key, description) VALUES (?, ?, ?, ?, ?)').run(
      'project-1',
      mockUser.id,
      'Test Project',
      'TEST',
      'A test project'
    );

    db.prepare('INSERT INTO issues (id, project_id, title, description, status, created_by_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      'issue-1',
      'project-1',
      'Test Issue',
      'A test issue',
      'OPEN',
      mockUser.id
    );

    db.prepare('INSERT INTO issue_comments (id, issue_id, project_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      'comment-1',
      'issue-1',
      'project-1',
      mockUser.id,
      'Test comment',
      new Date().toISOString()
    );

    // Mock getDb to return our test database
    (getDb as jest.Mock).mockReturnValue(db);

    // Mock requireAuthenticatedUser to return our test user
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listNotifications', () => {
    it('should return empty array for user with no notifications', async () => {
      const result = await listNotifications({ limit: 20, offset: 0 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return notifications for current user only', async () => {
      // Create notification for current user
      createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
        commentId: 'comment-1',
      });

      // Create notification for another user
      createNotification(db, {
        userId: 'user-2',
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
        commentId: 'comment-1',
      });

      const result = await listNotifications({ limit: 20, offset: 0 });

      // Should only return notification for current user
      expect(result.items).toHaveLength(1);
      expect(result.items[0].userId).toBe(mockUser.id);
      expect(result.total).toBe(1);
    });

    it('should return notifications with details', async () => {
      createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
        commentId: 'comment-1',
      });

      const result = await listNotifications({ limit: 20, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
        isRead: false,
      });
      expect(result.items[0].issueTitle).toBe('Test Issue');
      expect(result.items[0].projectKey).toBe('TEST');
      expect(result.items[0].projectName).toBe('Test Project');
    });

    it('should filter by isRead status', async () => {
      // Create unread notification
      const notification1 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Create read notification
      const notification2 = createNotification(db, {
        userId: mockUser.id,
        type: 'ASSIGNEE_CHANGED',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      markNotificationAsReadDb(db, notification2.id);

      // Get only unread
      const unreadResult = await listNotifications({ limit: 20, offset: 0, isRead: false });
      expect(unreadResult.items).toHaveLength(1);
      expect(unreadResult.items[0].id).toBe(notification1.id);
      expect(unreadResult.total).toBe(1);

      // Get only read
      const readResult = await listNotifications({ limit: 20, offset: 0, isRead: true });
      expect(readResult.items).toHaveLength(1);
      expect(readResult.items[0].id).toBe(notification2.id);
      expect(readResult.total).toBe(1);

      // Get all
      const allResult = await listNotifications({ limit: 20, offset: 0 });
      expect(allResult.items).toHaveLength(2);
      expect(allResult.total).toBe(2);
    });

    it('should paginate results correctly', async () => {
      // Create 25 notifications
      for (let i = 0; i < 25; i++) {
        createNotification(db, {
          userId: mockUser.id,
          type: 'MENTION',
          issueId: 'issue-1',
          projectId: 'project-1',
        });
      }

      const page1 = await listNotifications({ limit: 10, offset: 0 });
      expect(page1.items).toHaveLength(10);
      expect(page1.total).toBe(25);

      const page2 = await listNotifications({ limit: 10, offset: 10 });
      expect(page2.items).toHaveLength(10);
      expect(page2.total).toBe(25);

      const page3 = await listNotifications({ limit: 10, offset: 20 });
      expect(page3.items).toHaveLength(5);
      expect(page3.total).toBe(25);
    });

    it('should return notifications ordered by created_at desc', async () => {
      const notification1 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 2));

      const notification2 = createNotification(db, {
        userId: mockUser.id,
        type: 'ASSIGNEE_CHANGED',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      const result = await listNotifications({ limit: 20, offset: 0 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(notification2.id); // Most recent first
      expect(result.items[1].id).toBe(notification1.id);
    });

    it('should require authentication', async () => {
      (requireAuthenticatedUser as jest.Mock).mockRejectedValue(new Error('UNAUTHENTICATED'));

      await expect(listNotifications({ limit: 20, offset: 0 })).rejects.toThrow('UNAUTHENTICATED');
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      expect(notification.isRead).toBe(false);

      const result = await markNotificationAsRead(notification.id);

      expect(result.isRead).toBe(true);
      expect(result.id).toBe(notification.id);
    });

    it('should throw error if notification not found', async () => {
      await expect(markNotificationAsRead('non-existent-id')).rejects.toThrow('Notification');
    });

    it('should throw error if notification belongs to another user', async () => {
      const notification = createNotification(db, {
        userId: 'user-2',
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      await expect(markNotificationAsRead(notification.id)).rejects.toThrow('You do not have access to this notification');
    });

    it('should require authentication', async () => {
      (requireAuthenticatedUser as jest.Mock).mockRejectedValue(new Error('UNAUTHENTICATED'));

      await expect(markNotificationAsRead('some-id')).rejects.toThrow('UNAUTHENTICATED');
    });
  });

  describe('getUnreadCount', () => {
    it('should return 0 for user with no notifications', async () => {
      const count = await getUnreadCount();

      expect(count).toBe(0);
    });

    it('should return count of unread notifications', async () => {
      // Create 3 unread notifications
      createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      createNotification(db, {
        userId: mockUser.id,
        type: 'ASSIGNEE_CHANGED',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      const count = await getUnreadCount();

      expect(count).toBe(3);
    });

    it('should not count read notifications', async () => {
      // Create unread notification
      createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Create read notification
      const notification2 = createNotification(db, {
        userId: mockUser.id,
        type: 'ASSIGNEE_CHANGED',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      markNotificationAsReadDb(db, notification2.id);

      const count = await getUnreadCount();

      expect(count).toBe(1);
    });

    it('should only count current user notifications', async () => {
      // Create notification for current user
      createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Create notification for another user
      createNotification(db, {
        userId: 'user-2',
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      const count = await getUnreadCount();

      expect(count).toBe(1);
    });

    it('should require authentication', async () => {
      (requireAuthenticatedUser as jest.Mock).mockRejectedValue(new Error('UNAUTHENTICATED'));

      await expect(getUnreadCount()).rejects.toThrow('UNAUTHENTICATED');
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark all notifications as read when no ids provided', async () => {
      // Create 3 unread notifications
      const notification1 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      const notification2 = createNotification(db, {
        userId: mockUser.id,
        type: 'ASSIGNEE_CHANGED',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      const notification3 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      const updatedCount = await markNotificationsAsRead();

      expect(updatedCount).toBe(3);

      // Verify all are marked as read
      const result1 = findNotificationById(db, notification1.id);
      const result2 = findNotificationById(db, notification2.id);
      const result3 = findNotificationById(db, notification3.id);

      expect(result1?.isRead).toBe(true);
      expect(result2?.isRead).toBe(true);
      expect(result3?.isRead).toBe(true);
    });

    it('should mark specific notifications as read when ids provided', async () => {
      const notification1 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      const notification2 = createNotification(db, {
        userId: mockUser.id,
        type: 'ASSIGNEE_CHANGED',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      const notification3 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Mark only notification1 and notification2 as read
      const updatedCount = await markNotificationsAsRead([notification1.id, notification2.id]);

      expect(updatedCount).toBe(2);

      // Verify notification1 and notification2 are marked as read
      const result1 = findNotificationById(db, notification1.id);
      const result2 = findNotificationById(db, notification2.id);
      const result3 = findNotificationById(db, notification3.id);

      expect(result1?.isRead).toBe(true);
      expect(result2?.isRead).toBe(true);
      expect(result3?.isRead).toBe(false);
    });

    it('should only mark current user notifications', async () => {
      // Create notification for current user
      const notification1 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Create notification for another user
      const notification2 = createNotification(db, {
        userId: 'user-2',
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Try to mark both as read (should only mark current user's)
      const updatedCount = await markNotificationsAsRead([notification1.id, notification2.id]);

      expect(updatedCount).toBe(1);

      // Verify notification1 is marked as read
      const result1 = findNotificationById(db, notification1.id);
      expect(result1?.isRead).toBe(true);

      // Verify notification2 is NOT marked as read (belongs to another user)
      const result2 = findNotificationById(db, notification2.id);
      expect(result2?.isRead).toBe(false);
    });

    it('should be idempotent - marking already read notifications returns 0', async () => {
      const notification1 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Mark as read first time
      const updatedCount1 = await markNotificationsAsRead([notification1.id]);
      expect(updatedCount1).toBe(1);

      // Mark as read second time (should return 0 since already read)
      const updatedCount2 = await markNotificationsAsRead([notification1.id]);
      expect(updatedCount2).toBe(0);
    });

    it('should handle empty array by returning 0', async () => {
      const updatedCount = await markNotificationsAsRead([]);

      expect(updatedCount).toBe(0);
    });

    it('should handle non-existent notification ids gracefully', async () => {
      const updatedCount = await markNotificationsAsRead(['non-existent-id-1', 'non-existent-id-2']);

      expect(updatedCount).toBe(0);
    });

    it('should handle mixed valid and invalid notification ids', async () => {
      const notification = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Mix valid and invalid IDs
      const updatedCount = await markNotificationsAsRead([
        notification.id,
        'non-existent-id',
      ]);

      expect(updatedCount).toBe(1);

      // Verify the valid notification was marked as read
      const result = findNotificationById(db, notification.id);
      expect(result?.isRead).toBe(true);
    });

    it('should require authentication', async () => {
      (requireAuthenticatedUser as jest.Mock).mockRejectedValue(new Error('UNAUTHENTICATED'));

      await expect(markNotificationsAsRead()).rejects.toThrow('UNAUTHENTICATED');
    });

    it('should not affect already read notifications when marking all as read', async () => {
      // Create 2 unread and 1 read notification
      createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      createNotification(db, {
        userId: mockUser.id,
        type: 'ASSIGNEE_CHANGED',
        issueId: 'issue-1',
        projectId: 'project-1',
      });
      const notification3 = createNotification(db, {
        userId: mockUser.id,
        type: 'MENTION',
        issueId: 'issue-1',
        projectId: 'project-1',
      });

      // Mark notification3 as read
      markNotificationAsReadDb(db, notification3.id);

      // Mark all as read
      const updatedCount = await markNotificationsAsRead();

      // Should only update the 2 unread notifications
      expect(updatedCount).toBe(2);
    });
  });
});
