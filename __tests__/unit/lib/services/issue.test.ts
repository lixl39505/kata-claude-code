import {
  createIssueInProject,
  listIssuesForProject,
  getIssueByIdForProject,
  updateIssueStatus,
} from '@/lib/services/issue';
import { getDb } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import {
  UnauthenticatedError,
  NotFoundError,
  InvalidStateTransitionError,
} from '@/lib/errors/helpers';
import type { CreateIssueInput, UpdateIssueStatusInput } from '@/lib/validators/issue';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
  executeInTransactionAsync: jest.fn((db, callback) => callback(db)),
}));

jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/issues', () => ({
  createIssue: jest.fn(),
  findIssuesByProjectId: jest.fn(),
  findIssueById: jest.fn(),
  updateIssue: jest.fn(),
}));

jest.mock('@/lib/db/projects', () => ({
  findProjectById: jest.fn(),
}));

jest.mock('@/lib/db/issue-audit-logs', () => ({
  createIssueAuditLog: jest.fn(),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockRequireAuthenticatedUser = requireAuthenticatedUser as jest.MockedFunction<typeof requireAuthenticatedUser>;

import {
  createIssue as createIssueDb,
  findIssuesByProjectId,
  findIssueById,
  updateIssue as updateIssueDb,
} from '@/lib/db/issues';
import { findProjectById } from '@/lib/db/projects';
import { createIssueAuditLog } from '@/lib/db/issue-audit-logs';

const mockCreateIssueDb = createIssueDb as jest.MockedFunction<typeof createIssueDb>;
const mockFindIssuesByProjectId = findIssuesByProjectId as jest.MockedFunction<typeof findIssuesByProjectId>;
const mockFindIssueById = findIssueById as jest.MockedFunction<typeof findIssueById>;
const mockUpdateIssueDb = updateIssueDb as jest.MockedFunction<typeof updateIssueDb>;
const mockFindProjectById = findProjectById as jest.MockedFunction<typeof findProjectById>;
const mockCreateIssueAuditLog = createIssueAuditLog as jest.MockedFunction<typeof createIssueAuditLog>;

describe('Issue Service', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockProject = {
    id: 'project-123',
    ownerId: 'user-123',
    name: 'Test Project',
    key: 'TEST',
    description: 'A test project',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockIssue = {
    id: 'issue-123',
    projectId: 'project-123',
    title: 'Fix login bug',
    description: 'Users cannot login',
    status: 'OPEN',
    createdById: 'user-123',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockDb = {} as ReturnType<typeof getDb>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockReturnValue(mockDb);
  });

  describe('createIssueInProject', () => {
    it('should create issue successfully for authenticated user', async () => {
      const input: CreateIssueInput = {
        title: 'Fix login bug',
        description: 'Users cannot login',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockCreateIssueDb.mockReturnValue(mockIssue);

      const result = await createIssueInProject('project-123', input);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockCreateIssueDb).toHaveBeenCalledWith(mockDb, {
        projectId: 'project-123',
        title: 'Fix login bug',
        description: 'Users cannot login',
        status: 'OPEN',
        createdById: 'user-123',
      });
      expect(result).toEqual(mockIssue);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      const input: CreateIssueInput = {
        title: 'Fix login bug',
      };

      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(createIssueInProject('project-123', input)).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it('should throw NotFoundError when project does not exist', async () => {
      const input: CreateIssueInput = {
        title: 'Fix login bug',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(createIssueInProject('non-existent-project', input)).rejects.toThrow(
        NotFoundError
      );
      await expect(createIssueInProject('non-existent-project', input)).rejects.toThrow(
        'Project not found'
      );
    });

    it('should throw NotFoundError when project belongs to different user', async () => {
      const input: CreateIssueInput = {
        title: 'Fix login bug',
      };

      const otherUsersProject = {
        ...mockProject,
        ownerId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(otherUsersProject);

      await expect(createIssueInProject('project-123', input)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should create issue with null description when not provided', async () => {
      const input: CreateIssueInput = {
        title: 'Fix login bug',
        description: null,
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockCreateIssueDb.mockReturnValue({
        ...mockIssue,
        description: null,
      });

      const result = await createIssueInProject('project-123', input);

      expect(mockCreateIssueDb).toHaveBeenCalledWith(mockDb, {
        projectId: 'project-123',
        title: 'Fix login bug',
        description: null,
        status: 'OPEN',
        createdById: 'user-123',
      });
      expect(result.description).toBeNull();
    });
  });

  describe('listIssuesForProject', () => {
    it('should return all issues for project owned by user', async () => {
      const mockIssues = [
        mockIssue,
        {
          ...mockIssue,
          id: 'issue-456',
          title: 'Another issue',
        },
      ];

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssuesByProjectId.mockReturnValue(mockIssues);

      const result = await listIssuesForProject('project-123');

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindIssuesByProjectId).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(result).toEqual(mockIssues);
    });

    it('should return empty array when project has no issues', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssuesByProjectId.mockReturnValue([]);

      const result = await listIssuesForProject('project-123');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(listIssuesForProject('non-existent-project')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError when project belongs to different user', async () => {
      const otherUsersProject = {
        ...mockProject,
        ownerId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(otherUsersProject);

      await expect(listIssuesForProject('project-123')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(listIssuesForProject('project-123')).rejects.toThrow(
        UnauthenticatedError
      );
    });
  });

  describe('getIssueByIdForProject', () => {
    it('should return issue when user owns project and issue belongs to project', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);

      const result = await getIssueByIdForProject('project-123', 'issue-123');

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindIssueById).toHaveBeenCalledWith(mockDb, 'issue-123');
      expect(result).toEqual(mockIssue);
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(
        getIssueByIdForProject('non-existent-project', 'issue-123')
      ).rejects.toThrow(NotFoundError);
      await expect(
        getIssueByIdForProject('non-existent-project', 'issue-123')
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError when project belongs to different user', async () => {
      const otherUsersProject = {
        ...mockProject,
        ownerId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(otherUsersProject);

      await expect(
        getIssueByIdForProject('project-123', 'issue-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(null);

      await expect(
        getIssueByIdForProject('project-123', 'non-existent-issue')
      ).rejects.toThrow(NotFoundError);
      await expect(
        getIssueByIdForProject('project-123', 'non-existent-issue')
      ).rejects.toThrow('Issue not found');
    });

    it('should throw NotFoundError when issue belongs to different project', async () => {
      const otherProjectsIssue = {
        ...mockIssue,
        projectId: 'project-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(otherProjectsIssue);

      await expect(
        getIssueByIdForProject('project-123', 'issue-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(
        getIssueByIdForProject('project-123', 'issue-123')
      ).rejects.toThrow(UnauthenticatedError);
    });
  });

  describe('updateIssueStatus', () => {
    it('should allow OPEN → IN_PROGRESS transition', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'IN_PROGRESS',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueStatus('project-123', 'issue-123', input);

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockUpdateIssueDb).toHaveBeenCalledWith(mockDb, 'issue-123', {
        status: 'IN_PROGRESS',
      });
    });

    it('should allow OPEN → DONE transition', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'DONE',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'DONE',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueStatus('project-123', 'issue-123', input);

      expect(result.status).toBe('DONE');
    });

    it('should allow IN_PROGRESS → DONE transition', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'DONE',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'IN_PROGRESS',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'DONE',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueStatus('project-123', 'issue-123', input);

      expect(result.status).toBe('DONE');
    });

    it('should allow IN_PROGRESS → OPEN transition', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'OPEN',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'IN_PROGRESS',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'OPEN',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueStatus('project-123', 'issue-123', input);

      expect(result.status).toBe('OPEN');
    });

    it('should allow DONE → OPEN transition', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'OPEN',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'DONE',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'OPEN',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueStatus('project-123', 'issue-123', input);

      expect(result.status).toBe('OPEN');
    });

    it('should reject DONE → IN_PROGRESS transition', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'DONE',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);

      await expect(
        updateIssueStatus('project-123', 'issue-123', input)
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(
        updateIssueStatus('project-123', 'issue-123', input)
      ).rejects.toThrow(UnauthenticatedError);
    });

    it('should throw NotFoundError when project does not exist', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(
        updateIssueStatus('non-existent-project', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when project belongs to different user', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      const otherUsersProject = {
        ...mockProject,
        ownerId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(otherUsersProject);

      await expect(
        updateIssueStatus('project-123', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(null);

      await expect(
        updateIssueStatus('project-123', 'non-existent-issue', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when issue belongs to different project', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      const otherProjectsIssue = {
        ...mockIssue,
        projectId: 'project-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(otherProjectsIssue);

      await expect(
        updateIssueStatus('project-123', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should update updated_at timestamp', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'IN_PROGRESS',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueStatus('project-123', 'issue-123', input);

      expect(result.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should return updated issue with new status', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'DONE',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'IN_PROGRESS',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'DONE',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueStatus('project-123', 'issue-123', input);

      expect(result).toEqual(updatedIssue);
      expect(result.status).toBe('DONE');
    });
  });

  describe('createIssueInProject with audit logging', () => {
    it('should create audit log when issue is created', async () => {
      const input: CreateIssueInput = {
        title: 'Fix login bug',
        description: 'Users cannot login',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockCreateIssueDb.mockReturnValue(mockIssue);
      mockCreateIssueAuditLog.mockReturnValue({
        id: 'audit-1',
        issueId: 'issue-123',
        projectId: 'project-123',
        actorId: 'user-123',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      await createIssueInProject('project-123', input);

      expect(mockCreateIssueAuditLog).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          issueId: 'issue-123',
          projectId: 'project-123',
          actorId: 'user-123',
          action: 'ISSUE_CREATED',
          fromStatus: null,
          toStatus: 'OPEN',
        })
      );
    });

    it('should have correct audit log data for issue creation', async () => {
      const input: CreateIssueInput = {
        title: 'Fix login bug',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockCreateIssueDb.mockReturnValue(mockIssue);
      mockCreateIssueAuditLog.mockReturnValue({
        id: 'audit-1',
        issueId: 'issue-123',
        projectId: 'project-123',
        actorId: 'user-123',
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      await createIssueInProject('project-123', input);

      expect(mockCreateIssueAuditLog).toHaveBeenCalledTimes(1);
      const auditCallArgs = mockCreateIssueAuditLog.mock.calls[0];
      expect(auditCallArgs[1]).toMatchObject({
        action: 'ISSUE_CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
      });
    });
  });

  describe('updateIssueStatus with audit logging', () => {
    it('should create audit log when status changes', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'IN_PROGRESS',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'IN_PROGRESS',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);
      mockCreateIssueAuditLog.mockReturnValue({
        id: 'audit-1',
        issueId: 'issue-123',
        projectId: 'project-123',
        actorId: 'user-123',
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'OPEN',
        toStatus: 'IN_PROGRESS',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      await updateIssueStatus('project-123', 'issue-123', input);

      expect(mockCreateIssueAuditLog).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          issueId: 'issue-123',
          projectId: 'project-123',
          actorId: 'user-123',
          action: 'ISSUE_STATUS_CHANGED',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
        })
      );
    });

    it('should have correct fromStatus and toStatus in audit log', async () => {
      const input: UpdateIssueStatusInput = {
        status: 'DONE',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'IN_PROGRESS',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'DONE',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);
      mockCreateIssueAuditLog.mockReturnValue({
        id: 'audit-1',
        issueId: 'issue-123',
        projectId: 'project-123',
        actorId: 'user-123',
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'IN_PROGRESS',
        toStatus: 'DONE',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      await updateIssueStatus('project-123', 'issue-123', input);

      expect(mockCreateIssueAuditLog).toHaveBeenCalledTimes(1);
      const auditCallArgs = mockCreateIssueAuditLog.mock.calls[0];
      expect(auditCallArgs[1]).toMatchObject({
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'IN_PROGRESS',
        toStatus: 'DONE',
      });
    });
  });
});
