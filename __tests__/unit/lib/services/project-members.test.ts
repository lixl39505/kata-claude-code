import {
  addProjectMember,
  removeProjectMember,
  listProjectMembers,
  isProjectMember,
  isProjectOwner,
} from '@/lib/services/project-members';
import { getDb } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@/lib/errors/helpers';
import type { AddProjectMemberInput } from '@/lib/validators/project-members';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/db/transaction', () => ({
  executeInTransactionAsync: jest.fn((db, callback) => callback(db)),
}));

jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/projects', () => ({
  findProjectById: jest.fn(),
}));

jest.mock('@/lib/db/users', () => ({
  findUserById: jest.fn(),
}));

jest.mock('@/lib/db/project-members', () => ({
  addProjectMember: jest.fn(),
  removeProjectMember: jest.fn(),
  findProjectMember: jest.fn(),
  findProjectMembersWithDetails: jest.fn(),
  countProjectOwners: jest.fn(),
  isProjectMember: jest.fn(),
  isProjectOwner: jest.fn(),
  findUnclosedIssuesByAssigneeInProject: jest.fn(),
  findProjectIdsByUserId: jest.fn(),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockRequireAuthenticatedUser = requireAuthenticatedUser as jest.MockedFunction<typeof requireAuthenticatedUser>;

import { findProjectById } from '@/lib/db/projects';
import { findUserById } from '@/lib/db/users';
import {
  removeProjectMember as removeProjectMemberDb,
  findProjectMember,
  findProjectMembersWithDetails,
  countProjectOwners,
  isProjectMember as isProjectMemberDb,
  isProjectOwner as isProjectOwnerDb,
  findUnclosedIssuesByAssigneeInProject,
} from '@/lib/db/project-members';

const mockFindProjectById = findProjectById as jest.MockedFunction<typeof findProjectById>;
const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;
const mockRemoveProjectMemberDb = removeProjectMemberDb as jest.MockedFunction<typeof removeProjectMemberDb>;
const mockFindProjectMember = findProjectMember as jest.MockedFunction<typeof findProjectMember>;
const mockFindProjectMembersWithDetails = findProjectMembersWithDetails as jest.MockedFunction<typeof findProjectMembersWithDetails>;
const mockCountProjectOwners = countProjectOwners as jest.MockedFunction<typeof countProjectOwners>;
const mockIsProjectMemberDb = isProjectMemberDb as jest.MockedFunction<typeof isProjectMemberDb>;
const mockIsProjectOwnerDb = isProjectOwnerDb as jest.MockedFunction<typeof isProjectOwnerDb>;
const mockFindUnclosedIssuesByAssigneeInProject = findUnclosedIssuesByAssigneeInProject as jest.MockedFunction<typeof findUnclosedIssuesByAssigneeInProject>;

describe('Project Members Service', () => {
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

  const mockMemberDetails = {
    id: 'member-123',
    projectId: 'project-123',
    userId: 'user-456',
    role: 'MEMBER' as const,
    displayName: 'Another User',
    email: 'another@example.com',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockDb = {} as ReturnType<typeof getDb>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockReturnValue(mockDb);
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
  });

  describe('addProjectMember', () => {
    it('should add member when user is owner', async () => {
      const input: AddProjectMemberInput = {
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(true);
      mockFindUserById.mockReturnValue({ ...mockUser, id: 'user-456', passwordHash: 'hash' });
      mockFindProjectMember.mockReturnValue(null);
      mockFindProjectMembersWithDetails.mockReturnValue([mockMemberDetails]);

      const result = await addProjectMember('project-123', input);

      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindUserById).toHaveBeenCalledWith(mockDb, 'user-456');
      expect(mockFindProjectMember).toHaveBeenCalledWith(mockDb, 'project-123', 'user-456');
      expect(result).toEqual(mockMemberDetails);
    });

    it('should throw ForbiddenError when user is not owner', async () => {
      const input: AddProjectMemberInput = {
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(false);

      await expect(addProjectMember('project-123', input)).rejects.toThrow(ForbiddenError);
      await expect(addProjectMember('project-123', input)).rejects.toThrow('Only project owners can add members');
    });

    it('should throw NotFoundError when project does not exist', async () => {
      const input: AddProjectMemberInput = {
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockFindProjectById.mockReturnValue(null);

      await expect(addProjectMember('project-123', input)).rejects.toThrow(NotFoundError);
      await expect(addProjectMember('project-123', input)).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError when user to add does not exist', async () => {
      const input: AddProjectMemberInput = {
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(true);
      mockFindUserById.mockReturnValue(null);

      await expect(addProjectMember('project-123', input)).rejects.toThrow(NotFoundError);
      await expect(addProjectMember('project-123', input)).rejects.toThrow('User not found');
    });

    it('should throw ConflictError when user is already a member', async () => {
      const input: AddProjectMemberInput = {
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(true);
      mockFindUserById.mockReturnValue({ ...mockUser, id: 'user-456', passwordHash: 'hash' });
      mockFindProjectMember.mockReturnValue(mockMemberDetails);

      await expect(addProjectMember('project-123', input)).rejects.toThrow(ConflictError);
      await expect(addProjectMember('project-123', input)).rejects.toThrow('User is already a member of this project');
    });
  });

  describe('removeProjectMember', () => {
    it('should remove member successfully', async () => {
      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(true);
      mockFindProjectMember.mockReturnValue(mockMemberDetails);
      mockCountProjectOwners.mockReturnValue(2);
      mockFindUnclosedIssuesByAssigneeInProject.mockReturnValue(0);
      mockRemoveProjectMemberDb.mockReturnValue(true);

      const result = await removeProjectMember('project-123', 'user-456');

      expect(result).toEqual({ success: true });
      expect(mockRemoveProjectMemberDb).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not owner', async () => {
      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(false);

      await expect(removeProjectMember('project-123', 'user-456')).rejects.toThrow(ForbiddenError);
      await expect(removeProjectMember('project-123', 'user-456')).rejects.toThrow('Only project owners can remove members');
    });

    it('should throw NotFoundError when member does not exist', async () => {
      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(true);
      mockFindProjectMember.mockReturnValue(null);

      await expect(removeProjectMember('project-123', 'user-456')).rejects.toThrow(NotFoundError);
      await expect(removeProjectMember('project-123', 'user-456')).rejects.toThrow('Member not found');
    });

    it('should throw ValidationError when removing last owner', async () => {
      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(true);
      mockFindProjectMember.mockReturnValue({
        ...mockMemberDetails,
        role: 'OWNER',
      });
      mockCountProjectOwners.mockReturnValue(1);

      await expect(removeProjectMember('project-123', 'user-456')).rejects.toThrow(ValidationError);
      await expect(removeProjectMember('project-123', 'user-456')).rejects.toThrow('Cannot remove the last owner of a project');
    });

    it('should throw ValidationError when member has unclosed issues', async () => {
      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectOwnerDb.mockReturnValue(true);
      mockFindProjectMember.mockReturnValue(mockMemberDetails);
      mockCountProjectOwners.mockReturnValue(2);
      mockFindUnclosedIssuesByAssigneeInProject.mockReturnValue(3);

      await expect(removeProjectMember('project-123', 'user-456')).rejects.toThrow(ValidationError);
      await expect(removeProjectMember('project-123', 'user-456')).rejects.toThrow('Cannot remove member with 3 unclosed issue(s) assigned');
    });
  });

  describe('listProjectMembers', () => {
    it('should list all members for project member', async () => {
      const mockMembers = [
        mockMemberDetails,
        {
          ...mockMemberDetails,
          id: 'member-456',
          userId: 'user-789',
          displayName: 'Third User',
          email: 'third@example.com',
        },
      ];

      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectMemberDb.mockReturnValue(true);
      mockFindProjectMembersWithDetails.mockReturnValue(mockMembers);

      const result = await listProjectMembers('project-123');

      expect(result).toEqual({
        items: mockMembers,
        total: 2,
      });
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockFindProjectById.mockReturnValue(null);

      await expect(listProjectMembers('project-123')).rejects.toThrow(NotFoundError);
      await expect(listProjectMembers('project-123')).rejects.toThrow('Project not found');
    });

    it('should throw ForbiddenError when user is not a member', async () => {
      mockFindProjectById.mockReturnValue(mockProject);
      mockIsProjectMemberDb.mockReturnValue(false);

      await expect(listProjectMembers('project-123')).rejects.toThrow(ForbiddenError);
      await expect(listProjectMembers('project-123')).rejects.toThrow('You do not have access to this project');
    });
  });

  describe('isProjectMember', () => {
    it('should return true for members', () => {
      mockIsProjectMemberDb.mockReturnValue(true);

      const result = isProjectMember('project-123', 'user-123');
      expect(result).toBe(true);
    });

    it('should return false for non-members', () => {
      mockIsProjectMemberDb.mockReturnValue(false);

      const result = isProjectMember('project-123', 'user-123');
      expect(result).toBe(false);
    });
  });

  describe('isProjectOwner', () => {
    it('should return true for owners', () => {
      mockIsProjectOwnerDb.mockReturnValue(true);

      const result = isProjectOwner('project-123', 'user-123');
      expect(result).toBe(true);
    });

    it('should return false for non-owners', () => {
      mockIsProjectOwnerDb.mockReturnValue(false);

      const result = isProjectOwner('project-123', 'user-123');
      expect(result).toBe(false);
    });
  });
});
