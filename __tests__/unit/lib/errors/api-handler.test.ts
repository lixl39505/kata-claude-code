// Mock Next.js server dependencies before importing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

import { ZodError } from 'zod';
import { handleApiError } from '@/lib/errors/api-handler';
import {
  UnauthenticatedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  InvalidStateTransitionError,
  ConflictError,
  InternalError,
  AppError,
} from '@/lib/errors';

describe('API Error Handler', () => {
  describe('Validation Errors', () => {
    it('should return VALIDATION_ERROR with Zod error details', () => {
      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 8,
          path: ['password'],
          message: 'Password must be at least 8 characters',
          inclusive: true,
          exact: true,
        } as import('zod').ZodIssue,
      ]);

      const response = handleApiError(zodError, 'testEndpoint');
      const data = response.json();

      expect(response.status).toBe(400);
      expect(data).resolves.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'too_small',
            minimum: 8,
            path: ['password'],
            message: 'Password must be at least 8 characters',
          }),
        ]),
      });
    });

    it('should return VALIDATION_ERROR with details from ValidationError', () => {
      const details = { field: 'email', issue: 'Invalid format' };
      const error = new ValidationError('Validation failed', details);

      const response = handleApiError(error, 'testEndpoint');
      const data = response.json();

      expect(response.status).toBe(400);
      expect(data).resolves.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      });
    });
  });

  describe('Authentication Errors', () => {
    it('should return UNAUTHENTICATED with 401 status', () => {
      const error = new UnauthenticatedError('Authentication required');

      const response = handleApiError(error, 'protectedEndpoint');
      const data = response.json();

      expect(response.status).toBe(401);
      expect(data).resolves.toMatchObject({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    });

    it('should return default UNAUTHENTICATED message when not provided', () => {
      const error = new UnauthenticatedError();

      const response = handleApiError(error, 'protectedEndpoint');
      const data = response.json();

      expect(response.status).toBe(401);
      expect(data).resolves.toMatchObject({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    });
  });

  describe('Authorization Errors', () => {
    it('should return FORBIDDEN with 403 status', () => {
      const error = new ForbiddenError('Access denied');

      const response = handleApiError(error, 'adminOnlyEndpoint');
      const data = response.json();

      expect(response.status).toBe(403);
      expect(data).resolves.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    });

    it('should return default FORBIDDEN message when not provided', () => {
      const error = new ForbiddenError();

      const response = handleApiError(error, 'protectedEndpoint');
      const data = response.json();

      expect(response.status).toBe(403);
      expect(data).resolves.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    });
  });

  describe('Not Found Errors', () => {
    it('should return NOT_FOUND with 404 status', () => {
      const error = new NotFoundError('Project');

      const response = handleApiError(error, 'getProject');
      const data = response.json();

      expect(response.status).toBe(404);
      expect(data).resolves.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    });

    it('should handle different resource types', () => {
      const userError = new NotFoundError('User');
      const issueError = new NotFoundError('Issue');

      const userResponse = handleApiError(userError, 'getUser');
      const issueResponse = handleApiError(issueError, 'getIssue');

      expect(userResponse.status).toBe(404);
      expect(issueResponse.status).toBe(404);

      expect(userResponse.json()).resolves.toMatchObject({
        code: 'NOT_FOUND',
        message: 'User not found',
      });

      expect(issueResponse.json()).resolves.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Issue not found',
      });
    });
  });

  describe('Invalid State Transition Errors', () => {
    it('should return INVALID_STATE_TRANSITION with 400 status', () => {
      const error = new InvalidStateTransitionError('OPEN', 'CLOSED');

      const response = handleApiError(error, 'updateIssueState');
      const data = response.json();

      expect(response.status).toBe(400);
      expect(data).resolves.toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        message: 'Cannot transition from OPEN to CLOSED',
      });
    });

    it('should handle different state transitions', () => {
      const error1 = new InvalidStateTransitionError('CLOSED', 'OPEN');
      const error2 = new InvalidStateTransitionError('TODO', 'IN_PROGRESS');

      const response1 = handleApiError(error1, 'transition1');
      const response2 = handleApiError(error2, 'transition2');

      expect(response1.status).toBe(400);
      expect(response2.status).toBe(400);

      expect(response1.json()).resolves.toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        message: 'Cannot transition from CLOSED to OPEN',
      });

      expect(response2.json()).resolves.toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        message: 'Cannot transition from TODO to IN_PROGRESS',
      });
    });
  });

  describe('Conflict Errors', () => {
    it('should return CONFLICT with 409 status', () => {
      const error = new ConflictError('Resource already exists');

      const response = handleApiError(error, 'createResource');
      const data = response.json();

      expect(response.status).toBe(409);
      expect(data).resolves.toMatchObject({
        code: 'CONFLICT',
        message: 'Resource already exists',
      });
    });

    it('should include conflict details when provided', () => {
      const details = {
        currentIssue: {
          id: '123',
          title: 'Original title',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };
      const error = new ConflictError(
        'Issue has been modified by another user',
        details
      );

      const response = handleApiError(error, 'updateIssue');
      const data = response.json();

      expect(response.status).toBe(409);
      expect(data).resolves.toMatchObject({
        code: 'CONFLICT',
        message: 'Issue has been modified by another user',
        details,
      });
    });

    it('should handle optimistic locking conflicts', () => {
      const conflictDetails = {
        currentVersion: 5,
        attemptedVersion: 3,
        conflictingField: 'updatedAt',
      };
      const error = new ConflictError(
        'Optimistic lock conflict',
        conflictDetails
      );

      const response = handleApiError(error, 'concurrentUpdate');
      const data = response.json();

      expect(response.status).toBe(409);
      expect(data).resolves.toMatchObject({
        code: 'CONFLICT',
        message: 'Optimistic lock conflict',
        details: conflictDetails,
      });
    });
  });

  describe('Internal Errors and Information Leakage Prevention', () => {
    it('should return INTERNAL with 500 status for generic AppError', () => {
      const error = new InternalError('Something went wrong');

      const response = handleApiError(error, 'failingEndpoint');
      const data = response.json();

      expect(response.status).toBe(500);
      expect(data).resolves.toMatchObject({
        code: 'INTERNAL',
        message: 'Something went wrong',
      });
    });

    it('should not leak stack traces for unexpected errors', () => {
      const error = new Error('Database connection failed');
      error.stack = 'Error: Database connection failed\n    at Connection...';

      const response = handleApiError(error, 'dbEndpoint');
      const data = response.json();

      expect(response.status).toBe(500);
      expect(data).resolves.toMatchObject({
        code: 'INTERNAL',
        message: 'Internal server error',
      });

      // Ensure stack trace is not in response
      expect(data).resolves.not.toHaveProperty('stack');
    });

    it('should not leak database error details', () => {
      const dbError = new Error(
        'SELECT * FROM users WHERE email = \'\' OR \'1\'=\'\''
      );
      dbError.stack = 'Detailed stack trace...';

      const response = handleApiError(dbError, 'queryEndpoint');
      const data = response.json();

      expect(response.status).toBe(500);
      expect(data).resolves.toMatchObject({
        code: 'INTERNAL',
        message: 'Internal server error',
      });

      // Ensure SQL query is not in response
      expect(data).resolves.not.toHaveProperty('details');
      const responseData = JSON.parse(JSON.stringify(data));
      expect(JSON.stringify(responseData)).not.toContain('SELECT');
    });

    it('should not leak internal exception information', () => {
      class InternalError extends Error {
        constructor() {
          super('Internal implementation details exposed');
          this.name = 'InternalDatabaseConnectionError';
        }
      }

      const error = new InternalError();

      const response = handleApiError(error, 'internalEndpoint');
      const data = response.json();

      expect(response.status).toBe(500);
      expect(data).resolves.toMatchObject({
        code: 'INTERNAL',
        message: 'Internal server error',
      });

      // Ensure internal error type is not exposed
      expect(data).resolves.not.toHaveProperty('name');
    });

    it('should log unexpected errors server-side', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Unexpected error');

      handleApiError(error, 'unexpectedEndpoint');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error in unexpectedEndpoint:',
        error
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not log AppError or ZodError as unexpected', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const appError = new UnauthenticatedError('Auth failed');
      const zodError = new ZodError([]);

      handleApiError(appError, 'authEndpoint');
      handleApiError(zodError, 'validationEndpoint');

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Response Structure Consistency', () => {
    it('should always return consistent structure for all error types', async () => {
      const errors = [
        new ZodError([]),
        new UnauthenticatedError(),
        new ForbiddenError(),
        new ValidationError('Invalid', {}),
        new NotFoundError('Resource'),
        new InvalidStateTransitionError('A', 'B'),
        new ConflictError('Conflict'),
        new InternalError('Server error'),
        new Error('Unknown error'),
      ];

      for (const error of errors) {
        const response = handleApiError(error, 'testEndpoint');
        const data = await response.json();

        // All responses should have code and message
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');

        // code should be one of the defined error codes
        expect([
          'VALIDATION_ERROR',
          'UNAUTHENTICATED',
          'FORBIDDEN',
          'NOT_FOUND',
          'INVALID_STATE_TRANSITION',
          'CONFLICT',
          'INTERNAL',
        ]).toContain(data.code);

        // message should be a string
        expect(typeof data.message).toBe('string');

        // details should only be present when explicitly provided
        if (error instanceof AppError && error.details) {
          expect(data).toHaveProperty('details');
        } else if (error instanceof ZodError) {
          expect(data).toHaveProperty('details');
        } else {
          // For unexpected errors, details should not be present
          if (!(error instanceof AppError) && !(error instanceof ZodError)) {
            expect(data.details).toBeUndefined();
          }
        }
      }
    });

    it('should return proper HTTP status codes for each error type', () => {
      const testCases = [
        { error: new ZodError([]), expectedStatus: 400 },
        { error: new UnauthenticatedError(), expectedStatus: 401 },
        { error: new ForbiddenError(), expectedStatus: 403 },
        { error: new ValidationError('Invalid', {}), expectedStatus: 400 },
        { error: new NotFoundError('Resource'), expectedStatus: 404 },
        {
          error: new InvalidStateTransitionError('A', 'B'),
          expectedStatus: 400,
        },
        { error: new ConflictError('Conflict'), expectedStatus: 409 },
        { error: new InternalError('Error'), expectedStatus: 500 },
        { error: new Error('Unknown'), expectedStatus: 500 },
      ];

      for (const { error, expectedStatus } of testCases) {
        const response = handleApiError(error, 'testEndpoint');
        expect(response.status).toBe(expectedStatus);
      }
    });

    it('should always return NextResponse objects', () => {
      const errors = [
        new ZodError([]),
        new UnauthenticatedError(),
        new Error('Unknown'),
      ];

      for (const error of errors) {
        const response = handleApiError(error, 'testEndpoint');
        // All responses should have status and json methods
        expect(typeof response.status).toBe('number');
        expect(typeof response.json).toBe('function');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors with undefined details', () => {
      const error = new ConflictError('Conflict without details');
      const response = handleApiError(error, 'testEndpoint');
      const data = response.json();

      expect(response.status).toBe(409);
      expect(data).resolves.toMatchObject({
        code: 'CONFLICT',
        message: 'Conflict without details',
      });
    });

    it('should handle errors with complex details objects', () => {
      const complexDetails = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        field: 'value',
      };
      const error = new ConflictError('Complex conflict', complexDetails);
      const response = handleApiError(error, 'testEndpoint');
      const data = response.json();

      expect(response.status).toBe(409);
      expect(data).resolves.toMatchObject({
        code: 'CONFLICT',
        message: 'Complex conflict',
        details: complexDetails,
      });
    });

    it('should handle null and undefined errors gracefully', () => {
      // This should not happen in practice, but let's be defensive
      const response = handleApiError(undefined, 'testEndpoint');
      const data = response.json();

      expect(response.status).toBe(500);
      expect(data).resolves.toMatchObject({
        code: 'INTERNAL',
        message: 'Internal server error',
      });
    });
  });
});