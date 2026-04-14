import Database from 'better-sqlite3';
import { getAuditLogsForIssue } from '@/lib/services/issue-audit-logs';
import { getDb } from '@/lib/db';
import { findProjectById } from '@/lib/db/projects';
import { findIssueById } from '@/lib/db/issues';
import { findAuditLogsByIssueId } from '@/lib/db/issue-audit-logs';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import { NotFoundError } from '@/lib/errors/helpers';
import type { IssueAuditLog } from '@/lib/db/issue-audit-logs';

// Mock all database dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/db/projects');
jest.mock('@/lib/db/issues');
jest.mock('@/lib/db/issue-audit-logs');

// Mock iron-session before importing auth service
jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn(() => ({
    userId: 'user-1',
    save: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('@/lib/services/auth');

describe('Issue Audit Logs Service', () => {
  const mockDb = {} as Database.Database;
  const mockUser = { id: 'user-1', email: 'user@example.com', name: 'Test User' };
  const mockProject = { id: 'project-1', ownerId: 'user-1', name: 'Test Project' };
  const mockIssue = {
    id: 'issue-1',
    projectId: 'project-1',
    title: 'Test Issue',
    status: 'OPEN',
  };
  const mockAuditLogs: IssueAuditLog[] = [
    {
      id: 'audit-1',
      issueId: 'issue-1',
      projectId: 'project-1',
      actorId: 'user-1',
      action: 'ISSUE_CREATED',
      fromStatus: null,
      toStatus: 'OPEN',
      fromAssigneeId: null,
      toAssigneeId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getDb as jest.Mock).mockReturnValue(mockDb);
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('getAuditLogsForIssue', () => {
    it('should return audit logs when user owns the project', async () => {
      (findProjectById as jest.Mock).mockReturnValue(mockProject);
      (findIssueById as jest.Mock).mockReturnValue(mockIssue);
      (findAuditLogsByIssueId as jest.Mock).mockReturnValue(mockAuditLogs);

      const result = await getAuditLogsForIssue('project-1', 'issue-1');

      expect(result).toEqual(mockAuditLogs);
      expect(requireAuthenticatedUser).toHaveBeenCalled();
      expect(findProjectById).toHaveBeenCalledWith(mockDb, 'project-1');
      expect(findIssueById).toHaveBeenCalledWith(mockDb, 'issue-1');
      expect(findAuditLogsByIssueId).toHaveBeenCalledWith(mockDb, 'issue-1');
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      const mockError = new Error('Unauthenticated');
      (requireAuthenticatedUser as jest.Mock).mockRejectedValue(mockError);

      await expect(getAuditLogsForIssue('project-1', 'issue-1')).rejects.toThrow(
        mockError
      );
    });

    it('should throw NotFoundError when project does not exist', async () => {
      (findProjectById as jest.Mock).mockReturnValue(null);

      await expect(getAuditLogsForIssue('project-1', 'issue-1')).rejects.toThrow(
        NotFoundError
      );
      expect(findProjectById).toHaveBeenCalledWith(mockDb, 'project-1');
    });

    it('should throw NotFoundError when user does not own the project', async () => {
      const differentUser = { id: 'user-2', email: 'other@example.com', name: 'Other User' };
      (requireAuthenticatedUser as jest.Mock).mockResolvedValue(differentUser);
      (findProjectById as jest.Mock).mockReturnValue(mockProject);

      await expect(getAuditLogsForIssue('project-1', 'issue-1')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      (findProjectById as jest.Mock).mockReturnValue(mockProject);
      (findIssueById as jest.Mock).mockReturnValue(null);

      await expect(getAuditLogsForIssue('project-1', 'issue-1')).rejects.toThrow(
        NotFoundError
      );
      expect(findIssueById).toHaveBeenCalledWith(mockDb, 'issue-1');
    });

    it('should throw NotFoundError when issue belongs to different project', async () => {
      const issueFromDifferentProject = {
        ...mockIssue,
        projectId: 'different-project',
      };
      (findProjectById as jest.Mock).mockReturnValue(mockProject);
      (findIssueById as jest.Mock).mockReturnValue(issueFromDifferentProject);

      await expect(getAuditLogsForIssue('project-1', 'issue-1')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should return empty array when no audit logs exist', async () => {
      (findProjectById as jest.Mock).mockReturnValue(mockProject);
      (findIssueById as jest.Mock).mockReturnValue(mockIssue);
      (findAuditLogsByIssueId as jest.Mock).mockReturnValue([]);

      const result = await getAuditLogsForIssue('project-1', 'issue-1');

      expect(result).toEqual([]);
    });
  });
});
