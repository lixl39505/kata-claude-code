import { validateAndResolveMentions } from '@/lib/services/comment-mention-validator';
import { ValidationError } from '@/lib/errors/helpers';
import { findProjectMembersWithDetails } from '@/lib/db/project-members';
import Database from 'better-sqlite3';

// Mock dependencies
jest.mock('@/lib/db/project-members', () => ({
  findProjectMembersWithDetails: jest.fn(),
}));

const mockFindProjectMembersWithDetails = findProjectMembersWithDetails as jest.MockedFunction<typeof findProjectMembersWithDetails>;

describe('Comment Mention Validator', () => {
  const mockDb = {} as Database.Database;

  const mockProjectMembers = [
    {
      id: 'member-1',
      projectId: 'project-1',
      userId: 'user-1',
      role: 'OWNER' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      displayName: 'John Doe',
      email: 'john.doe@example.com',
    },
    {
      id: 'member-2',
      projectId: 'project-1',
      userId: 'user-2',
      role: 'MEMBER' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      displayName: 'Jane Smith',
      email: 'jane.smith@example.com',
    },
    {
      id: 'member-3',
      projectId: 'project-1',
      userId: 'user-3',
      role: 'MEMBER' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      displayName: 'Bob Johnson',
      email: 'bob.johnson@example.com',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindProjectMembersWithDetails.mockReturnValue(mockProjectMembers);
  });

  describe('validateAndResolveMentions', () => {
    it('should return empty array when no mentions provided', () => {
      const result = validateAndResolveMentions(mockDb, 'project-1', []);
      expect(result).toEqual([]);
      expect(mockFindProjectMembersWithDetails).not.toHaveBeenCalled();
    });

    it('should resolve valid single mention', () => {
      const result = validateAndResolveMentions(mockDb, 'project-1', ['john.doe']);

      expect(result).toEqual([
        {
          userId: 'user-1',
          displayName: 'John Doe',
        },
      ]);
    });

    it('should resolve multiple valid mentions', () => {
      const result = validateAndResolveMentions(mockDb, 'project-1', [
        'john.doe',
        'jane.smith',
        'bob.johnson',
      ]);

      expect(result).toEqual([
        {
          userId: 'user-1',
          displayName: 'John Doe',
        },
        {
          userId: 'user-2',
          displayName: 'Jane Smith',
        },
        {
          userId: 'user-3',
          displayName: 'Bob Johnson',
        },
      ]);
    });

    it('should be case insensitive', () => {
      const result = validateAndResolveMentions(mockDb, 'project-1', [
        'JOHN.DOE',
        'Jane.Smith',
        'BoB.JoHnSoN',
      ]);

      expect(result).toEqual([
        {
          userId: 'user-1',
          displayName: 'John Doe',
        },
        {
          userId: 'user-2',
          displayName: 'Jane Smith',
        },
        {
          userId: 'user-3',
          displayName: 'Bob Johnson',
        },
      ]);
    });

    it('should deduplicate mentions in result', () => {
      const result = validateAndResolveMentions(mockDb, 'project-1', [
        'john.doe',
        'jane.smith',
        'john.doe',
      ]);

      expect(result).toEqual([
        {
          userId: 'user-1',
          displayName: 'John Doe',
        },
        {
          userId: 'user-2',
          displayName: 'Jane Smith',
        },
      ]);
    });

    it('should throw ValidationError for non-member mention', () => {
      expect(() => {
        validateAndResolveMentions(mockDb, 'project-1', ['nonexistent']);
      }).toThrow(ValidationError);

      try {
        validateAndResolveMentions(mockDb, 'project-1', ['nonexistent']);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.message).toContain('Invalid mentions');
        expect(validationError.details).toEqual({
          invalidMentions: ['nonexistent'],
          validMembers: expect.arrayContaining([
            'john.doe',
            'jane.smith',
            'bob.johnson',
          ]),
        });
      }
    });

    it('should throw ValidationError for multiple non-member mentions', () => {
      expect(() => {
        validateAndResolveMentions(mockDb, 'project-1', ['nonexistent1', 'nonexistent2']);
      }).toThrow(ValidationError);

      try {
        validateAndResolveMentions(mockDb, 'project-1', ['nonexistent1', 'nonexistent2']);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({
          invalidMentions: ['nonexistent1', 'nonexistent2'],
          validMembers: expect.arrayContaining([
            'john.doe',
            'jane.smith',
            'bob.johnson',
          ]),
        });
      }
    });

    it('should throw ValidationError when some mentions are invalid', () => {
      expect(() => {
        validateAndResolveMentions(mockDb, 'project-1', ['john.doe', 'invalid', 'jane.smith']);
      }).toThrow(ValidationError);

      try {
        validateAndResolveMentions(mockDb, 'project-1', ['john.doe', 'invalid', 'jane.smith']);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({
          invalidMentions: ['invalid'],
          validMembers: expect.arrayContaining([
            'john.doe',
            'jane.smith',
            'bob.johnson',
          ]),
        });
      }
    });

    it('should handle project with no members', () => {
      mockFindProjectMembersWithDetails.mockReturnValue([]);

      expect(() => {
        validateAndResolveMentions(mockDb, 'project-1', ['john.doe']);
      }).toThrow(ValidationError);

      try {
        validateAndResolveMentions(mockDb, 'project-1', ['john.doe']);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({
          invalidMentions: ['john.doe'],
          validMembers: [],
        });
      }
    });

    it('should query project members with correct project ID', () => {
      validateAndResolveMentions(mockDb, 'project-123', ['john.doe']);

      expect(mockFindProjectMembersWithDetails).toHaveBeenCalledWith(mockDb, 'project-123');
    });
  });
});
