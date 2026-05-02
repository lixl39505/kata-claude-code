import Database from 'better-sqlite3';
import {
  createIssueAuditLog,
  findAuditLogsByIssueId,
  findAuditLogsByIssueIdPaginated,
  countAuditLogsByIssueId,
  findAuditLogsByProjectId,
  type IssueAuditLogData,
} from '@/lib/db/issue-audit-logs';

describe('Issue Audit Logs Database Operations', () => {
  let db: Database.Database;

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

      CREATE TABLE issue_audit_logs (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT,
        from_assignee_id TEXT,
        to_assignee_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (issue_id) REFERENCES issues(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (actor_id) REFERENCES users(id),
        CHECK (action IN ('ISSUE_CREATED', 'ISSUE_STATUS_CHANGED', 'ISSUE_ASSIGNEE_CHANGED'))
      );
    `);

    // Insert test data
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      'user-1',
      'user@example.com',
      'hash',
      'Test User'
    );

    db.prepare('INSERT INTO projects (id, owner_id, name, key, description) VALUES (?, ?, ?, ?, ?)').run(
      'project-1',
      'user-1',
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
      'user-1'
    );
  });

  afterEach(() => {
    db.close();
  });

  describe('createIssueAuditLog', () => {
    it('should create an ISSUE_CREATED audit log', () => {
      const data: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };

      const log = createIssueAuditLog(db, data);

      expect(log.id).toBeDefined();
      expect(log.issueId).toBe('issue-1');
      expect(log.projectId).toBe('project-1');
      expect(log.actorId).toBe('user-1');
      expect(log.action).toBe('ISSUE_CREATED');
      expect(log.fromStatus).toBeNull();
      expect(log.toStatus).toBe('OPEN');
      expect(log.createdAt).toBeDefined();
    });

    it('should create an ISSUE_STATUS_CHANGED audit log', () => {
      const data: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'OPEN',
        toStatus: 'IN_PROGRESS',
      };

      const log = createIssueAuditLog(db, data);

      expect(log.id).toBeDefined();
      expect(log.issueId).toBe('issue-1');
      expect(log.projectId).toBe('project-1');
      expect(log.actorId).toBe('user-1');
      expect(log.action).toBe('ISSUE_STATUS_CHANGED');
      expect(log.fromStatus).toBe('OPEN');
      expect(log.toStatus).toBe('IN_PROGRESS');
      expect(log.createdAt).toBeDefined();
    });

    it('should generate unique IDs for each audit log', () => {
      const data: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };

      const log1 = createIssueAuditLog(db, data);
      const log2 = createIssueAuditLog(db, data);

      expect(log1.id).not.toBe(log2.id);
    });

    it('should create audit log with ISO timestamp', () => {
      const data: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };

      const log = createIssueAuditLog(db, data);
      const timestamp = new Date(log.createdAt);

      expect(timestamp.toISOString()).toBe(log.createdAt);
    });
  });

  describe('findAuditLogsByIssueId', () => {
    it('should return empty array when no audit logs exist', () => {
      const logs = findAuditLogsByIssueId(db, 'issue-1');
      expect(logs).toEqual([]);
    });

    it('should return audit logs for specific issue ordered by created_at DESC', () => {
      // Create audit logs with slight delays to ensure different timestamps
      const data1: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };

      const log1 = createIssueAuditLog(db, data1);

      // Add a small delay to ensure different timestamps
      const startTime = Date.now();
      while (Date.now() - startTime < 2) {
        // Wait 2ms
      }

      const data2: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'OPEN',
        toStatus: 'IN_PROGRESS',
      };

      const log2 = createIssueAuditLog(db, data2);

      const logs = findAuditLogsByIssueId(db, 'issue-1');

      expect(logs).toHaveLength(2);
      expect(logs[0].id).toBe(log2.id); // Most recent first
      expect(logs[1].id).toBe(log1.id);
    });

    it('should not return audit logs for different issue', () => {
      const data1: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };

      createIssueAuditLog(db, data1);

      const logs = findAuditLogsByIssueId(db, 'different-issue');
      expect(logs).toEqual([]);
    });
  });

  describe('findAuditLogsByProjectId', () => {
    it('should return empty array when no audit logs exist', () => {
      const logs = findAuditLogsByProjectId(db, 'project-1');
      expect(logs).toEqual([]);
    });

    it('should return audit logs for specific project ordered by created_at DESC', () => {
      // Create audit logs with slight delays
      const data1: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };

      const log1 = createIssueAuditLog(db, data1);

      // Add a small delay to ensure different timestamps
      const startTime = Date.now();
      while (Date.now() - startTime < 2) {
        // Wait 2ms
      }

      const data2: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'OPEN',
        toStatus: 'IN_PROGRESS',
      };

      const log2 = createIssueAuditLog(db, data2);

      const logs = findAuditLogsByProjectId(db, 'project-1');

      expect(logs).toHaveLength(2);
      expect(logs[0].id).toBe(log2.id); // Most recent first
      expect(logs[1].id).toBe(log1.id);
    });

    it('should not return audit logs for different project', () => {
      const data1: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };

      createIssueAuditLog(db, data1);

      const logs = findAuditLogsByProjectId(db, 'different-project');
      expect(logs).toEqual([]);
    });
  });

  describe('findAuditLogsByIssueIdPaginated', () => {
    it('should return empty array when no audit logs exist', () => {
      const logs = findAuditLogsByIssueIdPaginated(db, 'issue-1', 20, 0);
      expect(logs).toEqual([]);
    });

    it('should return paginated audit logs ordered by created_at DESC', () => {
      // Create multiple audit logs
      const data1: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };
      const log1 = createIssueAuditLog(db, data1);

      const startTime = Date.now();
      while (Date.now() - startTime < 2) {
        // Wait 2ms
      }

      const data2: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'OPEN',
        toStatus: 'CLOSED',
      };
      const log2 = createIssueAuditLog(db, data2);

      while (Date.now() - startTime < 4) {
        // Wait 2ms more
      }

      const data3: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_ASSIGNEE_CHANGED',
        fromStatus: null,
        toStatus: null,
        fromAssigneeId: null,
        toAssigneeId: 'user-1',
      };
      const log3 = createIssueAuditLog(db, data3);

      // Test limit
      const logs = findAuditLogsByIssueIdPaginated(db, 'issue-1', 2, 0);
      expect(logs).toHaveLength(2);
      expect(logs[0].id).toBe(log3.id); // Most recent first
      expect(logs[1].id).toBe(log2.id);

      // Test offset
      const logs2 = findAuditLogsByIssueIdPaginated(db, 'issue-1', 2, 2);
      expect(logs2).toHaveLength(1);
      expect(logs2[0].id).toBe(log1.id);
    });

    it('should not return audit logs for different issue', () => {
      const data1: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };
      createIssueAuditLog(db, data1);

      const logs = findAuditLogsByIssueIdPaginated(db, 'different-issue', 20, 0);
      expect(logs).toEqual([]);
    });
  });

  describe('countAuditLogsByIssueId', () => {
    it('should return 0 when no audit logs exist', () => {
      const count = countAuditLogsByIssueId(db, 'issue-1');
      expect(count).toBe(0);
    });

    it('should return correct count of audit logs', () => {
      const data1: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };
      createIssueAuditLog(db, data1);

      const data2: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'OPEN',
        toStatus: 'CLOSED',
      };
      createIssueAuditLog(db, data2);

      const count = countAuditLogsByIssueId(db, 'issue-1');
      expect(count).toBe(2);
    });

    it('should not count audit logs for different issue', () => {
      const data1: IssueAuditLogData = {
        issueId: 'issue-1',
        projectId: 'project-1',
        actorId: 'user-1',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      };
      createIssueAuditLog(db, data1);

      const count = countAuditLogsByIssueId(db, 'different-issue');
      expect(count).toBe(0);
    });
  });
});
