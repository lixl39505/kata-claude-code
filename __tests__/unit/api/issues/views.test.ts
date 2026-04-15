/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET } from '@/app/api/issues/views/route';
import { getPresetViews } from '@/lib/services/issue';
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
  getPresetViews: jest.fn(),
}));

describe('Issue Views API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/issues/views', () => {
    it('should return list of preset views', async () => {
      const mockViews = [
        {
          key: 'MY_ISSUES',
          name: 'My Issues',
          description: 'Issues assigned to you',
        },
        {
          key: 'OPEN_ISSUES',
          name: 'Open Issues',
          description: 'All open issues across your projects',
        },
        {
          key: 'CLOSED_ISSUES',
          name: 'Closed Issues',
          description: 'All closed issues across your projects',
        },
      ];

      (getPresetViews as jest.Mock).mockReturnValue(mockViews);

      const request = mockRequest('http://localhost:3000/api/issues/views');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        items: mockViews,
      });
      expect(getPresetViews).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const mockError = new Error('Service error');
      (getPresetViews as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const request = mockRequest('http://localhost:3000/api/issues/views');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL');
    });
  });
});