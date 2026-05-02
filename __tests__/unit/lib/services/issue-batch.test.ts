import { batchUpdateIssues } from '@/lib/services/issue';
import { getDb } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateTransitionError,
} from '@/lib/errors';
import type { BatchUpdateIssuesInput } from '@/lib/validators/issue';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
  executeInTransactionAsync: jest.fn((db, callback) => callback(db)),
}));

jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/issues', () => ({
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

jest.mock('@/lib/db/project-members', () => ({
  isProjectMember: jest.fn(() => true),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockRequireAuthenticatedUser = requireAuthenticatedUser as jest.MockedFunction<typeof requireAuthenticatedUser>;

import { findIssueById, updateIssue } from '@/lib/db/issues';
import { findUserById } from '@/lib/db/users';
import { createIssueAuditLog } from '@/lib/db/issue-audit-logs';
import { isProjectMember } from '@/lib/db/project-members';

const mockFindIssueById = findIssueById as jest.MockedFunction<typeof findIssueById>;
const mockUpdateIssue = updateIssue as jest.MockedFunction<typeof updateIssue>;
const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;
const mockCreateIssueAuditLog = createIssueAuditLog as jest.MockedFunction<typeof createIssueAuditLog>;
const mockIsProjectMember = isProjectMember as jest.MockedFunction<typeof isProjectMember>;

describe('Issue Batch Operations', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockIssue1 = {
    id: 'issue-1',
    projectId: 'project-123',
    title: 'First Issue',
    description: 'Description 1',
    status: 'OPEN',
    closeReason: null,
    createdById: 'user-123',
    assigneeId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockIssue2 = {
    id: 'issue-2',
    projectId: 'project-123',
    title: 'Second Issue',
    description: 'Description 2',
    status: 'OPEN',
    closeReason: null,
    createdById: 'user-123',
    assigneeId: 'user-456',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockIssue3 = {
    id: 'issue-3',
    projectId: 'project-123',
    title: 'Third Issue',
    description: 'Description 3',
    status: 'CLOSED',
    closeReason: 'COMPLETED',
    createdById: 'user-123',
    assigneeId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockAssignee = {
    id: 'user-789',
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
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockIsProjectMember.mockReturnValue(true);

    // Default mock implementation for updateIssue
    mockUpdateIssue.mockImplementation((db, id, fields) => ({
      id,
      projectId: 'project-123',
      title: 'Updated Issue',
      description: null,
      status: fields.status || 'OPEN',
      closeReason: fields.closeReason || null,
      createdById: 'user-123',
      assigneeId: fields.assigneeId !== undefined ? fields.assigneeId : null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }));
  });

  describe('batchUpdateIssues - State Updates', () => {
    it('should batch update issue states successfully', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1', 'issue-2'],
        state: 'CLOSED',
      };

      // Clear previous mocks and set up fresh
      mockFindIssueById.mockClear();
      mockFindIssueById.mockImplementation((db, id) => {
        if (id === 'issue-1') return mockIssue1;
        if (id === 'issue-2') return mockIssue2;
        return null;
      });

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 2,
      });
      expect(mockCreateIssueAuditLog).toHaveBeenCalledTimes(2);
    });

    it('should reopen multiple issues successfully', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-3'],
        state: 'OPEN',
      };

      mockFindIssueById.mockReturnValue(mockIssue3);

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 1,
      });
      expect(mockCreateIssueAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'ISSUE_STATUS_CHANGED',
          fromStatus: 'CLOSED',
          toStatus: 'OPEN',
        })
      );
    });

    it('should throw InvalidStateTransitionError for invalid transitions', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-3'],
        state: 'CLOSED',
      };

      mockFindIssueById.mockReturnValue(mockIssue3);

      await expect(batchUpdateIssues(input)).rejects.toThrow(InvalidStateTransitionError);
    });
  });

  describe('batchUpdateIssues - Assignee Updates', () => {
    it('should batch update assignees successfully', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1', 'issue-3'],
        assigneeId: 'user-789',
      };

      mockFindIssueById.mockClear();
      mockFindIssueById.mockImplementation((db, id) => {
        if (id === 'issue-1') return mockIssue1;
        if (id === 'issue-3') return mockIssue3;
        return null;
      });

      mockFindUserById.mockReturnValue(mockAssignee);
      mockIsProjectMember.mockReturnValue(true);

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 2,
      });
      expect(mockCreateIssueAuditLog).toHaveBeenCalledTimes(2);
    });

    it('should clear assignees when set to null', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-2'],
        assigneeId: null,
      };

      mockFindIssueById.mockReturnValue(mockIssue2);

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 1,
      });
      expect(mockCreateIssueAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'ISSUE_ASSIGNEE_CHANGED',
          fromAssigneeId: 'user-456',
          toAssigneeId: null,
        })
      );
    });

    it('should throw NotFoundError when assignee does not exist', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1'],
        assigneeId: 'non-existent-user',
      };

      mockFindIssueById.mockReturnValue(mockIssue1);
      mockFindUserById.mockReturnValue(null);

      await expect(batchUpdateIssues(input)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when assignee is not project member', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1'],
        assigneeId: 'user-789',
      };

      mockFindIssueById.mockReturnValue(mockIssue1);
      mockFindUserById.mockReturnValue(mockAssignee);
      mockIsProjectMember.mockReturnValue(false);

      await expect(batchUpdateIssues(input)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('batchUpdateIssues - Mixed Updates', () => {
    it('should update both state and assignee in single batch', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1'],
        state: 'CLOSED',
        assigneeId: 'user-789',
      };

      mockFindIssueById.mockReturnValue(mockIssue1);
      mockFindUserById.mockReturnValue(mockAssignee);
      mockIsProjectMember.mockReturnValue(true);

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 1,
      });
      expect(mockCreateIssueAuditLog).toHaveBeenCalledTimes(2); // One for state, one for assignee
    });
  });

  describe('batchUpdateIssues - Permission Control', () => {
    it('should throw ForbiddenError when user lacks access to issue', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1'],
        state: 'CLOSED',
      };

      mockFindIssueById.mockReturnValue(mockIssue1);
      mockIsProjectMember.mockReturnValue(false);

      await expect(batchUpdateIssues(input)).rejects.toThrow(ForbiddenError);
    });

    it('should validate access for each issue individually', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1', 'issue-2'],
        state: 'CLOSED',
      };

      mockFindIssueById.mockClear();
      mockFindIssueById.mockImplementation((db, id) => {
        if (id === 'issue-1') return mockIssue1;
        if (id === 'issue-2') return mockIssue2;
        return null;
      });

      mockIsProjectMember.mockClear();
      mockIsProjectMember.mockReturnValue(true); // All tests pass for access

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 2,
      });
    });
  });

  describe('batchUpdateIssues - Error Handling', () => {
    it('should throw NotFoundError when issue does not exist', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['non-existent-issue'],
        state: 'CLOSED',
      };

      mockFindIssueById.mockReturnValue(null);

      await expect(batchUpdateIssues(input)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when issueIds is empty', async () => {
      const input = {
        issueIds: [],
        state: 'CLOSED',
      } as BatchUpdateIssuesInput;

      // This should be caught by schema validation before reaching service
      const { batchUpdateIssuesSchema } = await import('@/lib/validators/issue');
      expect(() => batchUpdateIssuesSchema.parse(input)).toThrow();
    });

    it('should fail when no update fields are provided', async () => {
      const input = {
        issueIds: ['issue-1'],
      } as BatchUpdateIssuesInput;

      // This should be caught by schema validation before reaching service
      const { batchUpdateIssuesSchema } = await import('@/lib/validators/issue');
      expect(() => batchUpdateIssuesSchema.parse(input)).toThrow();
    });
  });

  describe('batchUpdateIssues - Edge Cases', () => {
    it('should handle single issue in batch', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1'],
        state: 'CLOSED',
      };

      mockFindIssueById.mockReturnValue(mockIssue1);

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 1,
      });
    });

    it('should handle multiple issues from different projects', async () => {
      const mockIssueFromOtherProject = {
        ...mockIssue1,
        id: 'issue-4',
        projectId: 'project-456',
      };

      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-1', 'issue-4'],
        state: 'CLOSED',
      };

      mockFindIssueById.mockClear();
      mockFindIssueById.mockImplementation((db, id) => {
        if (id === 'issue-1') return mockIssue1;
        if (id === 'issue-4') return mockIssueFromOtherProject;
        return null;
      });

      mockIsProjectMember.mockReturnValue(true);

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 2,
      });
    });

    it('should not write audit logs when values do not change', async () => {
      const input: BatchUpdateIssuesInput = {
        issueIds: ['issue-3'],
        assigneeId: null,
      };

      mockFindIssueById.mockReturnValue(mockIssue3);

      const result = await batchUpdateIssues(input);

      expect(result).toEqual({
        success: true,
        updatedCount: 1,
      });
      // Should not write audit log since assignee was already null
      expect(mockCreateIssueAuditLog).not.toHaveBeenCalled();
    });
  });
});
