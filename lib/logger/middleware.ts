/**
 * API request logging middleware
 * Logs request details and response status
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  withRequestContext,
  initRequestContext,
  getRequestContext,
} from './request-context';
import { logInfo, logError } from './logger';
import { sanitizeContext } from './sanitizer';

/**
 * Extract user ID from request context
 */
async function extractUserId(): Promise<string | undefined> {
  try {
    const { getSession } = await import('@/lib/auth/session');
    const session = await getSession();
    return session.userId || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Log API request
 */
function logRequest(
  method: string,
  path: string,
  userId: string | undefined,
  requestId: string
): void {
  logInfo('API Request', {
    method,
    path,
    userId,
    requestId,
  });
}

/**
 * Log API response
 */
function logResponse(
  method: string,
  path: string,
  status: number,
  userId: string | undefined,
  requestId: string
): void {
  const level = status >= 400 ? 'error' : 'info';

  if (level === 'error') {
    logError('API Response', {
      method,
      path,
      status,
      userId,
      requestId,
    });
  } else {
    logInfo('API Response', {
      method,
      path,
      status,
      userId,
      requestId,
    });
  }
}

/**
 * Log API error
 */
export function logApiError(
  method: string,
  path: string,
  error: unknown,
  requestId: string,
  userId?: string
): void {
  const sanitizedError = sanitizeContext({
    name: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error),
  });

  logError('API Error', {
    method,
    path,
    error: sanitizedError,
    userId,
    requestId,
  });
}

/**
 * Wrap API route handler with logging
 */
export function withLogging<T extends NextRequest>(
  handler: (request: T, ...args: unknown[]) => Promise<NextResponse>,
  context: { methodName: string; path: string }
) {
  return async (request: T, ...args: unknown[]): Promise<NextResponse> => {
    const headersList = await headers();
    const userId = await extractUserId();

    // Initialize request context
    const requestContext = initRequestContext(headersList, userId);

    return withRequestContext(requestContext, async () => {
      const requestId = getRequestContext()?.requestId || 'unknown';

      try {
        // Log request
        logRequest(context.methodName, context.path, userId, requestId);

        // Execute handler
        const response = await handler(request, ...args);

        // Log response
        logResponse(context.methodName, context.path, response.status, userId, requestId);

        // Add requestId to response headers
        response.headers.set('x-request-id', requestId);

        return response;
      } catch (error) {
        // Log error
        logApiError(context.methodName, context.path, error, requestId, userId);

        // Re-throw for error handler to process
        throw error;
      }
    });
  };
}
