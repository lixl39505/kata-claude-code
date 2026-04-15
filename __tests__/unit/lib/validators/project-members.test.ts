import {
  addProjectMemberSchema,
  removeProjectMemberSchema,
  listProjectMembersSchema,
} from '@/lib/validators/project-members';
import { ZodError } from 'zod';

describe('Project Member Validators', () => {
  describe('addProjectMemberSchema', () => {
    it('should validate valid input with default role', () => {
      const input = {
        userId: 'user-123',
      };

      const result = addProjectMemberSchema.parse(input);

      expect(result).toEqual({
        userId: 'user-123',
        role: 'MEMBER',
      });
    });

    it('should validate valid input with explicit role', () => {
      const input = {
        userId: 'user-123',
        role: 'MEMBER',
      };

      const result = addProjectMemberSchema.parse(input);

      expect(result).toEqual({
        userId: 'user-123',
        role: 'MEMBER',
      });
    });

    it('should throw validation error for missing userId', () => {
      const input = {};

      expect(() => addProjectMemberSchema.parse(input)).toThrow(ZodError);
    });

    it('should throw validation error for empty userId', () => {
      const input = {
        userId: '',
      };

      expect(() => addProjectMemberSchema.parse(input)).toThrow(ZodError);
      expect(() => addProjectMemberSchema.parse(input)).toThrow('User ID is required');
    });

    it('should throw validation error for invalid role', () => {
      const input = {
        userId: 'user-123',
        role: 'INVALID_ROLE',
      };

      expect(() => addProjectMemberSchema.parse(input)).toThrow(ZodError);
    });

    it('should throw validation error for OWNER role (not allowed via API)', () => {
      const input = {
        userId: 'user-123',
        role: 'OWNER',
      };

      expect(() => addProjectMemberSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('removeProjectMemberSchema', () => {
    it('should validate valid userId', () => {
      const input = {
        userId: 'user-123',
      };

      const result = removeProjectMemberSchema.parse(input);

      expect(result).toEqual({
        userId: 'user-123',
      });
    });

    it('should throw validation error for missing userId', () => {
      const input = {};

      expect(() => removeProjectMemberSchema.parse(input)).toThrow(ZodError);
    });

    it('should throw validation error for empty userId', () => {
      const input = {
        userId: '',
      };

      expect(() => removeProjectMemberSchema.parse(input)).toThrow(ZodError);
      expect(() => removeProjectMemberSchema.parse(input)).toThrow('User ID is required');
    });
  });

  describe('listProjectMembersSchema', () => {
    it('should validate with default pagination values', () => {
      const input = {};

      const result = listProjectMembersSchema.parse(input);

      expect(result).toEqual({
        page: 1,
        limit: 50,
      });
    });

    it('should validate custom pagination values', () => {
      const input = {
        page: '2',
        limit: '25',
      };

      const result = listProjectMembersSchema.parse(input);

      expect(result).toEqual({
        page: 2,
        limit: 25,
      });
    });

    it('should coerce string values to numbers', () => {
      const input = {
        page: '3',
        limit: '75',
      };

      const result = listProjectMembersSchema.parse(input);

      expect(result).toEqual({
        page: 3,
        limit: 75,
      });
    });

    it('should throw validation error for invalid page', () => {
      const input = {
        page: 'invalid',
      };

      expect(() => listProjectMembersSchema.parse(input)).toThrow(ZodError);
    });

    it('should throw validation error for negative page', () => {
      const input = {
        page: '-1',
      };

      expect(() => listProjectMembersSchema.parse(input)).toThrow(ZodError);
    });

    it('should throw validation error for zero page', () => {
      const input = {
        page: '0',
      };

      expect(() => listProjectMembersSchema.parse(input)).toThrow(ZodError);
    });

    it('should throw validation error for invalid limit', () => {
      const input = {
        limit: 'invalid',
      };

      expect(() => listProjectMembersSchema.parse(input)).toThrow(ZodError);
    });

    it('should throw validation error for negative limit', () => {
      const input = {
        limit: '-10',
      };

      expect(() => listProjectMembersSchema.parse(input)).toThrow(ZodError);
    });

    it('should throw validation error for limit over maximum', () => {
      const input = {
        limit: '101',
      };

      expect(() => listProjectMembersSchema.parse(input)).toThrow(ZodError);
    });

    it('should accept maximum limit value', () => {
      const input = {
        limit: '100',
      };

      const result = listProjectMembersSchema.parse(input);

      expect(result.limit).toBe(100);
    });
  });
});
