import { parseMentions } from '@/lib/services/comment-mention-parser';

describe('Comment Mention Parser', () => {
  describe('parseMentions', () => {
    it('should return empty array for empty content', () => {
      expect(parseMentions('')).toEqual([]);
      expect(parseMentions('   ')).toEqual([]);
      expect(parseMentions(null as unknown as string)).toEqual([]);
      expect(parseMentions(undefined as unknown as string)).toEqual([]);
    });

    it('should parse single mention at start of line', () => {
      const result = parseMentions('@john please review this');
      expect(result).toEqual(['john']);
    });

    it('should parse single mention in middle', () => {
      const result = parseMentions('Hello @john, please review');
      expect(result).toEqual(['john']);
    });

    it('should parse multiple mentions', () => {
      const result = parseMentions('@john @jane please review');
      expect(result).toEqual(['john', 'jane']);
    });

    it('should parse mentions separated by text', () => {
      const result = parseMentions('Hey @john, can you ask @jane?');
      expect(result).toEqual(['john', 'jane']);
    });

    it('should deduplicate mentions', () => {
      const result = parseMentions('@john @jane @john please review');
      expect(result).toEqual(['john', 'jane']);
    });

    it('should be case insensitive and convert to lowercase', () => {
      const result = parseMentions('@John @JOHN @jOhN');
      expect(result).toEqual(['john']);
    });

    it('should handle mentions with dots', () => {
      const result = parseMentions('@john.doe please review');
      expect(result).toEqual(['john.doe']);
    });

    it('should handle mentions with underscores', () => {
      const result = parseMentions('@john_doe please review');
      expect(result).toEqual(['john_doe']);
    });

    it('should handle mentions with hyphens', () => {
      const result = parseMentions('@john-doe please review');
      expect(result).toEqual(['john-doe']);
    });

    it('should handle mentions with numbers', () => {
      const result = parseMentions('@john123 please review');
      expect(result).toEqual(['john123']);
    });

    it('should handle mentions after punctuation', () => {
      const result = parseMentions('Hello. @john please review');
      expect(result).toEqual(['john']);
    });

    it('should handle mentions with commas', () => {
      const result = parseMentions('Hey @john, @jane, help needed');
      expect(result).toEqual(['john', 'jane']);
    });

    it('should handle mentions on new lines', () => {
      const result = parseMentions('Hello\n@john\nPlease review');
      expect(result).toEqual(['john']);
    });

    it('should handle mentions with tabs', () => {
      const result = parseMentions('Hello\t@john\tPlease review');
      expect(result).toEqual(['john']);
    });

    it('should not match email addresses', () => {
      const result = parseMentions('Contact us at support@example.com');
      expect(result).toEqual([]);
    });

    it('should not match email-like patterns with double @', () => {
      const result = parseMentions('Invalid: @user@domain.com');
      expect(result).toEqual([]);
    });

    it('should handle mentions at end of sentence', () => {
      const result = parseMentions('Thanks for the help @john.');
      expect(result).toEqual(['john']);
    });

    it('should handle mentions with special punctuation', () => {
      const result = parseMentions('Hey @john! @jane? @bob:');
      expect(result).toEqual(['john', 'jane', 'bob']);
    });

    it('should handle mentions in parentheses', () => {
      const result = parseMentions('Please review (@john)');
      expect(result).toEqual(['john']);
    });

    it('should handle mentions with multiple special chars', () => {
      const result = parseMentions('@john.doe-Smith_123 please review');
      expect(result).toEqual(['john.doe-smith_123']);
    });

    it('should not extract from incomplete mentions', () => {
      const result = parseMentions('Email me at test@');
      expect(result).toEqual([]);
    });

    it('should handle real-world comment examples', () => {
      const result = parseMentions(
        '@john can you review this PR? Also cc @jane for the design discussion. Thanks!'
      );
      expect(result).toEqual(['john', 'jane']);
    });

    it('should handle mentions in plain text (URLs and code are not special-cased as per requirements)', () => {
      // Note: As per task requirements, we don't handle complex markdown or URL parsing
      // @ in URLs or code blocks will be treated as regular mentions
      const result = parseMentions('Visit https://example.com/@user for info');
      expect(result).toEqual(['user']);
    });

    it('should handle complex real-world scenarios', () => {
      const content = `
        PR Review Request

        @john.doe - Backend review needed
        @jane_smith - Frontend review needed
        @bob-123 - Design review needed

        Please review by Friday. Thanks!
      `;

      const result = parseMentions(content);
      expect(result).toEqual(['john.doe', 'jane_smith', 'bob-123']);
    });
  });
});
