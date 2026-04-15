import {
  createCommentInIssue,
  listCommentsForIssue,
} from '@/lib/services/issue-comment';
import { createComment, findCommentsByIssueId } from '@/lib/db/issue-comments';
import { findProjectById } from '@/lib/db/projects';
import { findIssueById } from '@/lib/db/issues';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import { UnauthenticatedError } from '@/lib/errors/helpers';
import type { CreateCommentInput } from '@/lib/validators/issue-comment';

// Mock all dependencies
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/issue-comments', () => ({
  createComment: jest.fn(),
  findCommentsByIssueId: jest.fn(),
}));

jest.mock('@/lib/db/projects', () => ({
  findProjectById: jest.fn(),
}));

jest.mock('@/lib/db/issues', () => ({
  findIssueById: jest.fn(),
}));

import { getDb } from '@/lib/db';

// Type the mocks
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockRequireAuthenticatedUser =
  requireAuthenticatedUser as jest.MockedFunction<typeof requireAuthenticatedUser>;
const mockCreateComment = createComment as jest.MockedFunction<typeof createComment>;
const mockFindCommentsByIssueId = findCommentsByIssueId as jest.MockedFunction<
  typeof findCommentsByIssueId
>;
const mockFindProjectById = findProjectById as jest.MockedFunction<typeof findProjectById>;
const mockFindIssueById = findIssueById as jest.MockedFunction<typeof findIssueById>;

