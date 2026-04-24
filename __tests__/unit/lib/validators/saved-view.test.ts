import {
  createSavedViewSchema,
  listSavedViewsSchema,
  savedViewIdSchema,
  savedViewIssuesQuerySchema,
} from '@/lib/validators/saved-view';

describe('Saved View Validators', () => {
  describe('createSavedViewSchema', () => {
    const validInput = {
      name: 'My Open Issues',
      filters: {
        state: 'OPEN',
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        assigneeId: '123e4567-e89b-12d3-a456-426614174001',
        sortBy: 'createdAt',
        order: 'desc',
      },
    };

    it('should accept valid input', () => {
      const result = createSavedViewSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should accept input with only required fields', () => {
      const minimalInput = {
        name: 'My View',
        filters: {
          state: 'OPEN',
        },
      };

      const result = createSavedViewSchema.parse(minimalInput);
      expect(result).toEqual(minimalInput);
    });

    it('should accept input with filters having only optional fields', () => {
      const input = {
        name: 'My View',
        filters: {},
      };

      const result = createSavedViewSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should reject empty name', () => {
      const input = {
        name: '   ',
        filters: { state: 'OPEN' },
      };

      expect(() => createSavedViewSchema.parse(input)).toThrow();
    });

    it('should reject name longer than 100 characters', () => {
      const input = {
        name: 'a'.repeat(101),
        filters: { state: 'OPEN' },
      };

      expect(() => createSavedViewSchema.parse(input)).toThrow();
    });

    it('should reject invalid projectId format', () => {
      const input = {
        name: 'My View',
        filters: {
          projectId: 'not-a-uuid',
        },
      };

      expect(() => createSavedViewSchema.parse(input)).toThrow();
    });

    it('should reject invalid assigneeId format', () => {
      const input = {
        name: 'My View',
        filters: {
          assigneeId: 'not-a-uuid',
        },
      };

      expect(() => createSavedViewSchema.parse(input)).toThrow();
    });

    it('should reject invalid state value', () => {
      const input = {
        name: 'My View',
        filters: {
          state: 'INVALID',
        },
      };

      expect(() => createSavedViewSchema.parse(input)).toThrow();
    });

    it('should reject invalid sortBy value', () => {
      const input = {
        name: 'My View',
        filters: {
          sortBy: 'invalidField',
        },
      };

      expect(() => createSavedViewSchema.parse(input)).toThrow();
    });

    it('should reject invalid order value', () => {
      const input = {
        name: 'My View',
        filters: {
          order: 'invalid',
        },
      };

      expect(() => createSavedViewSchema.parse(input)).toThrow();
    });

    it('should trim whitespace from name', () => {
      const input = {
        name: '  My View  ',
        filters: { state: 'OPEN' },
      };

      const result = createSavedViewSchema.parse(input);
      expect(result.name).toBe('My View');
    });
  });

  describe('savedViewIdSchema', () => {
    it('should accept valid view ID', () => {
      const input = {
        viewId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = savedViewIdSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should reject empty view ID', () => {
      const input = {
        viewId: '',
      };

      expect(() => savedViewIdSchema.parse(input)).toThrow();
    });

    it('should reject missing view ID', () => {
      const input = {};

      expect(() => savedViewIdSchema.parse(input)).toThrow();
    });
  });

  describe('listSavedViewsSchema', () => {
    it('should use default values when no parameters provided', () => {
      const input = {};
      const result = listSavedViewsSchema.parse(input);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should accept valid pagination parameters', () => {
      const input = {
        limit: '20',
        offset: '10',
      };

      const result = listSavedViewsSchema.parse(input);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(10);
    });

    it('should coerce string numbers to integers', () => {
      const input = {
        limit: '25',
        offset: '5',
      };

      const result = listSavedViewsSchema.parse(input);
      expect(typeof result.limit).toBe('number');
      expect(typeof result.offset).toBe('number');
    });

    it('should reject limit less than 1', () => {
      const input = {
        limit: 0,
      };

      expect(() => listSavedViewsSchema.parse(input)).toThrow();
    });

    it('should reject limit greater than 100', () => {
      const input = {
        limit: 101,
      };

      expect(() => listSavedViewsSchema.parse(input)).toThrow();
    });

    it('should reject negative offset', () => {
      const input = {
        offset: -1,
      };

      expect(() => listSavedViewsSchema.parse(input)).toThrow();
    });
  });

  describe('savedViewIssuesQuerySchema', () => {
    it('should use default values when no parameters provided', () => {
      const input = {};
      const result = savedViewIssuesQuerySchema.parse(input);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should accept valid pagination parameters', () => {
      const input = {
        limit: '30',
        offset: '15',
      };

      const result = savedViewIssuesQuerySchema.parse(input);
      expect(result.limit).toBe(30);
      expect(result.offset).toBe(15);
    });

    it('should coerce string numbers to integers', () => {
      const input = {
        limit: '40',
        offset: '20',
      };

      const result = savedViewIssuesQuerySchema.parse(input);
      expect(typeof result.limit).toBe('number');
      expect(typeof result.offset).toBe('number');
    });

    it('should reject limit less than 1', () => {
      const input = {
        limit: 0,
      };

      expect(() => savedViewIssuesQuerySchema.parse(input)).toThrow();
    });

    it('should reject limit greater than 100', () => {
      const input = {
        limit: 101,
      };

      expect(() => savedViewIssuesQuerySchema.parse(input)).toThrow();
    });

    it('should reject negative offset', () => {
      const input = {
        offset: -1,
      };

      expect(() => savedViewIssuesQuerySchema.parse(input)).toThrow();
    });
  });
});
