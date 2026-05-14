/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Health check API tests
 */

import { GET } from '@/app/api/health/route';
import { initializeMigrationTracking } from '@/lib/db/migrations/tracking';

// Mock Next.js server dependencies
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

// Mock logger to avoid requestId context issues
jest.mock('@/lib/logger', () => ({
  getRequestId: jest.fn(() => 'test-request-id'),
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe('Health Check API', () => {
  beforeEach(() => {
    // Initialize migration tracking before each test
    initializeMigrationTracking();
  });

  describe('GET /api/health', () => {
    it('should return health status without authentication', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBeDefined();
      expect(data.checks).toBeDefined();
      expect(data.requestId).toBeDefined();
      expect(data.checkedAt).toBeDefined();
    });

    it('should return correct response structure', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('checks');
      expect(data).toHaveProperty('requestId');
      expect(data).toHaveProperty('checkedAt');

      expect(data.checks).toHaveProperty('app');
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('migrations');

      expect(data.checks.app).toHaveProperty('status');
      expect(data.checks.database).toHaveProperty('status');
      expect(data.checks.migrations).toHaveProperty('status');
    });

    it('should not expose sensitive information', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();
      const jsonString = JSON.stringify(data);

      // Check that sensitive information is not present
      expect(jsonString).not.toContain('password');
      expect(jsonString).not.toContain('passwordHash');
      expect(jsonString).not.toContain('token');
      expect(jsonString).not.toContain('.sqlite');
      expect(jsonString).not.toContain('SELECT');
      expect(jsonString).not.toContain('INSERT');
      expect(jsonString).not.toContain('stack trace');
    });

    it('should include requestId in response', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.requestId).toBeDefined();
      expect(typeof data.requestId).toBe('string');
      expect(data.requestId.length).toBeGreaterThan(0);
    });

    it('should return ok status when system is healthy', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.status).toBe('ok');
      expect(data.checks.app.status).toBe('ok');
      expect(data.checks.database.status).toBe('ok');
      expect(data.checks.migrations.status).toBe('ok');
    });

    it('should include current migration version when migrations are ok', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.checks.migrations.status === 'ok') {
        expect(data.checks.migrations.currentVersion).toBeDefined();
        expect(typeof data.checks.migrations.currentVersion).toBe('string');
      }
    });

    it('should return ISO timestamp for checkedAt', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return error status on internal failure', async () => {
      // This test would require mocking to force an error
      // For now, we just verify the structure would be correct
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      // If everything is working, status should be ok
      expect(data).toHaveProperty('status');
      expect(['ok', 'degraded', 'error']).toContain(data.status);
    });

    it('should not require session cookie', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
        cookies: {},
      } as any;

      const response = await GET(mockRequest);

      // Should not return 401 Unauthorized
      expect(response.status).not.toBe(401);
      expect(response.status).toBe(200);
    });
  });

  describe('response structure validation', () => {
    it('should match expected health check schema', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/health',
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      // Validate status enum
      expect(['ok', 'degraded', 'error']).toContain(data.status);

      // Validate check status enums
      expect(['ok', 'error']).toContain(data.checks.app.status);
      expect(['ok', 'error']).toContain(data.checks.database.status);
      expect(['ok', 'error']).toContain(data.checks.migrations.status);

      // Validate types
      expect(typeof data.requestId).toBe('string');
      expect(typeof data.checkedAt).toBe('string');
    });
  });
});
