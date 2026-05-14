/**
 * Migration runner integration tests
 *
 * Tests the migration execution functionality using real migration files.
 * Tests focus on:
 * - Migration execution and recording
 * - Repeat execution protection
 * - Migration ordering
 * - Recording timestamps
 */

import Database from 'better-sqlite3';

// Mock the logger to avoid noise in tests
jest.mock('@/lib/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  getRequestId: jest.fn(() => 'test-request-id'),
}));

// Mock the database to use test database
let testDb: Database.Database | null = null;

jest.mock('@/lib/db', () => ({
  getDb: () => {
    if (!testDb) {
      throw new Error('Test database not initialized');
    }
    return testDb;
  },
  closeDb: () => {
    if (testDb) {
      testDb.close();
      testDb = null;
    }
  },
  initializeDatabase: jest.fn(),
}));

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

describe('Migration Runner Integration', () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
      testDb = null;
    }
    jest.clearAllMocks();
  });

  describe('runMigrations', () => {
    it('should execute and record migrations', () => {
      // Import after mock is set up
      const { runMigrations } = require('@/lib/db/migrations/runner');
      const {
        getAppliedMigrations,
        initializeMigrationTracking,
        getCurrentMigrationVersion,
      } = require('@/lib/db/migrations/tracking');

      // Create basic schema tables first (simulating existing database)
      testDb!.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Initialize migration tracking table
      initializeMigrationTracking();

      // Run migrations
      const result = runMigrations();

      // Verify success
      expect(result.success).toBe(true);
      expect(result.failed).toHaveLength(0);

      // Verify migrations were recorded (all existing migrations should be skipped/applied)
      const applied = getAppliedMigrations();
      expect(applied.length).toBeGreaterThan(0);

      // Verify current version is set
      const currentVersion = getCurrentMigrationVersion();
      expect(currentVersion).not.toBeNull();
    });

    it('should skip already applied migrations on subsequent runs', () => {
      // Import after mock is set up
      const { runMigrations } = require('@/lib/db/migrations/runner');
      const {
        getAppliedMigrations,
        initializeMigrationTracking,
      } = require('@/lib/db/migrations/tracking');

      // Create basic schema tables
      testDb!.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Initialize migration tracking table
      initializeMigrationTracking();

      // Run migrations first time
      const firstRun = runMigrations();
      expect(firstRun.success).toBe(true);

      const appliedAfterFirstRun = getAppliedMigrations();

      // Run migrations second time
      const secondRun = runMigrations();

      // Verify success and skipping
      expect(secondRun.success).toBe(true);
      expect(secondRun.failed).toHaveLength(0);

      // Verify no duplicate records were added
      const appliedAfterSecondRun = getAppliedMigrations();
      expect(appliedAfterSecondRun.length).toEqual(appliedAfterFirstRun.length);
    });

    it('should execute migrations in version order', () => {
      // Import after mock is set up
      const { runMigrations } = require('@/lib/db/migrations/runner');
      const {
        getAppliedMigrations,
        initializeMigrationTracking,
      } = require('@/lib/db/migrations/tracking');

      // Create basic schema tables
      testDb!.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Initialize migration tracking table
      initializeMigrationTracking();

      // Run migrations
      const result = runMigrations();

      // Verify success
      expect(result.success).toBe(true);

      // Verify applied migrations are in ascending version order
      const applied = getAppliedMigrations();
      const versions = applied.map((m: { version: string }) => m.version);

      // Verify versions are sorted
      const sortedVersions = [...versions].sort();
      expect(versions).toEqual(sortedVersions);
    });

    it('should record migration timestamps', () => {
      // Import after mock is set up
      const { runMigrations } = require('@/lib/db/migrations/runner');
      const {
        getAppliedMigrations,
        initializeMigrationTracking,
      } = require('@/lib/db/migrations/tracking');

      // Create basic schema tables
      testDb!.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Initialize migration tracking table
      initializeMigrationTracking();

      // Run migrations
      const result = runMigrations();

      // Verify success
      expect(result.success).toBe(true);

      // Verify all migrations have timestamps
      const applied = getAppliedMigrations();
      applied.forEach((migration: { appliedAt: string }) => {
        expect(migration.appliedAt).toBeDefined();
        expect(new Date(migration.appliedAt)).toBeInstanceOf(Date);
      });
    });

    it('should verify migration idempotency', () => {
      // Import after mock is set up
      const { runMigrations } = require('@/lib/db/migrations/runner');
      const {
        getAppliedMigrations,
        initializeMigrationTracking,
      } = require('@/lib/db/migrations/tracking');

      // Create basic schema tables
      testDb!.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Initialize migration tracking table
      initializeMigrationTracking();

      // Run migrations multiple times
      const firstRun = runMigrations();
      const secondRun = runMigrations();
      const thirdRun = runMigrations();

      // All runs should succeed
      expect(firstRun.success).toBe(true);
      expect(secondRun.success).toBe(true);
      expect(thirdRun.success).toBe(true);

      // Number of applied migrations should remain constant
      const appliedFirst = getAppliedMigrations();
      const appliedSecond = getAppliedMigrations();
      const appliedThird = getAppliedMigrations();

      expect(appliedFirst.length).toEqual(appliedSecond.length);
      expect(appliedSecond.length).toEqual(appliedThird.length);
    });
  });

  describe('Migration tracking', () => {
    it('should check if migration has been applied', () => {
      // Import after mock is set up
      const { runMigrations } = require('@/lib/db/migrations/runner');
      const {
        getAppliedMigrations,
        initializeMigrationTracking,
        hasMigrationBeenApplied,
      } = require('@/lib/db/migrations/tracking');

      // Create basic schema tables
      testDb!.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Initialize migration tracking table
      initializeMigrationTracking();

      // Run migrations
      runMigrations();

      // Check that some migrations have been applied
      const applied = getAppliedMigrations();
      expect(applied.length).toBeGreaterThan(0);

      // Verify hasMigrationBeenApplied works
      expect(hasMigrationBeenApplied('007_add_migration_tracking')).toBe(true);
      expect(hasMigrationBeenApplied('999_non_existent')).toBe(false);
    });

    it('should record migration successfully', () => {
      // Import after mock is set up
      const {
        recordMigration,
        initializeMigrationTracking,
        getAppliedMigrations,
      } = require('@/lib/db/migrations/tracking');

      // Initialize migration tracking table
      initializeMigrationTracking();

      // Record a test migration
      const recorded = recordMigration('999_test_migration');

      expect(recorded).toBe(true);

      // Verify it's in the applied migrations
      const applied = getAppliedMigrations();
      const testMigration = applied.find((m: { version: string }) => m.version === '999_test_migration');
      expect(testMigration).toBeDefined();
      expect(testMigration?.appliedAt).toBeDefined();
    });

    it('should not record duplicate migrations', () => {
      // Import after mock is set up
      const {
        recordMigration,
        initializeMigrationTracking,
        getAppliedMigrations,
      } = require('@/lib/db/migrations/tracking');

      // Initialize migration tracking table
      initializeMigrationTracking();

      // Record same migration twice
      const firstRecord = recordMigration('999_test_migration');
      const secondRecord = recordMigration('999_test_migration');

      expect(firstRecord).toBe(true);
      expect(secondRecord).toBe(false); // Should return false as it already exists

      // Verify only one record exists
      const applied = getAppliedMigrations();
      const duplicates = applied.filter((m: { version: string }) => m.version === '999_test_migration');
      expect(duplicates.length).toBe(1);
    });
  });
});
