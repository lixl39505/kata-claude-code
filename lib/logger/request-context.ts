/**
 * Request context management using AsyncLocalStorage
 * Maintains requestId and userId throughout the request lifecycle
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
}

const requestStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${random}`;
}

/**
 * Get current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestStorage.getStore();
}

/**
 * Get current request ID
 */
export function getRequestId(): string | undefined {
  return requestStorage.getStore()?.requestId;
}

/**
 * Get current user ID from request context
 */
export function getRequestUserId(): string | undefined {
  return requestStorage.getStore()?.userId;
}

/**
 * Set request context for the current async scope
 */
export function setRequestContext(context: RequestContext): void {
  requestStorage.enterWith(context);
}

/**
 * Run a function with request context
 */
export function withRequestContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  return requestStorage.run(context, fn);
}

/**
 * Create a new request context with a generated requestId
 */
export function createRequestContext(userId?: string): RequestContext {
  return {
    requestId: generateRequestId(),
    userId,
  };
}

/**
 * Initialize request context from headers
 * Uses existing requestId from header if provided, otherwise generates new one
 */
export function initRequestContext(headers: Headers, userId?: string): RequestContext {
  const existingRequestId = headers.get('x-request-id');
  return {
    requestId: existingRequestId || generateRequestId(),
    userId,
  };
}
