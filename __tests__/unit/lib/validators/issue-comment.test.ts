import { createCommentSchema } from '@/lib/validators/issue-comment';
import { ZodError } from 'zod';

describe('Issue Comment Validators', () => {
  describe('createCommentSchema', () => {
    const validData = {
      content: 'This is a valid comment',
    };

    it('should validate correct comment data', () => {
      const result = createCommentSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty content', () => {
      expect(() => createCommentSchema.parse({ content: '' })).toThrow(ZodError);
    });

    it('should reject whitespace-only content', () => {
      expect(() => createCommentSchema.parse({ content: '   ' })).toThrow(ZodError);
    });

    it('should reject content exceeding 5000 characters', () => {
      const longContent = 'a'.repeat(5001);
      expect(() => createCommentSchema.parse({ content: longContent })).toThrow(ZodError);
    });

    it('should accept content with exactly 5000 characters', () => {
      const maxContent = 'a'.repeat(5000);
      const result = createCommentSchema.parse({ content: maxContent });
      expect(result.content).toBe(maxContent);
    });

    it('should accept content with exactly 1 character', () => {
      const result = createCommentSchema.parse({ content: 'a' });
      expect(result.content).toBe('a');
    });

    it('should trim whitespace from content', () => {
      const result = createCommentSchema.parse({
        content: '  This is a comment  ',
      });
      expect(result.content).toBe('This is a comment');
    });

    it('should accept content with newlines and tabs', () => {
      const content = 'This is a comment\nwith newlines\nand\ttabs';
      const result = createCommentSchema.parse({ content });
      expect(result.content).toBe(content);
    });

    it('should accept special characters', () => {
      const content = 'Comment with @user #tag and https://example.com';
      const result = createCommentSchema.parse({ content });
      expect(result.content).toBe(content);
    });

    it('should accept unicode characters', () => {
      const content = 'Comment with emoji 🎉 and 中文 characters';
      const result = createCommentSchema.parse({ content });
      expect(result.content).toBe(content);
    });
  });
});
