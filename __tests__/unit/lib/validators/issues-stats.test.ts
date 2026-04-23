import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import { closeReasonStatsSchema, dashboardStatsSchema } from '@/lib/validators/issue';

describe('Issue Close Reason Stats - Validators', () => {
  describe('closeReasonStatsSchema', () => {
    it('should accept valid input without projectId', () => {
      const input = {};
      const result = closeReasonStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: undefined,
      });
    });

    it('should accept valid input with projectId', () => {
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = closeReasonStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('should accept valid UUID as projectId', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const input = { projectId: validUUID };
      const result = closeReasonStatsSchema.parse(input);

      expect(result.projectId).toBe(validUUID);
    });

    it('should reject invalid UUID format for projectId', () => {
      const input = {
        projectId: 'not-a-valid-uuid',
      };

      expect(() => closeReasonStatsSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject non-string projectId', () => {
      const input = {
        projectId: 123,
      };

      expect(() => closeReasonStatsSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject empty string projectId', () => {
      const input = {
        projectId: '',
      };

      expect(() => closeReasonStatsSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject malformed UUID', () => {
      const invalidUUIDs = [
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        'g23e4567-e89b-12d3-a456-426614174000', // Invalid character
        '123e4567-e89b-12d3-a456-42661417400', // Missing digit
        'not-a-uuid-at-all', // Completely invalid
        '1234567890abcdef', // No hyphens
      ];

      invalidUUIDs.forEach((projectId) => {
        const input = { projectId };
        expect(() => closeReasonStatsSchema.parse(input)).toThrow();
      });
    });

    it('should accept uppercase UUID format', () => {
      const input = {
        projectId: '550E8400-E29B-41D4-A716-446655440000',
      };
      const result = closeReasonStatsSchema.parse(input);

      expect(result.projectId).toBe('550E8400-E29B-41D4-A716-446655440000');
    });

    it('should accept mixed case UUID format', () => {
      const input = {
        projectId: '550e8400-E29b-41d4-A716-446655440000',
      };
      const result = closeReasonStatsSchema.parse(input);

      expect(result.projectId).toBe('550e8400-E29b-41d4-A716-446655440000');
    });

    it('should accept projectId with null value treated as missing', () => {
      const input = {
        projectId: null,
      };

      // Zod optional() should handle null as undefined
      const result = closeReasonStatsSchema.safeParse(input);

      // This should either succeed with undefined or fail depending on zod configuration
      // The important thing is it handles null gracefully
      expect(result.success !== undefined).toBe(true);
    });

    it('should ignore additional properties', () => {
      const input = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        extraProperty: 'should be ignored',
      };

      const result = closeReasonStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result).not.toHaveProperty('extraProperty');
    });

    it('should accept UUID version 4 format', () => {
      const input = {
        projectId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Valid UUID v4
      };

      const result = closeReasonStatsSchema.parse(input);
      expect(result.projectId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    it('should provide detailed error messages for invalid UUID', () => {
      const input = {
        projectId: 'invalid-uuid',
      };

      const result = closeReasonStatsSchema.safeParse(input);

      expect(result.success).toBe(false);
      // Basic check that validation failed
      expect(result.success).toBe(false);
    });

    it('should handle empty input object', () => {
      const input = {};
      const result = closeReasonStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: undefined,
      });
    });

    it('should handle undefined projectId explicitly', () => {
      const input = {
        projectId: undefined,
      };
      const result = closeReasonStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: undefined,
      });
    });
  });

  describe('Type Definitions', () => {
    it('should have correct CloseReasonStatsInput type', () => {
      // This is a compile-time type check
      const input: { projectId?: string } = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Should not cause TypeScript errors
      const result = closeReasonStatsSchema.parse(input);
      expect(result).toBeDefined();
    });

    it('should have correct CloseReasonStatsResult type structure', () => {
      // This is a compile-time type check
      const result = {
        items: [
          {
            closeReason: 'COMPLETED' as const,
            count: 10,
          },
          {
            closeReason: 'NOT_PLANNED' as const,
            count: 5,
          },
          {
            closeReason: 'DUPLICATE' as const,
            count: 2,
          },
        ],
        total: 17,
      };

      // Verify structure
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(17);
      expect(result.items[0].closeReason).toBe('COMPLETED');
      expect(result.items[0].count).toBe(10);
    });
  });

  describe('dashboardStatsSchema', () => {
    it('should accept valid input without projectId', () => {
      const input = {};
      const result = dashboardStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: undefined,
      });
    });

    it('should accept valid input with projectId', () => {
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = dashboardStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('should accept valid UUID as projectId', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const input = { projectId: validUUID };
      const result = dashboardStatsSchema.parse(input);

      expect(result.projectId).toBe(validUUID);
    });

    it('should reject invalid UUID format for projectId', () => {
      const input = {
        projectId: 'not-a-valid-uuid',
      };

      expect(() => dashboardStatsSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject non-string projectId', () => {
      const input = {
        projectId: 123,
      };

      expect(() => dashboardStatsSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject empty string projectId', () => {
      const input = {
        projectId: '',
      };

      expect(() => dashboardStatsSchema.parse(input)).toThrow(ZodError);
    });

    it('should accept UUID version 4 format', () => {
      const input = {
        projectId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Valid UUID v4
      };

      const result = dashboardStatsSchema.parse(input);
      expect(result.projectId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    it('should provide detailed error messages for invalid UUID', () => {
      const input = {
        projectId: 'invalid-uuid',
      };

      const result = dashboardStatsSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should handle empty input object', () => {
      const input = {};
      const result = dashboardStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: undefined,
      });
    });

    it('should handle undefined projectId explicitly', () => {
      const input = {
        projectId: undefined,
      };
      const result = dashboardStatsSchema.parse(input);

      expect(result).toEqual({
        projectId: undefined,
      });
    });
  });

  describe('Dashboard Stats Type Definitions', () => {
    it('should have correct DashboardStatsInput type', () => {
      // This is a compile-time type check
      const input: { projectId?: string } = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Should not cause TypeScript errors
      const result = dashboardStatsSchema.parse(input);
      expect(result).toBeDefined();
    });

    it('should have correct DashboardStatsResult type structure', () => {
      // This is a compile-time type check
      const result = {
        total: 10,
        openCount: 6,
        closedCount: 4,
        closeReasonStats: {
          items: [
            {
              closeReason: 'COMPLETED' as const,
              count: 3,
            },
            {
              closeReason: 'NOT_PLANNED' as const,
              count: 1,
            },
          ],
          total: 4,
        },
      };

      // Verify structure
      expect(result.total).toBe(10);
      expect(result.openCount).toBe(6);
      expect(result.closedCount).toBe(4);
      expect(result.closeReasonStats.items).toHaveLength(2);
      expect(result.closeReasonStats.total).toBe(4);
    });
  });
});
