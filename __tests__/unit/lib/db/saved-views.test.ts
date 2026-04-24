import Database from 'better-sqlite3';
import {
  createSavedView,
  findSavedViewsByUserId,
  countSavedViewsByUserId,
  findSavedViewById,
  findSavedViewByUserIdAndName,
  deleteSavedViewById,
  deleteSavedViewByIdAndUserId,
  deleteSavedViewsByUserId,
} from '@/lib/db/saved-views';

describe('Saved Views DB', () => {
  let db: Database.Database;
  let testUserId: string;

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
    testUserId = 'user-1';
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      testUserId,
      'user1@example.com',
      'hash',
      'Test User'
    );
  });

  afterEach(() => {
    db.close();
  });

  describe('createSavedView', () => {
    it('should create a new saved view', () => {
      const filters = { projectId: 'project-1', state: 'OPEN' };
      const data = {
        userId: testUserId,
        name: 'My Open Issues',
        filtersJson: JSON.stringify(filters),
      };

      const savedView = createSavedView(db, data);

      expect(savedView).toHaveProperty('id');
      expect(savedView.userId).toBe(testUserId);
      expect(savedView.name).toBe('My Open Issues');
      expect(savedView.filtersJson).toBe(JSON.stringify(filters));
      expect(savedView.createdAt).toBeDefined();
    });

    it('should enforce unique constraint on user_id + name', () => {
      const filters = { projectId: 'project-1', state: 'OPEN' };
      const data = {
        userId: testUserId,
        name: 'My View',
        filtersJson: JSON.stringify(filters),
      };

      createSavedView(db, data);

      // Attempt to create a duplicate
      expect(() => {
        createSavedView(db, data);
      }).toThrow();
    });
  });

  describe('findSavedViewsByUserId', () => {
    it('should return empty array when user has no saved views', () => {
      const views = findSavedViewsByUserId(db, testUserId);
      expect(views).toEqual([]);
    });

    it('should return saved views ordered by created_at DESC', () => {
      const filters1 = { state: 'OPEN' };
      const filters2 = { state: 'CLOSED' };

      createSavedView(db, {
        userId: testUserId,
        name: 'View 1',
        filtersJson: JSON.stringify(filters1),
      });

      // Small delay to ensure different timestamps
      const startTime = Date.now();
      while (Date.now() - startTime < 2) {
        // wait
      }

      createSavedView(db, {
        userId: testUserId,
        name: 'View 2',
        filtersJson: JSON.stringify(filters2),
      });

      const views = findSavedViewsByUserId(db, testUserId);
      expect(views).toHaveLength(2);
      expect(views[0].name).toBe('View 2'); // Most recent first
      expect(views[1].name).toBe('View 1');
    });

    it('should respect limit and offset', () => {
      for (let i = 1; i <= 5; i++) {
        createSavedView(db, {
          userId: testUserId,
          name: `View ${i}`,
          filtersJson: JSON.stringify({ state: 'OPEN' }),
        });
      }

      const views1 = findSavedViewsByUserId(db, testUserId, 2, 0);
      expect(views1).toHaveLength(2);

      const views2 = findSavedViewsByUserId(db, testUserId, 2, 2);
      expect(views2).toHaveLength(2);

      const views3 = findSavedViewsByUserId(db, testUserId, 2, 4);
      expect(views3).toHaveLength(1);
    });

    it('should only return views for the specified user', () => {
      const otherUserId = 'user-2';
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
        otherUserId,
        'user2@example.com',
        'hash',
        'Other User'
      );

      createSavedView(db, {
        userId: testUserId,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      createSavedView(db, {
        userId: otherUserId,
        name: 'Other View',
        filtersJson: JSON.stringify({ state: 'CLOSED' }),
      });

      const views = findSavedViewsByUserId(db, testUserId);
      expect(views).toHaveLength(1);
      expect(views[0].name).toBe('My View');
    });
  });

  describe('countSavedViewsByUserId', () => {
    it('should return 0 when user has no saved views', () => {
      const count = countSavedViewsByUserId(db, testUserId);
      expect(count).toBe(0);
    });

    it('should return the correct count', () => {
      for (let i = 1; i <= 3; i++) {
        createSavedView(db, {
          userId: testUserId,
          name: `View ${i}`,
          filtersJson: JSON.stringify({ state: 'OPEN' }),
        });
      }

      const count = countSavedViewsByUserId(db, testUserId);
      expect(count).toBe(3);
    });
  });

  describe('findSavedViewById', () => {
    it('should return null when view does not exist', () => {
      const view = findSavedViewById(db, 'non-existent-id');
      expect(view).toBeNull();
    });

    it('should return the saved view when it exists', () => {
      const created = createSavedView(db, {
        userId: testUserId,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      const found = findSavedViewById(db, created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('My View');
    });
  });

  describe('findSavedViewByUserIdAndName', () => {
    it('should return null when view does not exist', () => {
      const view = findSavedViewByUserIdAndName(db, testUserId, 'Non-existent');
      expect(view).toBeNull();
    });

    it('should return the saved view when it exists', () => {
      createSavedView(db, {
        userId: testUserId,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      const found = findSavedViewByUserIdAndName(db, testUserId, 'My View');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('My View');
    });

    it('should not return views from other users', () => {
      const otherUserId = 'user-2';
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
        otherUserId,
        'user2@example.com',
        'hash',
        'Other User'
      );

      createSavedView(db, {
        userId: otherUserId,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      const found = findSavedViewByUserIdAndName(db, testUserId, 'My View');
      expect(found).toBeNull();
    });
  });

  describe('deleteSavedViewById', () => {
    it('should return false when view does not exist', () => {
      const result = deleteSavedViewById(db, 'non-existent-id');
      expect(result).toBe(false);
    });

    it('should delete the view when it exists', () => {
      const created = createSavedView(db, {
        userId: testUserId,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      const result = deleteSavedViewById(db, created.id);
      expect(result).toBe(true);

      const found = findSavedViewById(db, created.id);
      expect(found).toBeNull();
    });
  });

  describe('deleteSavedViewByIdAndUserId', () => {
    it('should return false when view does not exist', () => {
      const result = deleteSavedViewByIdAndUserId(db, 'non-existent-id', testUserId);
      expect(result).toBe(false);
    });

    it('should return false when view exists but belongs to different user', () => {
      const otherUserId = 'user-2';
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
        otherUserId,
        'user2@example.com',
        'hash',
        'Other User'
      );

      const created = createSavedView(db, {
        userId: otherUserId,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      const result = deleteSavedViewByIdAndUserId(db, created.id, testUserId);
      expect(result).toBe(false);

      // View should still exist
      const found = findSavedViewById(db, created.id);
      expect(found).not.toBeNull();
    });

    it('should delete the view when it exists and belongs to the user', () => {
      const created = createSavedView(db, {
        userId: testUserId,
        name: 'My View',
        filtersJson: JSON.stringify({ state: 'OPEN' }),
      });

      const result = deleteSavedViewByIdAndUserId(db, created.id, testUserId);
      expect(result).toBe(true);

      const found = findSavedViewById(db, created.id);
      expect(found).toBeNull();
    });
  });

  describe('deleteSavedViewsByUserId', () => {
    it('should return 0 when user has no saved views', () => {
      const count = deleteSavedViewsByUserId(db, testUserId);
      expect(count).toBe(0);
    });

    it('should delete all views for the user', () => {
      for (let i = 1; i <= 3; i++) {
        createSavedView(db, {
          userId: testUserId,
          name: `View ${i}`,
          filtersJson: JSON.stringify({ state: 'OPEN' }),
        });
      }

      const count = deleteSavedViewsByUserId(db, testUserId);
      expect(count).toBe(3);

      const views = findSavedViewsByUserId(db, testUserId);
      expect(views).toHaveLength(0);
    });
  });
});
