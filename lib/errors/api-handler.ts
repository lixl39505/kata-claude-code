import { NextResponse, NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { AppError, type ApiError, type ErrorCode } from './index';

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  INVALID_STATE_TRANSITION: 400,
  CONFLICT: 409,
  INTERNAL: 500,
};

/**
 * Format Zod error for API response
 */
function formatZodError(error: ZodError): ApiError {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    details: error.issues,
  };
}

/**
 * Format AppError for API response
 */
function formatAppError(error: AppError): ApiError {
  return {
    code: error.code,
    message: error.message,
    details: error.details,
  };
}

/**
 * Format unexpected error for API response
 */
function formatUnexpectedError(): ApiError {
  return {
    code: 'INTERNAL',
    message: 'Internal server error',
    details: undefined,
  };
}

/**
 * Get HTTP status code for error
 */
function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return ERROR_STATUS_MAP[error.code] || 500;
  }

  if (error instanceof ZodError) {
    return 400;
  }

  return 500;
}

/**
 * Handle API error and return appropriate NextResponse
 *
 * This function provides unified error handling for all API endpoints:
 * - Maps error codes to appropriate HTTP status codes
 * - Prevents leaking internal error details
 * - Ensures consistent error response structure
 *
 * @param error - The caught error
 * @param context - Context information for logging (e.g., endpoint name)
 * @returns NextResponse with appropriate status code and error structure
 *
 * @example
 * try {
 *   // ... API logic
 * } catch (error) {
 *   return handleApiError(error, 'createProject');
 * }
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  // Log unexpected errors with context
  if (!(error instanceof AppError) && !(error instanceof ZodError)) {
    console.error(`Unexpected error in ${context}:`, error);
  }

  let apiError: ApiError;

  if (error instanceof ZodError) {
    apiError = formatZodError(error);
  } else if (error instanceof AppError) {
    apiError = formatAppError(error);
  } else {
    apiError = formatUnexpectedError();
  }

  const statusCode = getStatusCode(error);

  return NextResponse.json(apiError, { status: statusCode });
}

/**
 * Type-safe API route handler wrapper
 *
 * Wraps an async API route handler with automatic error handling.
 *
 * @param handler - The async handler function
 * @param context - Context information for error logging
 * @returns Wrapped handler with error handling
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   // ... handler logic
 * }, 'listProjects');
 */
export function withErrorHandler<T extends NextRequest>(
  handler: (request: T, ...args: unknown[]) => Promise<NextResponse>,
  context: string
) {
  return async (request: T, ...args: unknown[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}