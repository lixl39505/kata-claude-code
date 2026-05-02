import Database from 'better-sqlite3';
import { getAuditLogsForIssue } from '@/lib/services/issue-audit-logs';
import { getDb } from '@/lib/db';
import { findIssueById } from '@/lib/db/issues';
import {
  findAuditLogsByIssueIdPaginated,
  countAuditLogsByIssueId,
} from '@/lib/db/issue-audit-logs';
import { requireProjectMember } from '@/lib/services/project-members';
import { NotFoundError, ForbiddenError } from '@/lib/errors/helpers';
import type { IssueAuditLog } from '@/lib/db/issue-audit-logs';

// Mock all database dependencies
jest.mock('@/lib/db');
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

jest.mock('@/lib/services/project-members');

describe('Issue Audit Logs Service', () => {
  const mockDb = {} as Database.Database;
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
    {
      id: 'audit-2',
      issueId: 'issue-1',
      projectId: 'project-1',
      actorId: 'user-1',
      action: 'ISSUE_STATUS_CHANGED',
      fromStatus: 'OPEN',
      toStatus: 'CLOSED',
      fromAssigneeId: null,
      toAssigneeId: null,
      createdAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getDb as jest.Mock).mockReturnValue(mockDb);
  });

  describe('getAuditLogsForIssue', () => {
    it('should return paginated audit logs when user is a project member', async () => {
      (requireProjectMember as jest.Mock).mockResolvedValue(undefined);
      (findIssueById as jest.Mock).mockReturnValue(mockIssue);
      (countAuditLogsByIssueId as jest.Mock).mockReturnValue(2);
      (findAuditLogsByIssueIdPaginated as jest.Mock).mockReturnValue(mockAuditLogs);

      const result = await getAuditLogsForIssue('project-1', 'issue-1', 20, 0);

      expect(result).toEqual({
        items: [
          {
            id: 'audit-1',
            action: 'ISSUE_CREATED',
            actorId: 'user-1',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'audit-2',
            action: 'ISSUE_STATUS_CHANGED',
            actorId: 'user-1',
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ],
        total: 2,
      });
      expect(requireProjectMember).toHaveBeenCalledWith('project-1');
      expect(findIssueById).toHaveBeenCalledWith(mockDb, 'issue-1');
      expect(countAuditLogsByIssueId).toHaveBeenCalledWith(mockDb, 'issue-1');
      expect(findAuditLogsByIssueIdPaginated).toHaveBeenCalledWith(mockDb, 'issue-1', 20, 0);
    });

    it('should use default pagination values when not provided', async () => {
      (requireProjectMember as jest.Mock).mockResolvedValue(undefined);
      (findIssueById as jest.Mock).mockReturnValue(mockIssue);
      (countAuditLogsByIssueId as jest.Mock).mockReturnValue(2);
      (findAuditLogsByIssueIdPaginated as jest.Mock).mockReturnValue(mockAuditLogs);

      await getAuditLogsForIssue('project-1', 'issue-1');

      expect(findAuditLogsByIssueIdPaginated).toHaveBeenCalledWith(mockDb, 'issue-1', 20, 0);
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      const mockError = new ForbiddenError('You do not have access to this project');
      (requireProjectMember as jest.Mock).mockRejectedValue(mockError);

      await expect(getAuditLogsForIssue('project-1', 'issue-1')).rejects.toThrow(
        ForbiddenError
      );
      expect(requireProjectMember).toHaveBeenCalledWith('project-1');
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      (requireProjectMember as jest.Mock).mockResolvedValue(undefined);
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
      (requireProjectMember as jest.Mock).mockResolvedValue(undefined);
      (findIssueById as jest.Mock).mockReturnValue(issueFromDifferentProject);

      await expect(getAuditLogsForIssue('project-1', 'issue-1')).rejects.toThrow(
        NotFoundError
      );
      expect(findIssueById).toHaveBeenCalledWith(mockDb, 'issue-1');
    });

    it('should return empty items array when no audit logs exist', async () => {
      (requireProjectMember as jest.Mock).mockResolvedValue(undefined);
      (findIssueById as jest.Mock).mockReturnValue(mockIssue);
      (countAuditLogsByIssueId as jest.Mock).mockReturnValue(0);
      (findAuditLogsByIssueIdPaginated as jest.Mock).mockReturnValue([]);

      const result = await getAuditLogsForIssue('project-1', 'issue-1', 20, 0);

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    it('should transform audit logs to simplified output format', async () => {
      (requireProjectMember as jest.Mock).mockResolvedValue(undefined);
      (findIssueById as jest.Mock).mockReturnValue(mockIssue);
      (countAuditLogsByIssueId as jest.Mock).mockReturnValue(1);
      (findAuditLogsByIssueIdPaginated as jest.Mock).mockReturnValue([mockAuditLogs[0]]);

      const result = await getAuditLogsForIssue('project-1', 'issue-1', 20, 0);

      expect(result.items[0]).toEqual({
        id: 'audit-1',
        action: 'ISSUE_CREATED',
        actorId: 'user-1',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result.items[0]).not.toHaveProperty('fromStatus');
      expect(result.items[0]).not.toHaveProperty('toStatus');
      expect(result.items[0]).not.toHaveProperty('issueId');
      expect(result.items[0]).not.toHaveProperty('projectId');
    });
  });
});
