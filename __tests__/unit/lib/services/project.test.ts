import {
  createProject,
  listProjectsForCurrentUser,
  getProjectByIdForCurrentUser,
} from '@/lib/services/project';
import { getDb } from '@/lib/db';
import {
  requireAuthenticatedUser,
} from '@/lib/services/auth';
import {
  UnauthenticatedError,
  NotFoundError,
  ConflictError,
} from '@/lib/errors/helpers';
import type { CreateProjectInput } from '@/lib/validators/project';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/projects', () => ({
  createProject: jest.fn(),
  findProjectById: jest.fn(),
  findProjectsByOwnerId: jest.fn(),
  findProjectByOwnerAndKey: jest.fn(),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockRequireAuthenticatedUser = requireAuthenticatedUser as jest.MockedFunction<typeof requireAuthenticatedUser>;

import {
  createProject as createProjectDb,
  findProjectById,
  findProjectsByOwnerId,
  findProjectByOwnerAndKey,
} from '@/lib/db/projects';

const mockCreateProjectDb = createProjectDb as jest.MockedFunction<typeof createProjectDb>;
const mockFindProjectById = findProjectById as jest.MockedFunction<typeof findProjectById>;
const mockFindProjectsByOwnerId = findProjectsByOwnerId as jest.MockedFunction<typeof findProjectsByOwnerId>;
const mockFindProjectByOwnerAndKey = findProjectByOwnerAndKey as jest.MockedFunction<typeof findProjectByOwnerAndKey>;

describe('Project Service', () => {
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

  const mockDb = {} as ReturnType<typeof getDb>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockReturnValue(mockDb);
  });

  describe('createProject', () => {
    it('should create project successfully for authenticated user', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectByOwnerAndKey.mockReturnValue(null);
      mockCreateProjectDb.mockReturnValue(mockProject);

      const result = await createProject(input);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectByOwnerAndKey).toHaveBeenCalledWith(mockDb, 'user-123', 'TEST');
      expect(mockCreateProjectDb).toHaveBeenCalledWith(mockDb, {
        ownerId: 'user-123',
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      });
      expect(result).toEqual(mockProject);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      };

      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(createProject(input)).rejects.toThrow(UnauthenticatedError);
    });

    it('should throw ConflictError when key already exists for user', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        key: 'TEST',
        description: 'A test project',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectByOwnerAndKey.mockReturnValue(mockProject);

      await expect(createProject(input)).rejects.toThrow(ConflictError);
      await expect(createProject(input)).rejects.toThrow(
        'A project with this key already exists'
      );
    });

    it('should create project with null description', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        key: 'TEST',
        description: null,
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectByOwnerAndKey.mockReturnValue(null);
      mockCreateProjectDb.mockReturnValue({
        ...mockProject,
        description: null,
      });

      const result = await createProject(input);

      expect(mockCreateProjectDb).toHaveBeenCalledWith(mockDb, {
        ownerId: 'user-123',
        name: 'Test Project',
        key: 'TEST',
        description: null,
      });
      expect(result.description).toBeNull();
    });
  });

  describe('listProjectsForCurrentUser', () => {
    it('should return all projects for current user', async () => {
      const mockProjects = [
        mockProject,
        {
          ...mockProject,
          id: 'project-456',
          name: 'Another Project',
          key: 'ANOTHER',
        },
      ];

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectsByOwnerId.mockReturnValue(mockProjects);

      const result = await listProjectsForCurrentUser();

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectsByOwnerId).toHaveBeenCalledWith(mockDb, 'user-123');
      expect(result).toEqual(mockProjects);
    });

    it('should return empty array when user has no projects', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectsByOwnerId.mockReturnValue([]);

      const result = await listProjectsForCurrentUser();

      expect(result).toEqual([]);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(listProjectsForCurrentUser()).rejects.toThrow(
        UnauthenticatedError
      );
    });
  });

  describe('getProjectByIdForCurrentUser', () => {
    it('should return project when user owns it', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);

      const result = await getProjectByIdForCurrentUser('project-123');

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(
        getProjectByIdForCurrentUser('non-existent-id')
      ).rejects.toThrow(NotFoundError);
      await expect(
        getProjectByIdForCurrentUser('non-existent-id')
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
        getProjectByIdForCurrentUser('project-123')
      ).rejects.toThrow(NotFoundError);
      await expect(
        getProjectByIdForCurrentUser('project-123')
      ).rejects.toThrow('Project not found');
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      mockRequireAuthenticatedUser.mockRejectedValue(
        new UnauthenticatedError()
      );

      await expect(
        getProjectByIdForCurrentUser('project-123')
      ).rejects.toThrow(UnauthenticatedError);
    });
  });
});
