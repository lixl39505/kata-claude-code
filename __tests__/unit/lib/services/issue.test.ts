import {
  createIssueInProject,
  listIssuesForProject,
  getIssueByIdForProject,
  updateIssueState,
  updateIssueAssignee,
} from '@/lib/services/issue';
import { getDb } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import {
  UnauthenticatedError,
  NotFoundError,
  InvalidStateTransitionError,
} from '@/lib/errors/helpers';
import type { CreateIssueInput, UpdateIssueStateInput, UpdateIssueAssigneeInput } from '@/lib/validators/issue';

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

jest.mock('@/lib/db/users', () => ({
  findUserById: jest.fn(),
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
import { findUserById } from '@/lib/db/users';
import { createIssueAuditLog } from '@/lib/db/issue-audit-logs';

const mockCreateIssueDb = createIssueDb as jest.MockedFunction<typeof createIssueDb>;
const mockFindIssuesByProjectId = findIssuesByProjectId as jest.MockedFunction<typeof findIssuesByProjectId>;
const mockFindIssueById = findIssueById as jest.MockedFunction<typeof findIssueById>;
const mockUpdateIssueDb = updateIssueDb as jest.MockedFunction<typeof updateIssueDb>;
const mockFindProjectById = findProjectById as jest.MockedFunction<typeof findProjectById>;
const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;
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
    closeReason: null,
    createdById: 'user-123',
    assigneeId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockAssignee = {
    id: 'user-456',
    email: 'assignee@example.com',
    passwordHash: 'hashed-password',
    name: 'Assignee User',
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

  describe('updateIssueState', () => {
    it('should allow OPEN → CLOSED transition', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueState('project-123', 'issue-123', input);

      expect(result.status).toBe('CLOSED');
      expect(result.closeReason).toBe('COMPLETED');
      expect(mockUpdateIssueDb).toHaveBeenCalledWith(mockDb, 'issue-123', {
        status: 'CLOSED',
        closeReason: 'COMPLETED',
      });
    });

    it('should allow OPEN → CLOSED transition with explicit closeReason', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
        closeReason: 'NOT_PLANNED',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'CLOSED',
        closeReason: 'NOT_PLANNED',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueState('project-123', 'issue-123', input);

      expect(result.status).toBe('CLOSED');
      expect(result.closeReason).toBe('NOT_PLANNED');
    });

    it('should allow CLOSED → OPEN transition', async () => {
      const input: UpdateIssueStateInput = {
        state: 'OPEN',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'OPEN',
        closeReason: null,
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueState('project-123', 'issue-123', input);

      expect(result.status).toBe('OPEN');
      expect(result.closeReason).toBeNull();
    });

    it('should default closeReason to COMPLETED when not provided', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueState('project-123', 'issue-123', input);

      expect(result.closeReason).toBe('COMPLETED');
    });

    it('should reject CLOSED → CLOSED transition (same state)', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);

      await expect(
        updateIssueState('project-123', 'issue-123', input)
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it('should reject OPEN → OPEN transition (same state)', async () => {
      const input: UpdateIssueStateInput = {
        state: 'OPEN',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);

      await expect(
        updateIssueState('project-123', 'issue-123', input)
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(
        updateIssueState('project-123', 'issue-123', input)
      ).rejects.toThrow(UnauthenticatedError);
    });

    it('should throw NotFoundError when project does not exist', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(
        updateIssueState('non-existent-project', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when project belongs to different user', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      const otherUsersProject = {
        ...mockProject,
        ownerId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(otherUsersProject);

      await expect(
        updateIssueState('project-123', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(null);

      await expect(
        updateIssueState('project-123', 'non-existent-issue', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when issue belongs to different project', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      const otherProjectsIssue = {
        ...mockIssue,
        projectId: 'project-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(otherProjectsIssue);

      await expect(
        updateIssueState('project-123', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should update updated_at timestamp', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueState('project-123', 'issue-123', input);

      expect(result.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should return updated issue with new state', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
        closeReason: 'DUPLICATE',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'CLOSED',
        closeReason: 'DUPLICATE',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueState('project-123', 'issue-123', input);

      expect(result).toEqual(updatedIssue);
      expect(result.status).toBe('CLOSED');
      expect(result.closeReason).toBe('DUPLICATE');
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
        fromAssigneeId: null,
        toAssigneeId: null,
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
        fromAssigneeId: null,
        toAssigneeId: null,
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

  describe('updateIssueState with audit logging', () => {
    it('should create audit log when state changes', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'CLOSED',
        closeReason: 'COMPLETED',
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
        toStatus: 'CLOSED',
        fromAssigneeId: null,
        toAssigneeId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      await updateIssueState('project-123', 'issue-123', input);

      expect(mockCreateIssueAuditLog).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          issueId: 'issue-123',
          projectId: 'project-123',
          actorId: 'user-123',
          action: 'ISSUE_STATUS_CHANGED',
          fromStatus: 'OPEN',
          toStatus: 'CLOSED',
        })
      );
    });

    it('should have correct fromStatus and toStatus in audit log', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
        closeReason: 'NOT_PLANNED',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
      };

      const updatedIssue = {
        ...currentIssue,
        status: 'CLOSED',
        closeReason: 'NOT_PLANNED',
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
        toStatus: 'CLOSED',
        fromAssigneeId: null,
        toAssigneeId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      await updateIssueState('project-123', 'issue-123', input);

      expect(mockCreateIssueAuditLog).toHaveBeenCalledTimes(1);
      const auditCallArgs = mockCreateIssueAuditLog.mock.calls[0];
      expect(auditCallArgs[1]).toMatchObject({
        action: 'ISSUE_STATUS_CHANGED',
        fromStatus: 'OPEN',
        toStatus: 'CLOSED',
      });
    });
  });

  describe('updateIssueAssignee', () => {
    it('should set assignee when user exists', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: null,
      };

      const updatedIssue = {
        ...currentIssue,
        assigneeId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockFindUserById.mockReturnValue(mockAssignee);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueAssignee('project-123', 'issue-123', input);

      expect(result.assigneeId).toBe('user-456');
      expect(mockFindUserById).toHaveBeenCalledWith(mockDb, 'user-456');
      expect(mockUpdateIssueDb).toHaveBeenCalledWith(mockDb, 'issue-123', {
        assigneeId: 'user-456',
      });
    });

    it('should modify assignee when assignee already exists', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: 'user-789',
      };

      const newAssignee = {
        ...mockAssignee,
        id: 'user-456',
      };

      const updatedIssue = {
        ...currentIssue,
        assigneeId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockFindUserById.mockReturnValue(newAssignee);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueAssignee('project-123', 'issue-123', input);

      expect(result.assigneeId).toBe('user-456');
      expect(mockUpdateIssueDb).toHaveBeenCalledWith(mockDb, 'issue-123', {
        assigneeId: 'user-456',
      });
    });

    it('should clear assignee when set to null', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: null,
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: 'user-456',
      };

      const updatedIssue = {
        ...currentIssue,
        assigneeId: null,
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueAssignee('project-123', 'issue-123', input);

      expect(result.assigneeId).toBeNull();
      expect(mockFindUserById).not.toHaveBeenCalled();
      expect(mockUpdateIssueDb).toHaveBeenCalledWith(mockDb, 'issue-123', {
        assigneeId: null,
      });
    });

    it('should throw NotFoundError when assignee user does not exist', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'non-existent-user',
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: null,
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockFindUserById.mockReturnValue(null);

      await expect(
        updateIssueAssignee('project-123', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
      await expect(
        updateIssueAssignee('project-123', 'issue-123', input)
      ).rejects.toThrow('Assignee not found');
    });

    it('should throw NotFoundError when project does not exist', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(
        updateIssueAssignee('non-existent-project', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
      await expect(
        updateIssueAssignee('non-existent-project', 'issue-123', input)
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError when project belongs to different user (cross-project)', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      const otherUsersProject = {
        ...mockProject,
        ownerId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(otherUsersProject);

      await expect(
        updateIssueAssignee('project-123', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(null);

      await expect(
        updateIssueAssignee('project-123', 'non-existent-issue', input)
      ).rejects.toThrow(NotFoundError);
      await expect(
        updateIssueAssignee('project-123', 'non-existent-issue', input)
      ).rejects.toThrow('Issue not found');
    });

    it('should throw NotFoundError when issue belongs to different project', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      const otherProjectsIssue = {
        ...mockIssue,
        projectId: 'project-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(otherProjectsIssue);

      await expect(
        updateIssueAssignee('project-123', 'issue-123', input)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(
        updateIssueAssignee('project-123', 'issue-123', input)
      ).rejects.toThrow(UnauthenticatedError);
    });

    it('should create audit log when assignee changes', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: 'user-789',
      };

      const updatedIssue = {
        ...currentIssue,
        assigneeId: 'user-456',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockFindUserById.mockReturnValue(mockAssignee);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);
      mockCreateIssueAuditLog.mockReturnValue({
        id: 'audit-1',
        issueId: 'issue-123',
        projectId: 'project-123',
        actorId: 'user-123',
        action: 'ISSUE_ASSIGNEE_CHANGED',
        fromStatus: null,
        toStatus: null,
        fromAssigneeId: 'user-789',
        toAssigneeId: 'user-456',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      await updateIssueAssignee('project-123', 'issue-123', input);

      expect(mockCreateIssueAuditLog).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          issueId: 'issue-123',
          projectId: 'project-123',
          actorId: 'user-123',
          action: 'ISSUE_ASSIGNEE_CHANGED',
          fromStatus: null,
          toStatus: null,
          fromAssigneeId: 'user-789',
          toAssigneeId: 'user-456',
        })
      );
    });

    it('should create audit log when clearing assignee', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: null,
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: 'user-456',
      };

      const updatedIssue = {
        ...currentIssue,
        assigneeId: null,
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
        action: 'ISSUE_ASSIGNEE_CHANGED',
        fromStatus: null,
        toStatus: null,
        fromAssigneeId: 'user-456',
        toAssigneeId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      await updateIssueAssignee('project-123', 'issue-123', input);

      expect(mockCreateIssueAuditLog).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          action: 'ISSUE_ASSIGNEE_CHANGED',
          fromAssigneeId: 'user-456',
          toAssigneeId: null,
        })
      );
    });

    it('should return updated issue with new assignee', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: null,
      };

      const updatedIssue = {
        ...currentIssue,
        assigneeId: 'user-456',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockFindUserById.mockReturnValue(mockAssignee);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssueAssignee('project-123', 'issue-123', input);

      expect(result).toEqual(updatedIssue);
      expect(result.assigneeId).toBe('user-456');
      expect(result.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });
  });
});