describe('Issue Comment Service', () => {
  const mockDb = {} as ReturnType<typeof mockGetDb>;

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
    title: 'Test Issue',
    description: 'A test issue',
    status: 'OPEN',
    closeReason: null,
    createdById: 'user-123',
    assigneeId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockComment = {
    id: 'comment-123',
    issueId: 'issue-123',
    projectId: 'project-123',
    authorId: 'user-123',
    content: 'This is a test comment',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockReturnValue(mockDb);
  });

  describe('createCommentInIssue', () => {
    const validInput: CreateCommentInput = {
      content: 'This is a test comment',
    };

    it('should create comment successfully for authenticated user', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockCreateComment.mockReturnValue(mockComment);

      const result = await createCommentInIssue('project-123', 'issue-123', validInput);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindIssueById).toHaveBeenCalledWith(mockDb, 'issue-123');
      expect(mockCreateComment).toHaveBeenCalledWith(mockDb, {
        issueId: 'issue-123',
        projectId: 'project-123',
        authorId: 'user-123',
        content: 'This is a test comment',
      });
      expect(result).toEqual(mockComment);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      mockRequireAuthenticatedUser.mockRejectedValue(new UnauthenticatedError());

      await expect(
        createCommentInIssue('project-123', 'issue-123', validInput)
      ).rejects.toThrow(UnauthenticatedError);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(
        createCommentInIssue('project-123', 'issue-123', validInput)
      ).rejects.toThrow('Project');

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
    });

    it('should throw NotFoundError when project belongs to different user', async () => {
      const otherUsersProject = { ...mockProject, ownerId: 'user-456' };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(otherUsersProject);

      await expect(
        createCommentInIssue('project-123', 'issue-123', validInput)
      ).rejects.toThrow('Project');

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(null);

      await expect(
        createCommentInIssue('project-123', 'issue-123', validInput)
      ).rejects.toThrow('Issue');

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindIssueById).toHaveBeenCalledWith(mockDb, 'issue-123');
    });

    it('should throw NotFoundError when issue belongs to different project', async () => {
      const otherProjectsIssue = { ...mockIssue, projectId: 'project-456' };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(otherProjectsIssue);

      await expect(
        createCommentInIssue('project-123', 'issue-123', validInput)
      ).rejects.toThrow('Issue');

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindIssueById).toHaveBeenCalledWith(mockDb, 'issue-123');
    });

    it('should create comment with minimum content length (1 character)', async () => {
      const input: CreateCommentInput = { content: 'a' };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockCreateComment.mockReturnValue({ ...mockComment, content: 'a' });

      const result = await createCommentInIssue('project-123', 'issue-123', input);

      expect(result.content).toBe('a');
      expect(mockCreateComment).toHaveBeenCalledWith(mockDb, {
        issueId: 'issue-123',
        projectId: 'project-123',
        authorId: 'user-123',
        content: 'a',
      });
    });

    it('should create comment with maximum content length (5000 characters)', async () => {
      const longContent = 'a'.repeat(5000);
      const input: CreateCommentInput = { content: longContent };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockCreateComment.mockReturnValue({ ...mockComment, content: longContent });

      const result = await createCommentInIssue('project-123', 'issue-123', input);

      expect(result.content).toBe(longContent);
    });

    it('should create comment with special characters', async () => {
      const input: CreateCommentInput = {
        content: 'Comment with @user #tag and https://example.com',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockCreateComment.mockReturnValue(mockComment);

      await createCommentInIssue('project-123', 'issue-123', input);

      expect(mockCreateComment).toHaveBeenCalledWith(mockDb, {
        issueId: 'issue-123',
        projectId: 'project-123',
        authorId: 'user-123',
        content: input.content,
      });
    });
  });

  describe('listCommentsForIssue', () => {
    it('should list comments successfully for authenticated user', async () => {
      const mockComments = [mockComment];

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockFindCommentsByIssueId.mockReturnValue(mockComments);

      const result = await listCommentsForIssue('project-123', 'issue-123');

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindIssueById).toHaveBeenCalledWith(mockDb, 'issue-123');
      expect(mockFindCommentsByIssueId).toHaveBeenCalledWith(mockDb, 'issue-123');
      expect(result).toEqual(mockComments);
    });

    it('should throw UnauthenticatedError when user is not authenticated', async () => {
      mockRequireAuthenticatedUser.mockRejectedValue(new UnauthenticatedError());

      await expect(listCommentsForIssue('project-123', 'issue-123')).rejects.toThrow(
        UnauthenticatedError
      );

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(null);

      await expect(listCommentsForIssue('project-123', 'issue-123')).rejects.toThrow(
        'Project'
      );

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
    });

    it('should throw NotFoundError when project belongs to different user', async () => {
      const otherUsersProject = { ...mockProject, ownerId: 'user-456' };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(otherUsersProject);

      await expect(listCommentsForIssue('project-123', 'issue-123')).rejects.toThrow(
        'Project'
      );

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(null);

      await expect(listCommentsForIssue('project-123', 'issue-123')).rejects.toThrow(
        'Issue'
      );

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindIssueById).toHaveBeenCalledWith(mockDb, 'issue-123');
    });

    it('should throw NotFoundError when issue belongs to different project', async () => {
      const otherProjectsIssue = { ...mockIssue, projectId: 'project-456' };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(otherProjectsIssue);

      await expect(listCommentsForIssue('project-123', 'issue-123')).rejects.toThrow(
        'Issue'
      );

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFindProjectById).toHaveBeenCalledWith(mockDb, 'project-123');
      expect(mockFindIssueById).toHaveBeenCalledWith(mockDb, 'issue-123');
    });

    it('should return empty array when issue has no comments', async () => {
      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockFindCommentsByIssueId.mockReturnValue([]);

      const result = await listCommentsForIssue('project-123', 'issue-123');

      expect(result).toEqual([]);
    });

    it('should return multiple comments in order', async () => {
      const mockComments = [
        { ...mockComment, id: 'comment-1', content: 'First' },
        { ...mockComment, id: 'comment-2', content: 'Second' },
      ];

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockFindCommentsByIssueId.mockReturnValue(mockComments);

      const result = await listCommentsForIssue('project-123', 'issue-123');

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('First');
      expect(result[1].content).toBe('Second');
    });
  });
});
