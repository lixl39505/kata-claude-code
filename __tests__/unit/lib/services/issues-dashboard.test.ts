import Database from 'better-sqlite3';
import { getDashboardStats } from '@/lib/services/issue';
import { getDb } from '@/lib/db';
import { isProjectMember } from '@/lib/db/project-members';
import { countIssuesWithFilters } from '@/lib/db/issues';
import { requireAuthenticatedUser } from '@/lib/services/auth';

// Mock all database dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/db/project-members');
jest.mock('@/lib/db/issues');

// Mock iron-session before importing auth service
jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn(() => ({
    userId: 'user-1',
    save: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('@/lib/services/auth');

describe('Issue Dashboard Stats - Service Layer', () => {
  const mockDb = {} as Database.Database;
  const mockUser = { id: 'user-1', email: 'user@example.com', name: 'Test User' };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated user
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
    // Mock database
    (getDb as jest.Mock).mockReturnValue(mockDb);
  });

  describe('getDashboardStats', () => {
    it('should return empty stats for user with no projects', async () => {
      // Mock user has no projects
      const mockFindProjectIdsByUserId = jest.fn().mockReturnValue([]);
      (await import('@/lib/db/project-members')).findProjectIdsByUserId = mockFindProjectIdsByUserId;

      const result = await getDashboardStats({});

      expect(result).toEqual({
        total: 0,
        openCount: 0,
        closedCount: 0,
        closeReasonStats: {
          items: [],
          total: 0,
        },
      });
    });

    it('should return global stats across all user projects when no projectId specified', async () => {
      const mockProjectIds = ['project-1', 'project-2'];

      // Mock counts
      (countIssuesWithFilters as jest.Mock)
        .mockReturnValueOnce(10) // total
        .mockReturnValueOnce(6) // openCount
        .mockReturnValueOnce(4); // closedCount

      // Mock close reason stats by mocking the DB layer function
      const { getCloseReasonStats: getCloseReasonStatsDb } = await import('@/lib/db/issues');
      (getCloseReasonStatsDb as jest.Mock).mockReturnValue({
        items: [
          { closeReason: 'COMPLETED', count: 3 },
          { closeReason: 'NOT_PLANNED', count: 1 },
        ],
        total: 4,
      });

      // Mock dynamic imports
      (await import('@/lib/db/project-members')).findProjectIdsByUserId = jest.fn().mockReturnValue(mockProjectIds);

      const result = await getDashboardStats({});

      expect(result.total).toBe(10);
      expect(result.openCount).toBe(6);
      expect(result.closedCount).toBe(4);
      expect(result.closeReasonStats.total).toBe(4);
      expect(countIssuesWithFilters).toHaveBeenCalledTimes(3);
    });

    it('should return project-specific stats when projectId is specified', async () => {
      const projectId = 'project-1';

      // Mock user is member of project
      (isProjectMember as jest.Mock).mockReturnValue(true);

      // Mock counts
      (countIssuesWithFilters as jest.Mock)
        .mockReturnValueOnce(5) // total
        .mockReturnValueOnce(3) // openCount
        .mockReturnValueOnce(2); // closedCount

      // Mock close reason stats by mocking the DB layer function
      const { getCloseReasonStats: getCloseReasonStatsDb } = await import('@/lib/db/issues');
      (getCloseReasonStatsDb as jest.Mock).mockReturnValue({
        items: [
          { closeReason: 'COMPLETED', count: 2 },
        ],
        total: 2,
      });

      const result = await getDashboardStats({ projectId });

      expect(result.total).toBe(5);
      expect(result.openCount).toBe(3);
      expect(result.closedCount).toBe(2);
      expect(result.closeReasonStats.total).toBe(2);
    });

    it('should return empty stats when user requests project they are not a member of', async () => {
      const projectId = 'project-2';

      // Mock user is NOT member of project
      (isProjectMember as jest.Mock).mockReturnValue(false);

      const result = await getDashboardStats({ projectId });

      expect(result).toEqual({
        total: 0,
        openCount: 0,
        closedCount: 0,
        closeReasonStats: {
          items: [],
          total: 0,
        },
      });
      expect(countIssuesWithFilters).not.toHaveBeenCalled();
    });

    it('should ensure data consistency: total = openCount + closedCount', async () => {
      const mockProjectIds = ['project-1'];

      // Mock counts that add up correctly
      (countIssuesWithFilters as jest.Mock)
        .mockReturnValueOnce(8) // total
        .mockReturnValueOnce(5) // openCount
        .mockReturnValueOnce(3); // closedCount

      // Mock close reason stats by mocking the DB layer function
      const { getCloseReasonStats: getCloseReasonStatsDb } = await import('@/lib/db/issues');
      (getCloseReasonStatsDb as jest.Mock).mockReturnValue({
        items: [
          { closeReason: 'COMPLETED', count: 3 },
        ],
        total: 3,
      });

      (await import('@/lib/db/project-members')).findProjectIdsByUserId = jest.fn().mockReturnValue(mockProjectIds);

      const result = await getDashboardStats({});

      expect(result.total).toBe(result.openCount + result.closedCount);
      expect(result.total).toBe(8);
      expect(result.openCount + result.closedCount).toBe(8);
    });

    it('should handle all close reason types correctly in closeReasonStats', async () => {
      const projectId = 'project-1';

      // Mock user is member of project
      (isProjectMember as jest.Mock).mockReturnValue(true);

      // Mock counts
      (countIssuesWithFilters as jest.Mock)
        .mockReturnValueOnce(10) // total
        .mockReturnValueOnce(4) // openCount
        .mockReturnValueOnce(6); // closedCount

      // Mock close reason stats with all three types by mocking the DB layer function
      const { getCloseReasonStats: getCloseReasonStatsDb } = await import('@/lib/db/issues');
      (getCloseReasonStatsDb as jest.Mock).mockReturnValue({
        items: [
          { closeReason: 'COMPLETED', count: 4 },
          { closeReason: 'NOT_PLANNED', count: 1 },
          { closeReason: 'DUPLICATE', count: 1 },
        ],
        total: 6,
      });

      const result = await getDashboardStats({ projectId });

      expect(result.closeReasonStats.total).toBe(6);
      expect(result.closeReasonStats.items).toHaveLength(3);

      const closeReasons = result.closeReasonStats.items.map((item) => item.closeReason);
      expect(closeReasons).toContain('COMPLETED');
      expect(closeReasons).toContain('NOT_PLANNED');
      expect(closeReasons).toContain('DUPLICATE');
    });

    it('should handle empty project (no issues)', async () => {
      const projectId = 'project-1';

      // Mock user is member of project
      (isProjectMember as jest.Mock).mockReturnValue(true);

      // Mock zero counts
      (countIssuesWithFilters as jest.Mock)
        .mockReturnValueOnce(0) // total
        .mockReturnValueOnce(0) // openCount
        .mockReturnValueOnce(0); // closedCount

      // Mock empty close reason stats by mocking the DB layer function
      const { getCloseReasonStats: getCloseReasonStatsDb } = await import('@/lib/db/issues');
      (getCloseReasonStatsDb as jest.Mock).mockReturnValue({
        items: [],
        total: 0,
      });

      const result = await getDashboardStats({ projectId });

      expect(result.total).toBe(0);
      expect(result.openCount).toBe(0);
      expect(result.closedCount).toBe(0);
      expect(result.closeReasonStats.total).toBe(0);
      expect(result.closeReasonStats.items).toEqual([]);
    });

    it('should call countIssuesWithFilters with correct filters', async () => {
      const projectId = 'project-1';

      // Mock user is member of project
      (isProjectMember as jest.Mock).mockReturnValue(true);

      // Mock counts
      (countIssuesWithFilters as jest.Mock)
        .mockReturnValueOnce(5)
        .mockReturnValueOnce(3)
        .mockReturnValueOnce(2);

      // Mock close reason stats by mocking the DB layer function
      const { getCloseReasonStats: getCloseReasonStatsDb } = await import('@/lib/db/issues');
      (getCloseReasonStatsDb as jest.Mock).mockReturnValue({
        items: [{ closeReason: 'COMPLETED', count: 2 }],
        total: 2,
      });

      await getDashboardStats({ projectId });

      expect(countIssuesWithFilters).toHaveBeenCalledWith(mockDb, { projectId });
      expect(countIssuesWithFilters).toHaveBeenCalledWith(mockDb, { projectId, status: 'OPEN' });
      expect(countIssuesWithFilters).toHaveBeenCalledWith(mockDb, { projectId, status: 'CLOSED' });
    });
  });
});
