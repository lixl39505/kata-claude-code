import {
  createIssueInProject,
  listIssuesForProject,
  getIssueByIdForProject,
} from '@/lib/services/issue';
import { getDb } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import {
  UnauthenticatedError,
  NotFoundError,
} from '@/lib/errors/helpers';
import type { CreateIssueInput } from '@/lib/validators/issue';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/issues', () => ({
  createIssue: jest.fn(),
  findIssuesByProjectId: jest.fn(),
  findIssueById: jest.fn(),
}));

jest.mock('@/lib/db/projects', () => ({
  findProjectById: jest.fn(),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockRequireAuthenticatedUser = requireAuthenticatedUser as jest.MockedFunction<typeof requireAuthenticatedUser>;

import {
  createIssue as createIssueDb,
  findIssuesByProjectId,
  findIssueById,
} from '@/lib/db/issues';
import { findProjectById } from '@/lib/db/projects';

const mockCreateIssueDb = createIssueDb as jest.MockedFunction<typeof createIssueDb>;
const mockFindIssuesByProjectId = findIssuesByProjectId as jest.MockedFunction<typeof findIssuesByProjectId>;
const mockFindIssueById = findIssueById as jest.MockedFunction<typeof findIssueById>;
const mockFindProjectById = findProjectById as jest.MockedFunction<typeof findProjectById>;

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
});
