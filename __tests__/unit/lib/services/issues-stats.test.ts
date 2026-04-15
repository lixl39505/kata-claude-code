import Database from 'better-sqlite3';
import { getCloseReasonStats as getCloseReasonStatsService } from '@/lib/services/issue';
import { getDb } from '@/lib/db';
import { isProjectMember } from '@/lib/db/project-members';
import { getCloseReasonStats } from '@/lib/db/issues';
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

describe('Issue Close Reason Stats - Service Layer', () => {
  const mockDb = {} as Database.Database;
  const mockUser = { id: 'user-1', email: 'user@example.com', name: 'Test User' };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated user
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
    // Mock database
    (getDb as jest.Mock).mockReturnValue(mockDb);
  });

  describe('getCloseReasonStats', () => {
    it('should return empty stats for user with no projects', async () => {
      // Mock user has no projects - need to properly mock the dynamic import
      const mockFindProjectIdsByUserId = jest.fn().mockReturnValue([]);
      (await import('@/lib/db/project-members')).findProjectIdsByUserId = mockFindProjectIdsByUserId;

      const result = await getCloseReasonStatsService({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    it('should return global stats across all user projects when no projectId specified', async () => {
      const mockProjectIds = ['project-1', 'project-2'];
      const mockStats = {
        items: [
          { closeReason: 'COMPLETED', count: 5 },
          { closeReason: 'NOT_PLANNED', count: 2 },
        ],
        total: 7,
      };

      // Mock dynamic import for findProjectIdsByUserId
      (await import('@/lib/db/project-members')).findProjectIdsByUserId = jest.fn().mockReturnValue(mockProjectIds);
      (getCloseReasonStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await getCloseReasonStatsService({});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(7);
      expect(getCloseReasonStats).toHaveBeenCalledWith(mockDb, {
        projectIds: mockProjectIds,
      });
    });

    it('should return project-specific stats when projectId is specified', async () => {
      const projectId = 'project-1';
      const mockStats = {
        items: [
          { closeReason: 'COMPLETED', count: 3 },
        ],
        total: 3,
      };

      // Mock user is member of project
      (isProjectMember as jest.Mock).mockReturnValue(true);
      (getCloseReasonStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await getCloseReasonStatsService({ projectId });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(getCloseReasonStats).toHaveBeenCalledWith(mockDb, {
        projectId,
      });
    });

    it('should return empty stats when user requests project they are not a member of', async () => {
      const projectId = 'project-2';

      // Mock user is NOT member of project
      (isProjectMember as jest.Mock).mockReturnValue(false);

      const result = await getCloseReasonStatsService({ projectId });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(getCloseReasonStats).not.toHaveBeenCalled();
    });

    it('should only count CLOSED issues', async () => {
      const projectId = 'project-1';
      const mockStats = {
        items: [
          { closeReason: 'COMPLETED', count: 1 },
        ],
        total: 1,
      };

      // Mock user is member of project
      (isProjectMember as jest.Mock).mockReturnValue(true);
      (getCloseReasonStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await getCloseReasonStatsService({ projectId });

      expect(result.total).toBe(1);
      expect(result.items[0].closeReason).toBe('COMPLETED');
      expect(result.items[0].count).toBe(1);
    });

    it('should handle all close reason types correctly', async () => {
      const projectId = 'project-1';
      const mockStats = {
        items: [
          { closeReason: 'COMPLETED', count: 5 },
          { closeReason: 'NOT_PLANNED', count: 3 },
          { closeReason: 'DUPLICATE', count: 2 },
        ],
        total: 10,
      };

      // Mock user is member of project
      (isProjectMember as jest.Mock).mockReturnValue(true);
      (getCloseReasonStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await getCloseReasonStatsService({ projectId });

      expect(result.total).toBe(10);
      expect(result.items).toHaveLength(3);

      const closeReasons = result.items.map((item: any) => item.closeReason);
      expect(closeReasons).toContain('COMPLETED');
      expect(closeReasons).toContain('NOT_PLANNED');
      expect(closeReasons).toContain('DUPLICATE');
    });

    it('should handle empty project IDs list for user with no access', async () => {
      // Mock dynamic import for findProjectIdsByUserId returning empty array
      (await import('@/lib/db/project-members')).findProjectIdsByUserId = jest.fn().mockReturnValue([]);

      const result = await getCloseReasonStatsService({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(getCloseReasonStats).not.toHaveBeenCalled();
    });
  });
});
