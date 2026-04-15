import { createIssueSchema, issueIdSchema, updateIssueStateSchema, updateIssueAssigneeSchema, batchUpdateIssuesSchema, issueFiltersSchema } from '@/lib/validators/issue';
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

  describe('batchUpdateIssuesSchema', () => {
    const validData = {
      issueIds: ['issue-1', 'issue-2', 'issue-3'],
      state: 'CLOSED' as const,
    };

    it('should validate batch update with state change', () => {
      const result = batchUpdateIssuesSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should validate batch update with assignee change', () => {
      const data = {
        issueIds: ['issue-1', 'issue-2'],
        assigneeId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = batchUpdateIssuesSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should validate batch update with both state and assignee changes', () => {
      const data = {
        issueIds: ['issue-1'],
        state: 'CLOSED' as const,
        assigneeId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = batchUpdateIssuesSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should validate batch update with null assignee', () => {
      const data = {
        issueIds: ['issue-1'],
        assigneeId: null,
      };
      const result = batchUpdateIssuesSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should reject empty issueIds array', () => {
      const data = {
        issueIds: [],
        state: 'CLOSED' as const,
      };
      expect(() => batchUpdateIssuesSchema.parse(data)).toThrow(ZodError);
    });

    it('should reject issueIds with empty strings', () => {
      const data = {
        issueIds: ['issue-1', '', 'issue-3'],
        state: 'CLOSED' as const,
      };
      expect(() => batchUpdateIssuesSchema.parse(data)).toThrow(ZodError);
    });

    it('should reject batch with more than 100 issues', () => {
      const data = {
        issueIds: Array.from({ length: 101 }, (_, i) => `issue-${i}`),
        state: 'CLOSED' as const,
      };
      expect(() => batchUpdateIssuesSchema.parse(data)).toThrow(ZodError);
    });

    it('should accept exactly 100 issues', () => {
      const data = {
        issueIds: Array.from({ length: 100 }, (_, i) => `issue-${i}`),
        state: 'CLOSED' as const,
      };
      const result = batchUpdateIssuesSchema.parse(data);
      expect(result.issueIds).toHaveLength(100);
    });

    it('should reject batch with no update fields', () => {
      const data = {
        issueIds: ['issue-1'],
      };
      expect(() => batchUpdateIssuesSchema.parse(data)).toThrow(ZodError);
    });

    it('should reject invalid state values', () => {
      const data = {
        issueIds: ['issue-1'],
        state: 'INVALID_STATE',
      };
      expect(() => batchUpdateIssuesSchema.parse(data)).toThrow(ZodError);
    });

    it('should reject invalid assigneeId format', () => {
      const data = {
        issueIds: ['issue-1'],
        assigneeId: 'not-a-uuid',
      };
      expect(() => batchUpdateIssuesSchema.parse(data)).toThrow(ZodError);
    });

    it('should accept single issue in batch', () => {
      const data = {
        issueIds: ['issue-1'],
        state: 'OPEN' as const,
      };
      const result = batchUpdateIssuesSchema.parse(data);
      expect(result).toEqual(data);
    });
  });

  describe('issueFiltersSchema', () => {
    const validData = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      state: 'OPEN' as const,
      assigneeId: '123e4567-e89b-12d3-a456-426614174000',
      limit: 20,
      offset: 0,
      sortBy: 'createdAt' as const,
      order: 'desc' as const,
    };

    it('should validate complete filter data', () => {
      const result = issueFiltersSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should apply default values for optional fields', () => {
      const result = issueFiltersSchema.parse({});
      expect(result).toEqual({
        projectId: undefined,
        state: undefined,
        assigneeId: undefined,
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
        order: 'desc',
      });
    });

    it('should validate projectId with valid UUID', () => {
      const result = issueFiltersSchema.parse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.projectId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject invalid projectId format', () => {
      expect(() =>
        issueFiltersSchema.parse({ projectId: 'not-a-uuid' })
      ).toThrow(ZodError);
    });

    it('should validate OPEN state', () => {
      const result = issueFiltersSchema.parse({ state: 'OPEN' });
      expect(result.state).toBe('OPEN');
    });

    it('should validate CLOSED state', () => {
      const result = issueFiltersSchema.parse({ state: 'CLOSED' });
      expect(result.state).toBe('CLOSED');
    });

    it('should reject invalid state', () => {
      expect(() =>
        issueFiltersSchema.parse({ state: 'INVALID' })
      ).toThrow(ZodError);
    });

    it('should validate assigneeId with valid UUID', () => {
      const result = issueFiltersSchema.parse({
        assigneeId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.assigneeId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid assigneeId format', () => {
      expect(() =>
        issueFiltersSchema.parse({ assigneeId: 'not-a-uuid' })
      ).toThrow(ZodError);
    });

    it('should validate limit within range (1-100)', () => {
      const result = issueFiltersSchema.parse({ limit: 50 });
      expect(result.limit).toBe(50);
    });

    it('should accept minimum limit of 1', () => {
      const result = issueFiltersSchema.parse({ limit: 1 });
      expect(result.limit).toBe(1);
    });

    it('should accept maximum limit of 100', () => {
      const result = issueFiltersSchema.parse({ limit: 100 });
      expect(result.limit).toBe(100);
    });

    it('should reject limit less than 1', () => {
      expect(() =>
        issueFiltersSchema.parse({ limit: 0 })
      ).toThrow(ZodError);
    });

    it('should reject limit greater than 100', () => {
      expect(() =>
        issueFiltersSchema.parse({ limit: 101 })
      ).toThrow(ZodError);
    });

    it('should validate offset as non-negative integer', () => {
      const result = issueFiltersSchema.parse({ offset: 50 });
      expect(result.offset).toBe(50);
    });

    it('should accept zero offset', () => {
      const result = issueFiltersSchema.parse({ offset: 0 });
      expect(result.offset).toBe(0);
    });

    it('should reject negative offset', () => {
      expect(() =>
        issueFiltersSchema.parse({ offset: -1 })
      ).toThrow(ZodError);
    });

    it('should validate sortBy as createdAt', () => {
      const result = issueFiltersSchema.parse({ sortBy: 'createdAt' });
      expect(result.sortBy).toBe('createdAt');
    });

    it('should reject invalid sortBy value', () => {
      expect(() =>
        issueFiltersSchema.parse({ sortBy: 'invalidField' })
      ).toThrow(ZodError);
    });

    it('should validate order as asc', () => {
      const result = issueFiltersSchema.parse({ order: 'asc' });
      expect(result.order).toBe('asc');
    });

    it('should validate order as desc', () => {
      const result = issueFiltersSchema.parse({ order: 'desc' });
      expect(result.order).toBe('desc');
    });

    it('should reject invalid order value', () => {
      expect(() =>
        issueFiltersSchema.parse({ order: 'invalid' })
      ).toThrow(ZodError);
    });

    it('should coerce string limit to number', () => {
      const result = issueFiltersSchema.parse({ limit: '25' });
      expect(result.limit).toBe(25);
    });

    it('should coerce string offset to number', () => {
      const result = issueFiltersSchema.parse({ offset: '10' });
      expect(result.offset).toBe(10);
    });

    it('should validate multiple filters together', () => {
      const result = issueFiltersSchema.parse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        state: 'OPEN',
        assigneeId: '123e4567-e89b-12d3-a456-426614174000',
        limit: 10,
        offset: 20,
        sortBy: 'createdAt',
        order: 'asc',
      });
      expect(result).toEqual({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        state: 'OPEN',
        assigneeId: '123e4567-e89b-12d3-a456-426614174000',
        limit: 10,
        offset: 20,
        sortBy: 'createdAt',
        order: 'asc',
      });
    });
  });
});
