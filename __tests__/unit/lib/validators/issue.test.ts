import { createIssueSchema, issueIdSchema } from '@/lib/validators/issue';
import { ZodError } from 'zod';

describe('Issue Validators', () => {
  describe('createIssueSchema', () => {
    const validData = {
      title: 'Fix login bug',
      description: 'Users cannot login with valid credentials',
    };

    it('should validate correct issue data', () => {
      const result = createIssueSchema.parse(validData);
      expect(result).toEqual({
        title: 'Fix login bug',
        description: 'Users cannot login with valid credentials',
      });
    });

    it('should accept issue without description', () => {
      const result = createIssueSchema.parse({
        title: 'Fix login bug',
      });
      expect(result.description).toBeUndefined();
    });

    it('should reject empty title', () => {
      const invalidData = { ...validData, title: '' };
      expect(() => createIssueSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject whitespace-only title', () => {
      const invalidData = { ...validData, title: '   ' };
      expect(() => createIssueSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject title exceeding 200 characters', () => {
      const invalidData = {
        ...validData,
        title: 'a'.repeat(201),
      };
      expect(() => createIssueSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should accept title at exactly 200 characters', () => {
      const title = 'a'.repeat(200);
      const result = createIssueSchema.parse({
        ...validData,
        title,
      });
      expect(result.title).toBe(title);
    });

    it('should trim title', () => {
      const result = createIssueSchema.parse({
        ...validData,
        title: '  Fix login bug  ',
      });
      expect(result.title).toBe('Fix login bug');
    });

    it('should transform empty description to null', () => {
      const result = createIssueSchema.parse({
        ...validData,
        description: '',
      });
      expect(result.description).toBeNull();
    });

    it('should transform whitespace-only description to null', () => {
      const result = createIssueSchema.parse({
        ...validData,
        description: '   ',
      });
      expect(result.description).toBeNull();
    });

    it('should trim description', () => {
      const result = createIssueSchema.parse({
        ...validData,
        description: '  Users cannot login  ',
      });
      expect(result.description).toBe('Users cannot login');
    });

    it('should reject description exceeding 5000 characters', () => {
      const invalidData = {
        ...validData,
        description: 'a'.repeat(5001),
      };
      expect(() => createIssueSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should accept description at exactly 5000 characters', () => {
      const description = 'a'.repeat(5000);
      const result = createIssueSchema.parse({
        ...validData,
        description,
      });
      expect(result.description).toBe(description);
    });
  });

  describe('issueIdSchema', () => {
    it('should validate valid issue ID', () => {
      const result = issueIdSchema.parse({ issueId: 'abc123' });
      expect(result).toEqual({ issueId: 'abc123' });
    });

    it('should reject empty issue ID', () => {
      expect(() =>
        issueIdSchema.parse({ issueId: '' })
      ).toThrow(ZodError);
    });
  });
});
