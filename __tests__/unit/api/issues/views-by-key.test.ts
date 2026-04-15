/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET } from '@/app/api/issues/views/[key]/route';
import { getPresetViewResults } from '@/lib/services/issue';
import type { NextRequest } from 'next/server';

// Mock Next.js server dependencies
const mockRequest = (url: string): NextRequest => ({
  url,
  nextUrl: {
    searchParams: new URLSearchParams(url.split('?')[1] || ''),
  } as any,
  cookies: {} as any,
  page: {} as any,
  ua: {} as any,
  cache: {} as any,
  // Add other required properties as any
} as any);

jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
    get nextUrl() {
      return {
        searchParams: new URLSearchParams(this.url.split('?')[1] || ''),
      };
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => data,
    }),
  },
}));

// Mock dependencies
jest.mock('@/lib/services/issue', () => ({
  getPresetViewResults: jest.fn(),
}));

describe('Issue Views by Key API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/issues/views/:key', () => {
    it('should return preset view results for MY_ISSUES', async () => {
      const mockResult = {
        view: {
          key: 'MY_ISSUES',
          name: 'My Issues',
          description: 'Issues assigned to you',
        },
        items: [
          { id: 'issue-1', title: 'Issue 1', assigneeId: 'user-123' },
          { id: 'issue-2', title: 'Issue 2', assigneeId: 'user-123' },
        ],
        total: 2,
      };

      (getPresetViewResults as jest.Mock).mockResolvedValue(mockResult);

      const request = mockRequest(
        'http://localhost:3000/api/issues/views/MY_ISSUES'
      );
      const response = await GET(request, {
        params: { key: 'MY_ISSUES' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(getPresetViewResults).toHaveBeenCalledWith({
        key: 'MY_ISSUES',
        limit: undefined,
        offset: undefined,
      });
    });

    it('should return preset view results for OPEN_ISSUES with pagination', async () => {
      const mockResult = {
        view: {
          key: 'OPEN_ISSUES',
          name: 'Open Issues',
          description: 'All open issues across your projects',
        },
        items: [
          { id: 'issue-1', title: 'Issue 1', status: 'OPEN' },
          { id: 'issue-2', title: 'Issue 2', status: 'OPEN' },
        ],
        total: 10,
      };

      (getPresetViewResults as jest.Mock).mockResolvedValue(mockResult);

      const request = mockRequest(
        'http://localhost:3000/api/issues/views/OPEN_ISSUES?limit=2&offset=0'
      );
      const response = await GET(request, {
        params: { key: 'OPEN_ISSUES' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(getPresetViewResults).toHaveBeenCalledWith({
        key: 'OPEN_ISSUES',
        limit: '2',
        offset: '0',
      });
    });

    it('should return 400 for invalid view key', async () => {
      const request = mockRequest(
        'http://localhost:3000/api/issues/views/INVALID_KEY'
      );
      const response = await GET(request, {
        params: { key: 'INVALID_KEY' },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.message).toContain('Invalid view parameters');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const request = mockRequest(
        'http://localhost:3000/api/issues/views/MY_ISSUES?limit=abc&offset=-1'
      );
      const response = await GET(request, {
        params: { key: 'MY_ISSUES' },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors', async () => {
      const mockError = new Error('Service error');
      (getPresetViewResults as jest.Mock).mockRejectedValue(mockError);

      const request = mockRequest(
        'http://localhost:3000/api/issues/views/MY_ISSUES'
      );
      const response = await GET(request, {
        params: { key: 'MY_ISSUES' },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL');
    });

    it('should handle authentication errors', async () => {
      const mockError = new Error('UNAUTHENTICATED') as Error & { code?: string };
      mockError.code = 'UNAUTHENTICATED';
      (getPresetViewResults as jest.Mock).mockRejectedValue(mockError);

      const request = mockRequest(
        'http://localhost:3000/api/issues/views/MY_ISSUES'
      );
      const response = await GET(request, {
        params: { key: 'MY_ISSUES' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHENTICATED');
    });

    it('should handle permission errors', async () => {
      const mockError = new Error('FORBIDDEN') as Error & { code?: string };
      mockError.code = 'FORBIDDEN';
      (getPresetViewResults as jest.Mock).mockRejectedValue(mockError);

      const request = mockRequest(
        'http://localhost:3000/api/issues/views/MY_ISSUES'
      );
      const response = await GET(request, {
        params: { key: 'MY_ISSUES' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('FORBIDDEN');
    });

    it('should return CLOSED_ISSUES results', async () => {
      const mockResult = {
        view: {
          key: 'CLOSED_ISSUES',
          name: 'Closed Issues',
          description: 'All closed issues across your projects',
        },
        items: [
          { id: 'issue-1', title: 'Issue 1', status: 'CLOSED' },
          { id: 'issue-2', title: 'Issue 2', status: 'CLOSED' },
        ],
        total: 5,
      };

      (getPresetViewResults as jest.Mock).mockResolvedValue(mockResult);

      const request = mockRequest(
        'http://localhost:3000/api/issues/views/CLOSED_ISSUES'
      );
      const response = await GET(request, {
        params: { key: 'CLOSED_ISSUES' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(getPresetViewResults).toHaveBeenCalledWith({
        key: 'CLOSED_ISSUES',
        limit: undefined,
        offset: undefined,
      });
    });
  });
});