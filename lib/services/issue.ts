import { getDb, executeInTransactionAsync } from '@/lib/db';
import {
  createIssue as createIssueDb,
  findIssuesByProjectId,
  findIssueById,
  updateIssue,
} from '@/lib/db/issues';
import { findProjectById } from '@/lib/db/projects';
import { findUserById } from '@/lib/db/users';
import { createIssueAuditLog } from '@/lib/db/issue-audit-logs';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError, InvalidStateTransitionError, InternalError } from '@/lib/errors/helpers';
import type { CreateIssueInput, IssueStatus, UpdateIssueStatusInput, UpdateIssueAssigneeInput } from '@/lib/validators/issue';

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  createdById: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createIssueInProject(
  projectId: string,
  data: CreateIssueInput
): Promise<Issue> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Verify project exists and user owns it
  const project = findProjectById(db, projectId);
  if (!project || project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  // Use transaction to ensure atomicity of issue creation and audit logging
  return executeInTransactionAsync(db, (txnDb) => {
    // Create issue with fixed status
    const issue = createIssueDb(txnDb, {
      projectId,
      title: data.title,
      description: data.description ?? null,
      status: 'OPEN',
      createdById: user.id,
    });

    // Write audit log for issue creation
    createIssueAuditLog(txnDb, {
      issueId: issue.id,
      projectId: projectId,
      actorId: user.id,
      action: 'ISSUE_CREATED',
      fromStatus: null,
      toStatus: 'OPEN',
    });

    return issue;
  });
}

export async function listIssuesForProject(projectId: string): Promise<Issue[]> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Verify project exists and user owns it
  const project = findProjectById(db, projectId);
  if (!project || project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  // List all issues for the project
  const issues = findIssuesByProjectId(db, projectId);

  return issues;
}

export async function getIssueByIdForProject(
  projectId: string,
  issueId: string
): Promise<Issue> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Verify project exists and user owns it
  const project = findProjectById(db, projectId);
  if (!project || project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  // Find issue by ID
  const issue = findIssueById(db, issueId);

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  // Verify issue belongs to the specified project
  if (issue.projectId !== projectId) {
    throw new NotFoundError('Issue');
  }

  return issue;
}

// State transition matrix
const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  OPEN: ['IN_PROGRESS', 'DONE'],
  IN_PROGRESS: ['DONE', 'OPEN'],
  DONE: ['OPEN'],
};

function validateStateTransition(from: IssueStatus, to: IssueStatus): void {
  const allowedTargets = VALID_TRANSITIONS[from];
  if (!allowedTargets.includes(to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

export async function updateIssueStatus(
  projectId: string,
  issueId: string,
  data: UpdateIssueStatusInput
): Promise<Issue> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Verify project exists and user owns it
  const project = findProjectById(db, projectId);
  if (!project || project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  // Find current issue
  const currentIssue = findIssueById(db, issueId);
  if (!currentIssue) {
    throw new NotFoundError('Issue');
  }

  // Verify issue belongs to the specified project
  if (currentIssue.projectId !== projectId) {
    throw new NotFoundError('Issue');
  }

  // Validate state transition
  validateStateTransition(
    currentIssue.status as IssueStatus,
    data.status
  );

  // Use transaction to ensure atomicity of status update and audit logging
  return executeInTransactionAsync(db, (txnDb) => {
    // Update issue status
    const updatedIssue = updateIssue(txnDb, issueId, {
      status: data.status,
    });

    if (!updatedIssue) {
      throw new InternalError('Failed to update issue');
    }

    // Write audit log for status change
    createIssueAuditLog(txnDb, {
      issueId: issueId,
      projectId: projectId,
      actorId: user.id,
      action: 'ISSUE_STATUS_CHANGED',
      fromStatus: currentIssue.status,
      toStatus: data.status,
    });

    return updatedIssue;
  });
}

export async function updateIssueAssignee(
  projectId: string,
  issueId: string,
  data: UpdateIssueAssigneeInput
): Promise<Issue> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Verify project exists and user owns it
  const project = findProjectById(db, projectId);
  if (!project || project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  // Find current issue
  const currentIssue = findIssueById(db, issueId);
  if (!currentIssue) {
    throw new NotFoundError('Issue');
  }

  // Verify issue belongs to the specified project
  if (currentIssue.projectId !== projectId) {
    throw new NotFoundError('Issue');
  }

  // If setting an assignee, verify the user exists
  if (data.assigneeId !== null) {
    const assignee = findUserById(db, data.assigneeId);
    if (!assignee) {
      throw new NotFoundError('Assignee');
    }
  }

  // Use transaction to ensure atomicity
  return executeInTransactionAsync(db, (txnDb) => {
    const updatedIssue = updateIssue(txnDb, issueId, {
      assigneeId: data.assigneeId,
    });

    if (!updatedIssue) {
      throw new InternalError('Failed to update issue assignee');
    }

    // Write audit log for assignee change
    createIssueAuditLog(txnDb, {
      issueId: issueId,
      projectId: projectId,
      actorId: user.id,
      action: 'ISSUE_ASSIGNEE_CHANGED',
      fromStatus: null,
      toStatus: null,
      fromAssigneeId: currentIssue.assigneeId,
      toAssigneeId: data.assigneeId,
    });

    return updatedIssue;
  });
}
