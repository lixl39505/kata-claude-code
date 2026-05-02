import Database from 'better-sqlite3';
import { findProjectMembersWithDetails } from '@/lib/db/project-members';
import { getEmailLocalPart } from '@/lib/db/users';
import { ValidationError } from '@/lib/errors';

export interface MentionedUser {
  userId: string;
  displayName: string;
}

/**
 * Validate and resolve mention identifiers to actual users.
 *
 * This function:
 * 1. Retrieves all project members
 * 2. Matches mention identifiers against email local parts
 * 3. Returns valid mentioned users with their IDs and display names
 * 4. Throws ValidationError if any mentions are invalid (not project members)
 *
 * @param db - The database instance
 * @param projectId - The project ID
 * @param mentionIdentifiers - Array of mention identifiers (email local parts, lowercase)
 * @returns Array of mentioned users with userId and displayName
 * @throws {ValidationError} If any mentioned users are not project members
 *
 * @example
 * validateAndResolveMentions(db, 'proj-1', ['john', 'jane'])
 * // Returns: [{ userId: 'user-1', displayName: 'John Doe' }, { userId: 'user-2', displayName: 'Jane Smith' }]
 *
 * validateAndResolveMentions(db, 'proj-1', ['john', 'nonexistent'])
 * // Throws: ValidationError with details about invalid mentions
 */
export function validateAndResolveMentions(
  db: Database.Database,
  projectId: string,
  mentionIdentifiers: string[]
): MentionedUser[] {
  if (mentionIdentifiers.length === 0) {
    return [];
  }

  // Get all project members with their details
  const members = findProjectMembersWithDetails(db, projectId);

  // Build a map of email local part to user details for quick lookup
  // Use lowercase keys for case-insensitive matching
  const memberMap = new Map<string, MentionedUser>();

  for (const member of members) {
    const localPart = getEmailLocalPart(member.email);
    if (localPart) {
      memberMap.set(localPart, {
        userId: member.userId,
        displayName: member.displayName,
      });
    }
  }

  // Validate and resolve each mention
  const resolvedUsers: MentionedUser[] = [];
  const invalidMentions: string[] = [];

  for (const identifier of mentionIdentifiers) {
    // Convert to lowercase for case-insensitive matching
    const lowercaseIdentifier = identifier.toLowerCase();
    const user = memberMap.get(lowercaseIdentifier);

    if (user) {
      // Avoid duplicates in the result
      if (!resolvedUsers.some(u => u.userId === user.userId)) {
        resolvedUsers.push(user);
      }
    } else {
      invalidMentions.push(identifier);
    }
  }

  // If there are invalid mentions, throw an error
  if (invalidMentions.length > 0) {
    throw new ValidationError(
      `Invalid mentions: @${invalidMentions.join(', @')} are not members of this project`,
      {
        invalidMentions,
        validMembers: Array.from(memberMap.keys()).sort(),
      }
    );
  }

  return resolvedUsers;
}
