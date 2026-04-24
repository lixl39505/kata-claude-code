import {
  createCommentInIssue,
  listCommentsForIssue,
} from '@/lib/services/issue-comment';
import { createComment, findCommentsByIssueId } from '@/lib/db/issue-comments';
import { createCommentMentions, findMentionsByCommentId } from '@/lib/db/issue-comment-mentions';
import { findProjectById } from '@/lib/db/projects';
import { findIssueById } from '@/lib/db/issues';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import { UnauthenticatedError, ValidationError } from '@/lib/errors/helpers';
import type { CreateCommentInput } from '@/lib/validators/issue-comment';
import Database from 'better-sqlite3';

// Mock all dependencies
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/db/transaction', () => ({
  executeInTransactionAsync: jest.fn(),
}));

jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/issue-comments', () => ({
  createComment: jest.fn(),
  findCommentsByIssueId: jest.fn(),
}));

jest.mock('@/lib/db/issue-comment-mentions', () => ({
  createCommentMentions: jest.fn(),
  findMentionsByCommentId: jest.fn(),
}));

jest.mock('@/lib/db/projects', () => ({
  findProjectById: jest.fn(),
}));

jest.mock('@/lib/db/issues', () => ({
  findIssueById: jest.fn(),
}));

jest.mock('@/lib/services/comment-mention-parser', () => ({
  parseMentions: jest.fn(),
}));

jest.mock('@/lib/services/comment-mention-validator', () => ({
  validateAndResolveMentions: jest.fn(),
}));

import { getDb } from '@/lib/db';
import { executeInTransactionAsync } from '@/lib/db/transaction';
import { parseMentions } from '@/lib/services/comment-mention-parser';
import { validateAndResolveMentions } from '@/lib/services/comment-mention-validator';

// Type the mocks
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockExecuteInTransactionAsync = executeInTransactionAsync as jest.MockedFunction<typeof executeInTransactionAsync>;
const mockRequireAuthenticatedUser =
  requireAuthenticatedUser as jest.MockedFunction<typeof requireAuthenticatedUser>;
const mockCreateComment = createComment as jest.MockedFunction<typeof createComment>;
const mockFindCommentsByIssueId = findCommentsByIssueId as jest.MockedFunction<
  typeof findCommentsByIssueId
>;
const mockCreateCommentMentions = createCommentMentions as jest.MockedFunction<typeof createCommentMentions>;
const mockFindMentionsByCommentId = findMentionsByCommentId as jest.MockedFunction<
  typeof findMentionsByCommentId
>;
const mockFindProjectById = findProjectById as jest.MockedFunction<typeof findProjectById>;
const mockFindIssueById = findIssueById as jest.MockedFunction<typeof findIssueById>;
const mockParseMentions = parseMentions as jest.MockedFunction<typeof parseMentions>;
const mockValidateAndResolveMentions = validateAndResolveMentions as jest.MockedFunction<typeof validateAndResolveMentions>;

describe('Issue Comment Service', () => {
  const mockDb = {
    transaction: jest.fn((callback: (db: Database.Database) => unknown) => callback),
  } as unknown as ReturnType<typeof mockGetDb>;

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
    mockExecuteInTransactionAsync.mockImplementation((db, callback) => {
      // Directly execute the callback with the db, bypassing transaction
      // This is fine for unit tests since we're testing business logic, not transaction behavior
      return Promise.resolve(callback(db));
    });
    mockParseMentions.mockReturnValue([]);
    mockValidateAndResolveMentions.mockReturnValue([]);
    mockFindMentionsByCommentId.mockReturnValue([]);
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
      expect(mockExecuteInTransactionAsync).toHaveBeenCalled();
      expect(result).toEqual({
        ...mockComment,
        mentions: [],
      });
    });

    it('should create comment with mentions when @ users are mentioned', async () => {
      const inputWithMentions: CreateCommentInput = {
        content: '@john please review this',
      };

      const mentionedUsers = [
        { userId: 'user-456', displayName: 'John Doe' },
      ];

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockParseMentions.mockReturnValue(['john']);
      mockValidateAndResolveMentions.mockReturnValue(mentionedUsers);
      mockCreateComment.mockReturnValue(mockComment);

      const result = await createCommentInIssue('project-123', 'issue-123', inputWithMentions);

      expect(mockParseMentions).toHaveBeenCalledWith(inputWithMentions.content);
      expect(mockValidateAndResolveMentions).toHaveBeenCalledWith(mockDb, 'project-123', ['john']);
      expect(mockCreateCommentMentions).toHaveBeenCalledWith(mockDb, [
        {
          commentId: mockComment.id,
          issueId: 'issue-123',
          projectId: 'project-123',
          mentionedUserId: 'user-456',
        },
      ]);
      expect(result).toEqual({
        ...mockComment,
        mentions: mentionedUsers,
      });
    });

    it('should throw ValidationError when mentions are invalid', async () => {
      const inputWithInvalidMention: CreateCommentInput = {
        content: '@nonexistent please review',
      };

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockParseMentions.mockReturnValue(['nonexistent']);
      mockValidateAndResolveMentions.mockImplementation(() => {
        throw new ValidationError('Invalid mentions');
      });

      await expect(
        createCommentInIssue('project-123', 'issue-123', inputWithInvalidMention)
      ).rejects.toThrow(ValidationError);

      expect(mockExecuteInTransactionAsync).not.toHaveBeenCalled();
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
      expect(mockExecuteInTransactionAsync).toHaveBeenCalled();
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
      expect(result).toEqual([
        {
          ...mockComment,
          mentions: [],
        },
      ]);
    });

    it('should list comments with mentions', async () => {
      const mockComments = [mockComment];
      const mockMentions = [
        {
          id: 'mention-1',
          commentId: 'comment-123',
          issueId: 'issue-123',
          projectId: 'project-123',
          mentionedUserId: 'user-456',
          createdAt: '2024-01-01T00:00:00.000Z',
          displayName: 'John Doe',
          email: 'john@example.com',
        },
      ];

      mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
      mockFindProjectById.mockReturnValue(mockProject);
      mockFindIssueById.mockReturnValue(mockIssue);
      mockFindCommentsByIssueId.mockReturnValue(mockComments);
      mockFindMentionsByCommentId.mockReturnValue(mockMentions);

      const result = await listCommentsForIssue('project-123', 'issue-123');

      expect(result).toEqual([
        {
          ...mockComment,
          mentions: [
            {
              userId: 'user-456',
              displayName: 'John Doe',
            },
          ],
        },
      ]);
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
