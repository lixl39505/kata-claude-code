/**
 * Parse @ mentions from comment content.
 *
 * Extraction rules:
 * - Match patterns starting with @ followed by identifier
 * - Boundary: start of line, whitespace, or common punctuation
 * - Identifier: alphanumeric characters, dots, underscores, hyphens
 * - Must NOT end with punctuation (except dots/underscores/hyphens as part of identifier)
 * - Must NOT be followed by @ (to avoid matching emails)
 * - Email local part format (e.g., "user" from "user@example.com")
 *
 * @param content - The comment content to parse
 * @returns Array of unique mention identifiers (lowercase, deduplicated)
 *
 * @example
 * parseMentions('Hello @john, please review this') // ['john']
 * parseMentions('@john @jane Multiple mentions') // ['john', 'jane']
 * parseMentions('@john @john Duplicate mentions') // ['john']
 * parseMentions('email@domain.com is not a mention') // []
 * parseMentions('Valid: @john.doe, @jane_smith, @bob-123') // ['john.doe', 'jane_smith', 'bob-123']
 */
export function parseMentions(content: string): string[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const mentions: string[] = [];

  // Find all @ positions in the content
  for (let i = 0; i < content.length; i++) {
    if (content[i] !== '@') {
      continue;
    }

    // Check if @ is at a valid boundary (start of line or after whitespace/punctuation)
    if (i > 0) {
      const prevChar = content[i - 1];
      // Previous char must be whitespace, punctuation, or line break
      if (!/[\s\t\n\r.,!?;:()[\]{}<>\\/"'`~|^&*+\-]/.test(prevChar)) {
        continue;
      }
    }

    // Extract the identifier (everything after @ until we hit an invalid character)
    let identifierEnd = i + 1;
    while (identifierEnd < content.length) {
      const char = content[identifierEnd];
      // Allow alphanumeric, dots, underscores, hyphens in identifier
      if (/[a-zA-Z0-9._-]/.test(char)) {
        identifierEnd++;
      } else {
        break;
      }
    }

    const identifier = content.slice(i + 1, identifierEnd);

    // Skip empty identifiers
    if (!identifier) {
      continue;
    }

    // Check if this is followed by @ (email pattern like "@user@domain")
    if (identifierEnd < content.length && content[identifierEnd] === '@') {
      continue;
    }

    // Check what comes after the identifier
    if (identifierEnd < content.length) {
      const nextChar = content[identifierEnd];
      // If next character is alphanumeric or special identifier char, this is not a valid mention boundary
      if (/[a-zA-Z0-9._]/.test(nextChar)) {
        continue;
      }
    }

    // Remove trailing punctuation from identifier
    let cleanedIdentifier = identifier;
    while (cleanedIdentifier.length > 0 && /[.,!?;:]/.test(cleanedIdentifier[cleanedIdentifier.length - 1])) {
      cleanedIdentifier = cleanedIdentifier.slice(0, -1);
    }

    // Skip if identifier became empty
    if (!cleanedIdentifier) {
      continue;
    }

    // Add identifier in lowercase for case-insensitive matching
    mentions.push(cleanedIdentifier.toLowerCase());
  }

  // Remove duplicates while preserving order
  const uniqueMentions = Array.from(new Set(mentions));

  return uniqueMentions;
}
