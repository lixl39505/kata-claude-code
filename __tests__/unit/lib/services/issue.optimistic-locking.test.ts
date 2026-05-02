import {
  updateIssue,
  updateIssueState,
  updateIssueAssignee,
} from '@/lib/services/issue';
import { getDb } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import {
  ConflictError,
} from '@/lib/errors';
import type { UpdateIssueInput, UpdateIssueStateInput, UpdateIssueAssigneeInput } from '@/lib/validators/issue';

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
  findIssuesWithFilters: jest.fn(),
  countIssuesWithFilters: jest.fn(),
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

jest.mock('@/lib/db/project-members', () => ({
  isProjectMember: jest.fn(() => true),
}));

jest.mock('@/lib/services/notification', () => ({
  createAssigneeChangedNotification: jest.fn(),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockRequireAuthenticatedUser = requireAuthenticatedUser as jest.MockedFunction<typeof requireAuthenticatedUser>;

import {
  findIssueById,
  updateIssue as updateIssueDb,
} from '@/lib/db/issues';
import { findProjectById } from '@/lib/db/projects';
import { findUserById } from '@/lib/db/users';
import { isProjectMember } from '@/lib/db/project-members';

const mockFindIssueById = findIssueById as jest.MockedFunction<typeof findIssueById>;
const mockUpdateIssueDb = updateIssueDb as jest.MockedFunction<typeof updateIssueDb>;
const mockFindProjectById = findProjectById as jest.MockedFunction<typeof findProjectById>;
const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;
const mockIsProjectMember = isProjectMember as jest.MockedFunction<typeof isProjectMember>;

describe('Issue Optimistic Locking', () => {
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
    mockIsProjectMember.mockReturnValue(true);
  });

  describe('updateIssue with optimistic locking', () => {
    it('should update issue title when expectedUpdatedAt matches', async () => {
      const input: UpdateIssueInput = {
        title: 'Updated title',
        expectedUpdatedAt: '2024-01-01T00:00:00.000Z',
      };

      const currentIssue = {
        ...mockIssue,
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const updatedIssue = {
        ...currentIssue,
        title: 'Updated title',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockReturnValue(updatedIssue);

      const result = await updateIssue('project-123', 'issue-123', input);

      expect(result.title).toBe('Updated title');
      expect(mockUpdateIssueDb).toHaveBeenCalledWith(
        mockDb,
        'issue-123',
        { title: 'Updated title' },
        '2024-01-01T00:00:00.000Z'
      );
    });

    it('should throw ConflictError when expectedUpdatedAt does not match', async () => {
      const input: UpdateIssueInput = {
        title: 'Updated title',
        expectedUpdatedAt: '2024-01-01T00:00:00.000Z',
      };

      const currentIssue = {
        ...mockIssue,
        updatedAt: '2024-01-02T00:00:00.000Z', // Different timestamp
      };

      const conflictError = new Error('Issue has been modified by another user') as Error & { code: string; currentIssue: typeof currentIssue };
      conflictError.code = 'CONFLICT';
      conflictError.currentIssue = currentIssue;

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockImplementation(() => {
        throw conflictError;
      });

      await expect(updateIssue('project-123', 'issue-123', input)).rejects.toThrow(
        ConflictError
      );
      await expect(updateIssue('project-123', 'issue-123', input)).rejects.toThrow(
        'Issue has been modified by another user. Please refresh and try again.'
      );
    });
  });

  describe('updateIssueState with optimistic locking', () => {
    it('should update state when expectedUpdatedAt matches', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
        expectedUpdatedAt: '2024-01-01T00:00:00.000Z',
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

      expect(result.status).toBe('CLOSED');
      expect(mockUpdateIssueDb).toHaveBeenCalledWith(
        mockDb,
        'issue-123',
        { status: 'CLOSED', closeReason: 'COMPLETED' },
        '2024-01-01T00:00:00.000Z'
      );
    });

    it('should throw ConflictError when expectedUpdatedAt does not match for state update', async () => {
      const input: UpdateIssueStateInput = {
        state: 'CLOSED',
        expectedUpdatedAt: '2024-01-01T00:00:00.000Z',
      };

      const currentIssue = {
        ...mockIssue,
        status: 'OPEN',
        closeReason: null,
        updatedAt: '2024-01-02T00:00:00.000Z', // Different timestamp
      };

      const conflictError = new Error('Issue has been modified by another user') as Error & { code: string; currentIssue: typeof currentIssue };
      conflictError.code = 'CONFLICT';
      conflictError.currentIssue = currentIssue;

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockImplementation(() => {
        throw conflictError;
      });

      await expect(updateIssueState('project-123', 'issue-123', input)).rejects.toThrow(
        ConflictError
      );
      await expect(updateIssueState('project-123', 'issue-123', input)).rejects.toThrow(
        'Issue has been modified by another user. Please refresh and try again.'
      );
    });
  });

  describe('updateIssueAssignee with optimistic locking', () => {
    it('should update assignee when expectedUpdatedAt matches', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
        expectedUpdatedAt: '2024-01-01T00:00:00.000Z',
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: null,
        updatedAt: '2024-01-01T00:00:00.000Z',
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

      expect(result.assigneeId).toBe('user-456');
      expect(mockUpdateIssueDb).toHaveBeenCalledWith(
        mockDb,
        'issue-123',
        { assigneeId: 'user-456' },
        '2024-01-01T00:00:00.000Z'
      );
    });

    it('should throw ConflictError when expectedUpdatedAt does not match for assignee update', async () => {
      const input: UpdateIssueAssigneeInput = {
        assigneeId: 'user-456',
        expectedUpdatedAt: '2024-01-01T00:00:00.000Z',
      };

      const currentIssue = {
        ...mockIssue,
        assigneeId: null,
        updatedAt: '2024-01-02T00:00:00.000Z', // Different timestamp
      };

      const conflictError = new Error('Issue has been modified by another user') as Error & { code: string; currentIssue: typeof currentIssue };
      conflictError.code = 'CONFLICT';
      conflictError.currentIssue = currentIssue;

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(currentIssue);
      mockUpdateIssueDb.mockImplementation(() => {
        throw conflictError;
      });

      await expect(updateIssueAssignee('project-123', 'issue-123', input)).rejects.toThrow(
        ConflictError
      );
      await expect(updateIssueAssignee('project-123', 'issue-123', input)).rejects.toThrow(
        'Issue has been modified by another user. Please refresh and try again.'
      );
    });
  });
});
