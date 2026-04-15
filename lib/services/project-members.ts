import { getDb } from '@/lib/db';
import { executeInTransactionAsync } from '@/lib/db/transaction';
import {
  addProjectMember as addProjectMemberDb,
  removeProjectMember as removeProjectMemberDb,
  findProjectMember,
  findProjectMembersWithDetails,
  countProjectOwners,
  isProjectMember as isProjectMemberDb,
  isProjectOwner as isProjectOwnerDb,
  findUnclosedIssuesByAssigneeInProject,
  ProjectMemberWithDetails,
} from '@/lib/db/project-members';
import { findUserById } from '@/lib/db/users';
import { findProjectById } from '@/lib/db/projects';
import { requireAuthenticatedUser } from './auth';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/errors/helpers';
import type { AddProjectMemberInput } from '@/lib/validators/project-members';

/**
 * Check if current user is a project owner
 */
async function requireProjectOwner(projectId: string): Promise<void> {
  const user = await requireAuthenticatedUser();
  const db = getDb();

  // Check if project exists
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if user is an owner
  if (!isProjectOwnerDb(db, projectId, user.id)) {
    throw new ForbiddenError('Only project owners can perform this action');
  }
}

/**
 * Check if current user is a project member
 */
async function requireProjectMember(projectId: string): Promise<void> {
  const user = await requireAuthenticatedUser();
  const db = getDb();

  // Check if project exists
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if user is a member
  if (!isProjectMemberDb(db, projectId, user.id)) {
    throw new ForbiddenError('You do not have access to this project');
  }
}

/**
 * Add a member to a project
 */
export async function addProjectMember(
  projectId: string,
  data: AddProjectMemberInput
): Promise<ProjectMemberWithDetails> {
  const db = getDb();
  const currentUser = await requireAuthenticatedUser();

  // Verify project exists
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if current user is an owner
  if (!isProjectOwnerDb(db, projectId, currentUser.id)) {
    throw new ForbiddenError('Only project owners can add members');
  }

  // Verify the user to add exists
  const userToAdd = findUserById(db, data.userId);
  if (!userToAdd) {
    throw new NotFoundError('User');
  }

  // Check if user is already a member
  const existingMember = findProjectMember(db, projectId, data.userId);
  if (existingMember) {
    throw new ConflictError('User is already a member of this project');
  }

  // Use transaction to ensure atomicity
  return executeInTransactionAsync(db, (txnDb) => {
    // Add member
    addProjectMemberDb(txnDb, {
      projectId,
      userId: data.userId,
      role: data.role,
    });

    // Get member with user details for response
    const membersWithDetails = findProjectMembersWithDetails(txnDb, projectId);
    const newMemberWithDetails = membersWithDetails.find(m => m.userId === data.userId);

    if (!newMemberWithDetails) {
      throw new Error('Failed to retrieve newly created member');
    }

    return newMemberWithDetails;
  });
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(projectId: string, userId: string): Promise<{ success: true }> {
  const db = getDb();
  const currentUser = await requireAuthenticatedUser();

  // Verify project exists
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if current user is an owner
  if (!isProjectOwnerDb(db, projectId, currentUser.id)) {
    throw new ForbiddenError('Only project owners can remove members');
  }

  // Check if target member exists
  const targetMember = findProjectMember(db, projectId, userId);
  if (!targetMember) {
    throw new NotFoundError('Member');
  }

  // Check if removing the last owner
  if (targetMember.role === 'OWNER') {
    const ownerCount = countProjectOwners(db, projectId);
    if (ownerCount <= 1) {
      throw new ValidationError('Cannot remove the last owner of a project');
    }
  }

  // Check if member has unclosed assigned issues
  const unclosedIssueCount = findUnclosedIssuesByAssigneeInProject(db, projectId, userId);
  if (unclosedIssueCount > 0) {
    throw new ValidationError(
      `Cannot remove member with ${unclosedIssueCount} unclosed issue(s) assigned`
    );
  }

  // Use transaction to ensure atomicity
  executeInTransactionAsync(db, (txnDb) => {
    const removed = removeProjectMemberDb(txnDb, projectId, userId);
    if (!removed) {
      throw new Error('Failed to remove member');
    }
  });

  return { success: true };
}

/**
 * List all members of a project
 */
export async function listProjectMembers(projectId: string): Promise<{
  items: ProjectMemberWithDetails[];
  total: number;
}> {
  const db = getDb();
  await requireAuthenticatedUser();

  // Check if project exists
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if current user is a member (owner or member)
  await requireProjectMember(projectId);

  // Get all members
  const members = findProjectMembersWithDetails(db, projectId);

  return {
    items: members,
    total: members.length,
  };
}

/**
 * Check if a user is a project member
 */
export function isProjectMember(projectId: string, userId: string): boolean {
  const db = getDb();
  return isProjectMemberDb(db, projectId, userId);
}

/**
 * Check if a user is a project owner
 */
export function isProjectOwner(projectId: string, userId: string): boolean {
  const db = getDb();
  return isProjectOwnerDb(db, projectId, userId);
}

/**
 * Require that current user is a project member
 */
export { requireProjectMember };

/**
 * Require that current user is a project owner
 */
export { requireProjectOwner };
