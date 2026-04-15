import { createIssueSchema, issueIdSchema, updateIssueStateSchema, updateIssueAssigneeSchema } from '@/lib/validators/issue';
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

  describe('updateIssueStateSchema', () => {
    it('should validate OPEN state', () => {
      const result = updateIssueStateSchema.parse({ state: 'OPEN' });
      expect(result).toEqual({ state: 'OPEN' });
    });

    it('should validate CLOSED state', () => {
      const result = updateIssueStateSchema.parse({ state: 'CLOSED' });
      expect(result).toEqual({ state: 'CLOSED' });
    });

    it('should validate CLOSED state with COMPLETED reason', () => {
      const result = updateIssueStateSchema.parse({ state: 'CLOSED', closeReason: 'COMPLETED' });
      expect(result).toEqual({ state: 'CLOSED', closeReason: 'COMPLETED' });
    });

    it('should validate CLOSED state with NOT_PLANNED reason', () => {
      const result = updateIssueStateSchema.parse({ state: 'CLOSED', closeReason: 'NOT_PLANNED' });
      expect(result).toEqual({ state: 'CLOSED', closeReason: 'NOT_PLANNED' });
    });

    it('should validate CLOSED state with DUPLICATE reason', () => {
      const result = updateIssueStateSchema.parse({ state: 'CLOSED', closeReason: 'DUPLICATE' });
      expect(result).toEqual({ state: 'CLOSED', closeReason: 'DUPLICATE' });
    });

    it('should reject invalid state', () => {
      expect(() =>
        updateIssueStateSchema.parse({ state: 'INVALID' })
      ).toThrow(ZodError);
    });

    it('should reject empty state', () => {
      expect(() =>
        updateIssueStateSchema.parse({ state: '' })
      ).toThrow(ZodError);
    });

    it('should reject OPEN state with closeReason', () => {
      expect(() =>
        updateIssueStateSchema.parse({ state: 'OPEN', closeReason: 'COMPLETED' })
      ).toThrow(ZodError);
    });

    it('should reject invalid closeReason', () => {
      expect(() =>
        updateIssueStateSchema.parse({ state: 'CLOSED', closeReason: 'INVALID' })
      ).toThrow(ZodError);
    });
  });

  describe('updateIssueAssigneeSchema', () => {
    it('should validate setting assignee to valid UUID', () => {
      const result = updateIssueAssigneeSchema.parse({
        assigneeId: '550e8400-e29b-41d4-a716-446655440000'
      });
      expect(result).toEqual({
        assigneeId: '550e8400-e29b-41d4-a716-446655440000'
      });
    });

    it('should validate clearing assignee (null)', () => {
      const result = updateIssueAssigneeSchema.parse({ assigneeId: null });
      expect(result).toEqual({ assigneeId: null });
    });

    it('should reject non-UUID assignee ID', () => {
      expect(() =>
        updateIssueAssigneeSchema.parse({ assigneeId: 'not-a-uuid' })
      ).toThrow(ZodError);
    });

    it('should reject empty string assignee ID', () => {
      expect(() =>
        updateIssueAssigneeSchema.parse({ assigneeId: '' })
      ).toThrow(ZodError);
    });

    it('should reject undefined assignee ID', () => {
      expect(() =>
        updateIssueAssigneeSchema.parse({ assigneeId: undefined })
      ).toThrow(ZodError);
    });
  });
});
