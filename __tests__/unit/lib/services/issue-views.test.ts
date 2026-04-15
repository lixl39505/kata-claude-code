import {
  getPresetViews,
  getPresetViewResults,
} from '@/lib/services/issue';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import { PRESET_VIEWS, PRESET_VIEW_KEYS } from '@/lib/validators/issue';

// Mock dependencies
jest.mock('@/lib/services/auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
  executeInTransactionAsync: jest.fn((db, callback) => callback(db)),
}));

jest.mock('@/lib/db/project-members', () => ({
  findProjectIdsByUserId: jest.fn(() => []),
}));

// Mock the issue module to override the listIssuesWithFilters function
jest.mock('@/lib/services/issue', () => {
  const actualModule = jest.requireActual('@/lib/services/issue');
  return {
    ...actualModule,
    listIssuesWithFilters: jest.fn(),
  };
});

import { listIssuesWithFilters } from '@/lib/services/issue';

const mockedListIssuesWithFilters = listIssuesWithFilters as jest.MockedFunction<typeof listIssuesWithFilters>;

describe('Issue Preset Views', () => {
  const createMockIssue = (overrides: Partial<{ id: string; title: string; status: string; assigneeId: string | null }>) => ({
    id: 'issue-1',
    projectId: 'project-1',
    title: 'Test Issue',
    description: null,
    status: 'OPEN',
    closeReason: null,
    createdById: 'user-1',
    assigneeId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPresetViews', () => {
    it('should return all available preset views', () => {
      const views = getPresetViews();

      expect(views).toHaveLength(3);
      expect(views).toContainEqual(PRESET_VIEWS.MY_ISSUES);
      expect(views).toContainEqual(PRESET_VIEWS.OPEN_ISSUES);
      expect(views).toContainEqual(PRESET_VIEWS.CLOSED_ISSUES);
    });

    it('should return view definitions with correct structure', () => {
      const views = getPresetViews();

      views.forEach((view) => {
        expect(view).toHaveProperty('key');
        expect(view).toHaveProperty('name');
        expect(view).toHaveProperty('description');
        expect(view.key).toMatch(/^(MY_ISSUES|OPEN_ISSUES|CLOSED_ISSUES)$/);
        expect(typeof view.name).toBe('string');
        expect(typeof view.description).toBe('string');
      });
    });
  });

  describe('getPresetViewResults', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
    });

    it('should return My Issues view with correct filters', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          projectId: 'project-1',
          title: 'Issue 1',
          description: null,
          status: 'OPEN',
          closeReason: null,
          createdById: 'user-1',
          assigneeId: mockUser.id,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'issue-2',
          projectId: 'project-1',
          title: 'Issue 2',
          description: null,
          status: 'OPEN',
          closeReason: null,
          createdById: 'user-1',
          assigneeId: mockUser.id,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockedListIssuesWithFilters.mockResolvedValue({
        items: mockIssues,
        total: 2,
        pagination: {
          limit: 20,
          offset: 0,
          hasNextPage: false,
        },
      });

      const result = await getPresetViewResults({
        key: PRESET_VIEW_KEYS.MY_ISSUES,
        limit: 20,
        offset: 0,
      });

      expect(result.view).toEqual(PRESET_VIEWS.MY_ISSUES);
      expect(result.items).toEqual(mockIssues);
      expect(result.total).toBe(2);
      expect(mockedListIssuesWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: mockUser.id,
          limit: 20,
          offset: 0,
        })
      );
    });

    it('should return Open Issues view with correct filters', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          projectId: 'project-1',
          title: 'Open Issue 1',
          description: null,
          status: 'OPEN',
          closeReason: null,
          createdById: 'user-1',
          assigneeId: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'issue-2',
          projectId: 'project-1',
          title: 'Open Issue 2',
          description: null,
          status: 'OPEN',
          closeReason: null,
          createdById: 'user-1',
          assigneeId: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockedListIssuesWithFilters.mockResolvedValue({
        items: mockIssues,
        total: 2,
        pagination: {
          limit: 20,
          offset: 0,
          hasNextPage: false,
        },
      });

      const result = await getPresetViewResults({
        key: PRESET_VIEW_KEYS.OPEN_ISSUES,
        limit: 20,
        offset: 0,
      });

      expect(result.view).toEqual(PRESET_VIEWS.OPEN_ISSUES);
      expect(result.items).toEqual(mockIssues);
      expect(result.total).toBe(2);
      expect(mockedListIssuesWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'OPEN',
          limit: 20,
          offset: 0,
        })
      );
    });

    it('should return Closed Issues view with correct filters', async () => {
      const mockIssues = [
        createMockIssue({ id: 'issue-1', title: 'Closed Issue 1', status: 'CLOSED' }),
        createMockIssue({ id: 'issue-2', title: 'Closed Issue 2', status: 'CLOSED' }),
      ];

      mockedListIssuesWithFilters.mockResolvedValue({
        items: mockIssues,
        total: 2,
        pagination: {
          limit: 20,
          offset: 0,
          hasNextPage: false,
        },
      });

      const result = await getPresetViewResults({
        key: PRESET_VIEW_KEYS.CLOSED_ISSUES,
        limit: 20,
        offset: 0,
      });

      expect(result.view).toEqual(PRESET_VIEWS.CLOSED_ISSUES);
      expect(result.items).toEqual(mockIssues);
      expect(result.total).toBe(2);
      expect(mockedListIssuesWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'CLOSED',
          limit: 20,
          offset: 0,
        })
      );
    });

    it('should handle pagination parameters correctly', async () => {
      const mockIssues = Array.from({ length: 10 }, (_, i) =>
        createMockIssue({
          id: `issue-${i}`,
          title: `Issue ${i}`,
        })
      );

      mockedListIssuesWithFilters.mockResolvedValue({
        items: mockIssues,
        total: 30,
        pagination: {
          limit: 10,
          offset: 20,
          hasNextPage: true,
        },
      });

      const result = await getPresetViewResults({
        key: PRESET_VIEW_KEYS.OPEN_ISSUES,
        limit: 10,
        offset: 20,
      });

      expect(result.total).toBe(30);
      expect(result.items).toHaveLength(10);
      expect(mockedListIssuesWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });

    it('should require authentication', async () => {
      (requireAuthenticatedUser as jest.Mock).mockRejectedValue(
        new Error('UNAUTHENTICATED')
      );

      await expect(
        getPresetViewResults({
          key: PRESET_VIEW_KEYS.OPEN_ISSUES,
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow('UNAUTHENTICATED');

      expect(requireAuthenticatedUser).toHaveBeenCalled();
    });

    it('should apply default sorting (createdAt desc)', async () => {
      const mockIssues = [
        createMockIssue({ id: 'issue-1', title: 'Issue 1', status: 'OPEN' }),
      ];

      mockedListIssuesWithFilters.mockResolvedValue({
        items: mockIssues,
        total: 1,
        pagination: {
          limit: 20,
          offset: 0,
          hasNextPage: false,
        },
      });

      await getPresetViewResults({
        key: PRESET_VIEW_KEYS.OPEN_ISSUES,
        limit: 20,
        offset: 0,
      });

      expect(mockedListIssuesWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'createdAt',
          order: 'desc',
        })
      );
    });

    it('should respect permission boundaries from underlying listIssuesWithFilters', async () => {
      const mockIssues = [
        createMockIssue({ id: 'issue-1', title: 'Issue 1', status: 'OPEN' }),
      ];

      mockedListIssuesWithFilters.mockResolvedValue({
        items: mockIssues,
        total: 1,
        pagination: {
          limit: 20,
          offset: 0,
          hasNextPage: false,
        },
      });

      await getPresetViewResults({
        key: PRESET_VIEW_KEYS.OPEN_ISSUES,
        limit: 20,
        offset: 0,
      });

      // The underlying service should handle permission filtering
      expect(mockedListIssuesWithFilters).toHaveBeenCalled();
    });
  });
});