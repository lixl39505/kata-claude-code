/**
 * Tests for log sanitizer
 */

import { describe, it, expect } from '@jest/globals';
import {
  sanitizeObject,
  sanitizeContext,
  maskSensitive,
  isSensitiveField,
} from '../sanitizer';

describe('Log Sanitizer', () => {
  describe('isSensitiveField', () => {
    it('should detect password as sensitive', () => {
      expect(isSensitiveField('password')).toBe(true);
      expect(isSensitiveField('Password')).toBe(true);
      expect(isSensitiveField('PASSWORD')).toBe(true);
    });

    it('should detect passwordHash as sensitive', () => {
      expect(isSensitiveField('passwordHash')).toBe(true);
      expect(isSensitiveField('password_hash')).toBe(true);
    });

    it('should detect token fields as sensitive', () => {
      expect(isSensitiveField('token')).toBe(true);
      expect(isSensitiveField('sessionToken')).toBe(true);
      expect(isSensitiveField('accessToken')).toBe(true);
      expect(isSensitiveField('refreshToken')).toBe(true);
    });

    it('should detect secret fields as sensitive', () => {
      expect(isSensitiveField('secret')).toBe(true);
      expect(isSensitiveField('apiSecret')).toBe(true);
      expect(isSensitiveField('apiKey')).toBe(true);
    });

    it('should detect authorization as sensitive', () => {
      expect(isSensitiveField('authorization')).toBe(true);
      expect(isSensitiveField('Authorization')).toBe(true);
    });

    it('should detect cookie as sensitive', () => {
      expect(isSensitiveField('cookie')).toBe(true);
      expect(isSensitiveField('Cookie')).toBe(true);
    });

    it('should not mark normal fields as sensitive', () => {
      expect(isSensitiveField('name')).toBe(false);
      expect(isSensitiveField('email')).toBe(false);
      expect(isSensitiveField('userId')).toBe(false);
      expect(isSensitiveField('projectId')).toBe(false);
      expect(isSensitiveField('title')).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should redact sensitive fields', () => {
      const obj = {
        name: 'John',
        email: 'john@example.com',
        password: 'secret123',
        token: 'abc123',
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.name).toBe('John');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          password: 'secret123',
        },
        project: {
          apiKey: 'key123',
        },
      };

      const sanitized = sanitizeObject(obj);

      expect((sanitized.user as { name: string; password: string }).name).toBe('John');
      expect((sanitized.user as { name: string; password: string }).password).toBe('[REDACTED]');
      expect((sanitized.project as { apiKey: string }).apiKey).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const obj = {
        users: [
          { name: 'John', password: 'secret1' },
          { name: 'Jane', password: 'secret2' },
        ],
      };

      const sanitized = sanitizeObject(obj);

      expect((sanitized.users as Array<{ name: string; password: string }>)[0].name).toBe('John');
      expect((sanitized.users as Array<{ name: string; password: string }>)[0].password).toBe('[REDACTED]');
      expect((sanitized.users as Array<{ name: string; password: string }>)[1].name).toBe('Jane');
      expect((sanitized.users as Array<{ name: string; password: string }>)[1].password).toBe('[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      const obj = {
        name: 'John',
        email: null,
        password: undefined,
        token: 'secret',
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.name).toBe('John');
      expect(sanitized.email).toBeNull();
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should handle empty objects', () => {
      const obj = {};
      const sanitized = sanitizeObject(obj);

      expect(sanitized).toEqual({});
    });
  });

  describe('sanitizeContext', () => {
    it('should return undefined when context is undefined', () => {
      const result = sanitizeContext(undefined);
      expect(result).toBeUndefined();
    });

    it('should sanitize context object', () => {
      const context = {
        userId: '123',
        password: 'secret',
      };

      const result = sanitizeContext(context);

      expect(result).toBeDefined();
      expect(result?.userId).toBe('123');
      expect(result?.password).toBe('[REDACTED]');
    });
  });

  describe('maskSensitive', () => {
    it('should return redaction string', () => {
      expect(maskSensitive()).toBe('[REDACTED]');
    });
  });

  describe('edge cases', () => {
    it('should handle mixed case field names', () => {
      const obj = {
        Password: 'secret1',
        PASSWORD: 'secret2',
        PassWord: 'secret3',
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.Password).toBe('[REDACTED]');
      expect(sanitized.PASSWORD).toBe('[REDACTED]');
      expect(sanitized.PassWord).toBe('[REDACTED]');
    });

    it('should handle snake_case field names', () => {
      const obj = {
        password_hash: 'hash1',
        api_key: 'key1',
        access_token: 'token1',
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.password_hash).toBe('[REDACTED]');
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.access_token).toBe('[REDACTED]');
    });

    it('should handle deeply nested structures', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              password: 'deep-secret',
            },
          },
        },
      };

      const sanitized = sanitizeObject(obj);

      expect(((sanitized.level1 as { level2: unknown }).level2 as { level3: { password: string } }).level3.password).toBe('[REDACTED]');
    });
  });
});
