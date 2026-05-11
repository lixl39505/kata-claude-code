/**
 * Tests for request context
 */

import { describe, it, expect } from '@jest/globals';
import {
  createRequestContext,
  initRequestContext,
  getRequestContext,
  getRequestId,
  getRequestUserId,
  withRequestContext,
} from '../request-context';

describe('RequestContext', () => {
  describe('createRequestContext', () => {
    it('should create request context with generated requestId', () => {
      const context = createRequestContext();

      expect(context).toBeDefined();
      expect(context.requestId).toBeDefined();
      expect(typeof context.requestId).toBe('string');
      expect(context.requestId.length).toBeGreaterThan(0);
      expect(context.userId).toBeUndefined();
    });

    it('should create request context with userId', () => {
      const userId = 'user-123';
      const context = createRequestContext(userId);

      expect(context.userId).toBe(userId);
    });

    it('should generate unique requestIds', () => {
      const context1 = createRequestContext();
      const context2 = createRequestContext();

      expect(context1.requestId).not.toBe(context2.requestId);
    });
  });

  describe('initRequestContext', () => {
    it('should create context without requestId in headers', () => {
      const headers = new Headers();
      const context = initRequestContext(headers, 'user-123');

      expect(context.requestId).toBeDefined();
      expect(context.userId).toBe('user-123');
    });

    it('should use existing requestId from headers', () => {
      const headers = new Headers();
      const existingRequestId = 'existing-request-id-123';
      headers.set('x-request-id', existingRequestId);

      const context = initRequestContext(headers);

      expect(context.requestId).toBe(existingRequestId);
    });

    it('should handle headers without userId', () => {
      const headers = new Headers();
      const context = initRequestContext(headers);

      expect(context.requestId).toBeDefined();
      expect(context.userId).toBeUndefined();
    });
  });

  describe('withRequestContext', () => {
    it('should run function with request context', () => {
      const context = createRequestContext('user-456');
      let capturedContext: typeof context | undefined;

      withRequestContext(context, () => {
        capturedContext = getRequestContext();
      });

      expect(capturedContext).toEqual(context);
    });

    it('should isolate context between different calls', () => {
      const context1 = createRequestContext('user-1');
      const context2 = createRequestContext('user-2');

      let result1: string | undefined;
      let result2: string | undefined;

      withRequestContext(context1, () => {
        result1 = getRequestUserId();
      });

      withRequestContext(context2, () => {
        result2 = getRequestUserId();
      });

      expect(result1).toBe('user-1');
      expect(result2).toBe('user-2');
    });

    it('should return function result', () => {
      const context = createRequestContext();
      const result = withRequestContext(context, () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });
  });

  describe('getRequestContext', () => {
    it('should return undefined outside of request context', () => {
      const context = getRequestContext();
      expect(context).toBeUndefined();
    });

    it('should return current request context inside withRequestContext', () => {
      const expectedContext = createRequestContext('user-789');
      let actualContext: typeof expectedContext | undefined;

      withRequestContext(expectedContext, () => {
        actualContext = getRequestContext();
      });

      expect(actualContext).toEqual(expectedContext);
    });
  });

  describe('getRequestId', () => {
    it('should return undefined outside of request context', () => {
      const requestId = getRequestId();
      expect(requestId).toBeUndefined();
    });

    it('should return requestId inside request context', () => {
      const context = createRequestContext();
      let requestId: string | undefined;

      withRequestContext(context, () => {
        requestId = getRequestId();
      });

      expect(requestId).toBe(context.requestId);
    });
  });

  describe('getRequestUserId', () => {
    it('should return undefined outside of request context', () => {
      const userId = getRequestUserId();
      expect(userId).toBeUndefined();
    });

    it('should return userId when present in context', () => {
      const context = createRequestContext('user-999');
      let userId: string | undefined;

      withRequestContext(context, () => {
        userId = getRequestUserId();
      });

      expect(userId).toBe('user-999');
    });

    it('should return undefined when userId not in context', () => {
      const context = createRequestContext();
      let userId: string | undefined;

      withRequestContext(context, () => {
        userId = getRequestUserId();
      });

      expect(userId).toBeUndefined();
    });
  });
});
