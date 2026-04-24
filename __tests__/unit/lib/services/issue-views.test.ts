// Import modules first before mocking
import { countIssuesWithFilters, findIssuesWithFilters } from '@/lib/db/issues';
import { getPresetViews, getPresetViewResults } from '@/lib/services/issue';
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
  findProjectIdsByUserId: jest.fn(() => ['project-1', 'project-2']),
}));

jest.mock('@/lib/db/issues', () => ({
  countIssuesWithFilters: jest.fn(() => 0),
  findIssuesWithFilters: jest.fn(() => []),
  createIssue: jest.fn(),
  findIssuesByProjectId: jest.fn(),
  findIssueById: jest.fn(),
  updateIssue: jest.fn(),
  getCloseReasonStats: jest.fn(),
}));

// Create typed mocks
const mockedCountIssuesWithFilters = countIssuesWithFilters as jest.MockedFunction<typeof countIssuesWithFilters>;
const mockedFindIssuesWithFilters = findIssuesWithFilters as jest.MockedFunction<typeof findIssuesWithFilters>;

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
      // Reset mocks to default empty values
      mockedCountIssuesWithFilters.mockReturnValue(0);
      mockedFindIssuesWithFilters.mockReturnValue([]);
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

      // Mock the underlying DB functions
      mockedCountIssuesWithFilters.mockReturnValue(2);
      mockedFindIssuesWithFilters.mockReturnValue(mockIssues);

      const result = await getPresetViewResults({
        key: PRESET_VIEW_KEYS.MY_ISSUES,
        limit: 20,
        offset: 0,
      });

      expect(result.view).toEqual(PRESET_VIEWS.MY_ISSUES);
      expect(result.items).toEqual(mockIssues);
      expect(result.total).toBe(2);
      expect(mockedFindIssuesWithFilters).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          assigneeId: mockUser.id,
          projectIds: ['project-1', 'project-2'],
        }),
        { limit: 20, offset: 0 },
        { sortBy: 'createdAt', order: 'desc' }
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

      // Mock the underlying DB functions
      mockedCountIssuesWithFilters.mockReturnValue(2);
      mockedFindIssuesWithFilters.mockReturnValue(mockIssues);

      const result = await getPresetViewResults({
        key: PRESET_VIEW_KEYS.OPEN_ISSUES,
        limit: 20,
        offset: 0,
      });

      expect(result.view).toEqual(PRESET_VIEWS.OPEN_ISSUES);
      expect(result.items).toEqual(mockIssues);
      expect(result.total).toBe(2);
      expect(mockedFindIssuesWithFilters).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'OPEN',
          projectIds: ['project-1', 'project-2'],
        }),
        { limit: 20, offset: 0 },
        { sortBy: 'createdAt', order: 'desc' }
      );
    });

    it('should return Closed Issues view with correct filters', async () => {
      const mockIssues = [
        createMockIssue({ id: 'issue-1', title: 'Closed Issue 1', status: 'CLOSED' }),
        createMockIssue({ id: 'issue-2', title: 'Closed Issue 2', status: 'CLOSED' }),
      ];

      // Mock the underlying DB functions
      mockedCountIssuesWithFilters.mockReturnValue(2);
      mockedFindIssuesWithFilters.mockReturnValue(mockIssues);

      const result = await getPresetViewResults({
        key: PRESET_VIEW_KEYS.CLOSED_ISSUES,
        limit: 20,
        offset: 0,
      });

      expect(result.view).toEqual(PRESET_VIEWS.CLOSED_ISSUES);
      expect(result.items).toEqual(mockIssues);
      expect(result.total).toBe(2);
      expect(mockedFindIssuesWithFilters).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'CLOSED',
          projectIds: ['project-1', 'project-2'],
        }),
        { limit: 20, offset: 0 },
        { sortBy: 'createdAt', order: 'desc' }
      );
    });

    it('should handle pagination parameters correctly', async () => {
      const mockIssues = Array.from({ length: 10 }, (_, i) =>
        createMockIssue({
          id: `issue-${i}`,
          title: `Issue ${i}`,
        })
      );

      // Mock the underlying DB functions
      mockedCountIssuesWithFilters.mockReturnValue(30);
      mockedFindIssuesWithFilters.mockReturnValue(mockIssues);

      const result = await getPresetViewResults({
        key: PRESET_VIEW_KEYS.OPEN_ISSUES,
        limit: 10,
        offset: 20,
      });

      expect(result.total).toBe(30);
      expect(result.items).toHaveLength(10);
      expect(mockedFindIssuesWithFilters).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'OPEN',
          projectIds: ['project-1', 'project-2'],
        }),
        { limit: 10, offset: 20 },
        { sortBy: 'createdAt', order: 'desc' }
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

      // Mock the underlying DB functions
      mockedCountIssuesWithFilters.mockReturnValue(1);
      mockedFindIssuesWithFilters.mockReturnValue(mockIssues);

      await getPresetViewResults({
        key: PRESET_VIEW_KEYS.OPEN_ISSUES,
        limit: 20,
        offset: 0,
      });

      expect(mockedFindIssuesWithFilters).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'OPEN',
          projectIds: ['project-1', 'project-2'],
        }),
        { limit: 20, offset: 0 },
        { sortBy: 'createdAt', order: 'desc' }
      );
    });

    it('should respect permission boundaries from underlying listIssuesWithFilters', async () => {
      const mockIssues = [
        createMockIssue({ id: 'issue-1', title: 'Issue 1', status: 'OPEN' }),
      ];

      // Mock the underlying DB functions
      mockedCountIssuesWithFilters.mockReturnValue(1);
      mockedFindIssuesWithFilters.mockReturnValue(mockIssues);

      await getPresetViewResults({
        key: PRESET_VIEW_KEYS.OPEN_ISSUES,
        limit: 20,
        offset: 0,
      });

      // The underlying service should handle permission filtering
      expect(mockedFindIssuesWithFilters).toHaveBeenCalled();
    });
  });
});