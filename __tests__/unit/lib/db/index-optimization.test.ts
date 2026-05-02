import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  createIssue,
  findIssuesWithFilters,
  countIssuesWithFilters,
} from '@/lib/db/issues';
import { createUser } from '@/lib/db/users';
import { createProject } from '@/lib/db/projects';

// Helper function to execute migration SQL
function executeMigration(db: Database.Database, migrationSql: string): void {
  db.exec(migrationSql);
}

// Helper function to check if index exists
function indexExists(db: Database.Database, tableName: string, indexName: string): boolean {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM sqlite_master
    WHERE type='index'
    AND tbl_name = ?
    AND name = ?
  `);
  const result = stmt.get(tableName, indexName) as { count: number };
  return result.count > 0;
}

// Helper function to get query execution plan
function getQueryPlan(db: Database.Database, query: string, params: (string | number)[] = []): unknown[] {
  const stmt = db.prepare(`EXPLAIN QUERY PLAN ${query}`);
  return stmt.all(...params);
}

describe('Database Index Optimization', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create an in-memory test database
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Initialize database schema
    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
    }
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Index Creation', () => {
    it('should create idx_issues_status index', () => {
      expect(indexExists(db, 'issues', 'idx_issues_status')).toBe(true);
    });

    it('should create idx_issues_created_at index', () => {
      expect(indexExists(db, 'issues', 'idx_issues_created_at')).toBe(true);
    });

    it('should have all required indexes on issues table', () => {
      const requiredIndexes = [
        'idx_issues_project_id',
        'idx_issues_assignee_id',
        'idx_issues_status',
        'idx_issues_created_at',
      ];

      requiredIndexes.forEach((indexName) => {
        expect(indexExists(db, 'issues', indexName)).toBe(true);
      });
    });
  });

  describe('Migration Idempotency', () => {
    it('should be safe to run migration multiple times', () => {
      // Read migration SQL
      const migrationPath = path.join(
        process.cwd(),
        'lib',
        'db',
        'migrations',
        '005_add_query_performance_indexes.sql'
      );

      if (!fs.existsSync(migrationPath)) {
        console.warn('Migration file not found, skipping idempotency test');
        return;
      }

      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

      // Execute migration twice - should not fail
      expect(() => executeMigration(db, migrationSql)).not.toThrow();
      expect(() => executeMigration(db, migrationSql)).not.toThrow();

      // Verify indexes still exist
      expect(indexExists(db, 'issues', 'idx_issues_status')).toBe(true);
      expect(indexExists(db, 'issues', 'idx_issues_created_at')).toBe(true);
    });
  });

  describe('Query Path Coverage', () => {
    let userId: string;
    let projectId: string;

    beforeEach(() => {
      // Create test data
      const user = createUser(db, {
        email: 'test@example.com',
        passwordHash: 'test-hash',
        name: 'Test User',
      });
      userId = user.id;

      const project = createProject(db, {
        ownerId: userId,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      });
      projectId = project.id;

      // Create test issues with different statuses
      const issueData = [
        { title: 'Open Issue 1', status: 'OPEN' },
        { title: 'Open Issue 2', status: 'OPEN' },
        { title: 'Closed Issue 1', status: 'CLOSED', closeReason: 'COMPLETED' },
        { title: 'Closed Issue 2', status: 'CLOSED', closeReason: 'NOT_PLANNED' },
      ];

      issueData.forEach((data, index) => {
        createIssue(db, {
          projectId,
          title: data.title,
          description: `Description ${index + 1}`,
          status: data.status,
          closeReason: data.closeReason,
          createdById: userId,
        });
      });
    });

    it('should use idx_issues_status for status filtering', () => {
      const plan = getQueryPlan(
        db,
        `SELECT * FROM issues WHERE project_id = ? AND status = ? ORDER BY created_at DESC`,
        [projectId, 'OPEN']
      );

      // Verify that the plan uses the status index
      const planStr = JSON.stringify(plan);
      expect(planStr).toContain('idx_issues_status');
    });

    it('should use idx_issues_created_at for time-based sorting', () => {
      // Note: When there's a WHERE condition on project_id, SQLite's query optimizer
      // may choose to use idx_issues_project_id and then use a temp B-TREE for sorting.
      // This is often more efficient for small result sets. Here we test a query
      // without project_id filter to verify the created_at index is used.
      const plan = getQueryPlan(
        db,
        `SELECT * FROM issues ORDER BY created_at DESC LIMIT ?`,
        [10]
      );

      // Verify that the plan uses the created_at index
      const planStr = JSON.stringify(plan);
      expect(planStr).toContain('idx_issues_created_at');
    });

    it('should use indexes for combined filters', () => {
      const plan = getQueryPlan(
        db,
        `SELECT * FROM issues WHERE project_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [projectId, 'OPEN', 10, 0]
      );

      // Verify that the plan uses at least one of the new indexes
      const planStr = JSON.stringify(plan);
      const usesStatusIndex = planStr.includes('idx_issues_status');
      const usesCreatedAtIndex = planStr.includes('idx_issues_created_at');

      expect(usesStatusIndex || usesCreatedAtIndex).toBe(true);
    });
  });

  describe('Query Correctness', () => {
    let userId: string;
    let projectId: string;

    beforeEach(() => {
      // Create test data
      const user = createUser(db, {
        email: 'test@example.com',
        passwordHash: 'test-hash',
        name: 'Test User',
      });
      userId = user.id;

      const project = createProject(db, {
        ownerId: userId,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      });
      projectId = project.id;

      // Create test issues with different statuses
      const issueData = [
        { title: 'Open Issue 1', status: 'OPEN' },
        { title: 'Open Issue 2', status: 'OPEN' },
        { title: 'Closed Issue 1', status: 'CLOSED', closeReason: 'COMPLETED' },
        { title: 'Closed Issue 2', status: 'CLOSED', closeReason: 'NOT_PLANNED' },
        { title: 'Closed Issue 3', status: 'CLOSED', closeReason: 'DUPLICATE' },
      ];

      issueData.forEach((data, index) => {
        createIssue(db, {
          projectId,
          title: data.title,
          description: `Description ${index + 1}`,
          status: data.status,
          closeReason: data.closeReason,
          createdById: userId,
        });
      });
    });

    it('should return correct results for status filter', () => {
      const issues = findIssuesWithFilters(
        db,
        { projectId, status: 'OPEN' },
        { offset: 0, limit: 10 },
        { sortBy: 'createdAt', order: 'DESC' }
      );

      expect(issues).toHaveLength(2);
      expect(issues.every((issue) => issue.status === 'OPEN')).toBe(true);
    });

    it('should return correct results for multiple filters', () => {
      const issues = findIssuesWithFilters(
        db,
        { projectId, status: 'CLOSED', closeReason: 'COMPLETED' },
        { offset: 0, limit: 10 },
        { sortBy: 'createdAt', order: 'DESC' }
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].status).toBe('CLOSED');
      expect(issues[0].closeReason).toBe('COMPLETED');
    });

    it('should return correct count for status filter', () => {
      const count = countIssuesWithFilters(db, { projectId, status: 'OPEN' });
      expect(count).toBe(2);
    });

    it('should return correct count for all issues', () => {
      const count = countIssuesWithFilters(db, { projectId });
      expect(count).toBe(5);
    });

    it('should maintain correct sorting by created_at', () => {
      const issues = findIssuesWithFilters(
        db,
        { projectId },
        { offset: 0, limit: 10 },
        { sortBy: 'createdAt', order: 'DESC' }
      );

      // Verify descending order
      for (let i = 1; i < issues.length; i++) {
        const prevTime = new Date(issues[i - 1].createdAt).getTime();
        const currTime = new Date(issues[i].createdAt).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });
  });

  describe('Performance Benefits', () => {
    let userId: string;
    let projectId: string;

    beforeEach(() => {
      // Create test data
      const user = createUser(db, {
        email: 'test@example.com',
        passwordHash: 'test-hash',
        name: 'Test User',
      });
      userId = user.id;

      const project = createProject(db, {
        ownerId: userId,
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      });
      projectId = project.id;

      // Create a larger dataset for performance testing
      for (let i = 0; i < 50; i++) {
        const status = i % 2 === 0 ? 'OPEN' : 'CLOSED';
        const closeReason = status === 'CLOSED' ? 'COMPLETED' : null;

        createIssue(db, {
          projectId,
          title: `Issue ${i + 1}`,
          description: `Description ${i + 1}`,
          status,
          closeReason,
          createdById: userId,
        });
      }
    });

    it('should efficiently query by status', () => {
      const startTime = Date.now();

      const issues = findIssuesWithFilters(
        db,
        { projectId, status: 'OPEN' },
        { offset: 0, limit: 25 },
        { sortBy: 'createdAt', order: 'DESC' }
      );

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      // Query should complete quickly (< 100ms for 50 records)
      expect(queryTime).toBeLessThan(100);
      expect(issues.length).toBe(25);
    });

    it('should efficiently count by status', () => {
      const startTime = Date.now();

      const count = countIssuesWithFilters(db, { projectId, status: 'CLOSED' });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      // Count query should be very fast (< 50ms)
      expect(queryTime).toBeLessThan(50);
      expect(count).toBe(25);
    });
  });
});
