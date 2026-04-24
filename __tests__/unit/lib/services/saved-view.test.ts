import Database from 'better-sqlite3';
import {
  createSavedView,
  findSavedViewById,
} from '@/lib/db/saved-views';
import {
  createSavedViewForUser,
  listSavedViewsForUser,
  getSavedViewById,
  deleteSavedView,
  getFiltersFromSavedView,
} from '@/lib/services/saved-view';

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

describe('Saved View Service', () => {
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

      CREATE TABLE saved_views (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        filters_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, name),
        CHECK (length(filters_json) > 0)
      );
    `);

    // Insert test data
    mockUser = {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'Test User',
    };

    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      mockUser.id,
      mockUser.email,
      'hash',
      mockUser.name
    );

    // Mock getDb to return our test database
    (getDb as jest.Mock).mockReturnValue(db);

    // Mock requireAuthenticatedUser to return our test user
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    db.close();
    jest.clearAllMocks();
  });

  describe('createSavedViewForUser', () => {
    it('should create a new saved view for the current user', async () => {
      const input = {
        name: 'My Open Issues',
        filters: {
          state: 'OPEN' as const,
          projectId: 'project-1',
        },
      };

      const result = await createSavedViewForUser(input);

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe(mockUser.id);
      expect(result.name).toBe('My Open Issues');
      expect(result.createdAt).toBeDefined();

      // Verify filters are correctly stored as JSON
      const view = findSavedViewById(db, result.id);
      expect(view).not.toBeNull();
      const parsedFilters = JSON.parse(view!.filtersJson);
      expect(parsedFilters).toEqual(input.filters);
    });

    it('should throw ValidationError if view name already exists for the user', async () => {
      const input = {
        name: 'My View',
        filters: { state: 'OPEN' as const },
      };

      // Create first view
      await createSavedViewForUser(input);

      // Attempt to create duplicate
      await expect(createSavedViewForUser(input)).rejects.toThrow('A view with this name already exists');
    });

    it('should call requireAuthenticatedUser', async () => {
      const input = {
        name: 'My View',
        filters: { state: 'OPEN' as const },
      };

      await createSavedViewForUser(input);

      expect(requireAuthenticatedUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('listSavedViewsForUser', () => {
    it('should return empty array when user has no saved views', async () => {
      const result = await listSavedViewsForUser();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return saved views with parsed filters', async () => {
      const filters1 = { state: 'OPEN' as const };
      const filters2 = { state: 'CLOSED' as const, assigneeId: 'user-2' };

      createSavedView(db, {
        userId: mockUser.id,
        name: 'Open Issues',
        filtersJson: JSON.stringify(filters1),
      });

      createSavedView(db, {
        userId: mockUser.id,
        name: 'Closed Issues',
        filtersJson: JSON.stringify(filters2),
      });

      const result = await listSavedViewsForUser();

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].filters).toEqual(filters2);
      expect(result.items[1].filters).toEqual(filters1);
    });

    it('should only return views for the current user', async () => {
      const otherUserId = 'user-2';
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
        otherUserId,
        'user2@example.com',
        'hash',
        'Other User'
      );

      createSavedView(db, {
        userId: mockUser.id,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      createSavedView(db, {
        userId: otherUserId,
        name: 'Other View',
        filtersJson: JSON.stringify({ state: 'CLOSED' }),
      });

      const result = await listSavedViewsForUser();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('My View');
      expect(result.total).toBe(1);
    });

    it('should respect pagination parameters', async () => {
      for (let i = 1; i <= 5; i++) {
        createSavedView(db, {
          userId: mockUser.id,
          name: `View ${i}`,
          filtersJson: JSON.stringify({ state: 'OPEN' }),
        });
      }

      const result1 = await listSavedViewsForUser({ limit: 2, offset: 0 });
      expect(result1.items).toHaveLength(2);
      expect(result1.total).toBe(5);

      const result2 = await listSavedViewsForUser({ limit: 2, offset: 2 });
      expect(result2.items).toHaveLength(2);
      expect(result2.total).toBe(5);
    });
  });

  describe('getSavedViewById', () => {
    it('should throw NotFoundError if view does not exist', async () => {
      await expect(getSavedViewById('non-existent-id')).rejects.toThrow('Saved View');
    });

    it('should throw ForbiddenError if view belongs to different user', async () => {
      const otherUserId = 'user-2';
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
        otherUserId,
        'user2@example.com',
        'hash',
        'Other User'
      );

      const view = createSavedView(db, {
        userId: otherUserId,
        name: 'Other View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      await expect(getSavedViewById(view.id)).rejects.toThrow('You do not have access to this saved view');
    });

    it('should return view with parsed filters if owned by current user', async () => {
      const filters = { state: 'OPEN' as const, projectId: 'project-1' };
      const created = createSavedView(db, {
        userId: mockUser.id,
        name: 'My View',
        filtersJson: JSON.stringify(filters),
      });

      const result = await getSavedViewById(created.id);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('My View');
      expect(result.filters).toEqual(filters);
    });
  });

  describe('deleteSavedView', () => {
    it('should throw NotFoundError if view does not exist', async () => {
      await expect(deleteSavedView('non-existent-id')).rejects.toThrow('Saved View');
    });

    it('should throw ForbiddenError if view belongs to different user', async () => {
      const otherUserId = 'user-2';
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
        otherUserId,
        'user2@example.com',
        'hash',
        'Other User'
      );

      const view = createSavedView(db, {
        userId: otherUserId,
        name: 'Other View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      await expect(deleteSavedView(view.id)).rejects.toThrow('You do not have access to this saved view');
    });

    it('should delete view if owned by current user', async () => {
      const created = createSavedView(db, {
        userId: mockUser.id,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      await deleteSavedView(created.id);

      const view = findSavedViewById(db, created.id);
      expect(view).toBeNull();
    });
  });

  describe('getFiltersFromSavedView', () => {
    it('should return parsed filters from saved view', async () => {
      const filters = {
        state: 'OPEN' as const,
        projectId: 'project-1',
        assigneeId: 'user-2',
      };
      const created = createSavedView(db, {
        userId: mockUser.id,
        name: 'My View',
        filtersJson: JSON.stringify(filters),
      });

      const result = await getFiltersFromSavedView(created.id);

      expect(result).toEqual(filters);
    });

    it('should throw NotFoundError if view does not exist', async () => {
      await expect(getFiltersFromSavedView('non-existent-id')).rejects.toThrow('Saved View');
    });

    it('should throw ForbiddenError if view belongs to different user', async () => {
      const otherUserId = 'user-2';
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
        otherUserId,
        'user2@example.com',
        'hash',
        'Other User'
      );

      const view = createSavedView(db, {
        userId: otherUserId,
        name: 'Other View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      await expect(getFiltersFromSavedView(view.id)).rejects.toThrow('You do not have access to this saved view');
    });
  });
});
