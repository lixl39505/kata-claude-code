import { createProjectSchema, projectIdSchema } from '@/lib/validators/project';
import { ZodError } from 'zod';

describe('Project Validators', () => {
  describe('createProjectSchema', () => {
    const validData = {
      name: 'My Project',
      key: 'TEST',
      description: 'A test project',
    };

    it('should validate correct project data', () => {
      const result = createProjectSchema.parse(validData);
      expect(result).toEqual({
        name: 'My Project',
        key: 'TEST',
        description: 'A test project',
      });
    });

    it('should accept project without description', () => {
      const result = createProjectSchema.parse({
        name: 'My Project',
        key: 'TEST',
      });
      expect(result.description).toBeUndefined();
    });

    it('should reject empty name', () => {
      const invalidData = { ...validData, name: '' };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject whitespace-only name', () => {
      const invalidData = { ...validData, name: '   ' };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject name exceeding 100 characters', () => {
      const invalidData = {
        ...validData,
        name: 'a'.repeat(101),
      };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should trim name', () => {
      const result = createProjectSchema.parse({
        ...validData,
        name: '  My Project  ',
      });
      expect(result.name).toBe('My Project');
    });

    it('should transform lowercase key to uppercase', () => {
      const result = createProjectSchema.parse({
        ...validData,
        key: 'test',
      });
      expect(result.key).toBe('TEST');
    });

    it('should transform mixed case key to uppercase', () => {
      const result = createProjectSchema.parse({
        ...validData,
        key: 'TeSt',
      });
      expect(result.key).toBe('TEST');
    });

    it('should reject key starting with number', () => {
      const invalidData = { ...validData, key: '1TEST' };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject key starting with underscore', () => {
      const invalidData = { ...validData, key: '_TEST' };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject key that is too short (1 character)', () => {
      const invalidData = { ...validData, key: 'A' };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject key that is too long (21 characters)', () => {
      const invalidData = { ...validData, key: 'A'.repeat(21) };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should accept key with valid format', () => {
      const validKeys = [
        'AB',
        'A1',
        'A_',
        'ABC123',
        'TEST_PROJECT',
        'A1B2C3',
      ];

      validKeys.forEach((key) => {
        const result = createProjectSchema.parse({ ...validData, key });
        expect(result.key).toBe(key);
      });
    });

    it('should reject key with special characters', () => {
      const invalidData = { ...validData, key: 'TEST-PROJECT' };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject key with spaces', () => {
      const invalidData = { ...validData, key: 'TEST PROJECT' };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should transform empty description to null', () => {
      const result = createProjectSchema.parse({
        ...validData,
        description: '',
      });
      expect(result.description).toBeNull();
    });

    it('should transform whitespace-only description to null', () => {
      const result = createProjectSchema.parse({
        ...validData,
        description: '   ',
      });
      expect(result.description).toBeNull();
    });

    it('should trim description', () => {
      const result = createProjectSchema.parse({
        ...validData,
        description: '  A test project  ',
      });
      expect(result.description).toBe('A test project');
    });

    it('should reject description exceeding 500 characters', () => {
      const invalidData = {
        ...validData,
        description: 'a'.repeat(501),
      };
      expect(() => createProjectSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should accept description at exactly 500 characters', () => {
      const description = 'a'.repeat(500);
      const result = createProjectSchema.parse({
        ...validData,
        description,
      });
      expect(result.description).toBe(description);
    });

    it('should trim key before validation', () => {
      const result = createProjectSchema.parse({
        ...validData,
        key: '  TEST  ',
      });
      expect(result.key).toBe('TEST');
    });
  });

  describe('projectIdSchema', () => {
    it('should validate valid project ID', () => {
      const result = projectIdSchema.parse({ projectId: 'abc123' });
      expect(result).toEqual({ projectId: 'abc123' });
    });

    it('should reject empty project ID', () => {
      expect(() =>
        projectIdSchema.parse({ projectId: '' })
      ).toThrow(ZodError);
    });
  });
});
