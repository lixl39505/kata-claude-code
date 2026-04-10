import { getDb } from '@/lib/db';
import {
  createIssue as createIssueDb,
  findIssuesByProjectId,
  findIssueById,
  updateIssue,
} from '@/lib/db/issues';
import { findProjectById } from '@/lib/db/projects';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError, InvalidStateTransitionError, InternalError } from '@/lib/errors/helpers';
import type { CreateIssueInput, IssueStatus, UpdateIssueStatusInput } from '@/lib/validators/issue';

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  createdById: string;
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

  // Create issue with fixed status
  const issue = createIssueDb(db, {
    projectId,
    title: data.title,
    description: data.description ?? null,
    status: 'OPEN',
    createdById: user.id,
  });

  return issue;
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

  // Update issue status
  const updatedIssue = updateIssue(db, issueId, {
    status: data.status,
  });

  if (!updatedIssue) {
    throw new InternalError('Failed to update issue');
  }

  return updatedIssue;
}
