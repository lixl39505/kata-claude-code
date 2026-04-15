import { getDb, executeInTransactionAsync } from '@/lib/db';
import {
  createIssue as createIssueDb,
  findIssuesByProjectId,
  findIssueById,
  updateIssue,
  findIssuesWithFilters,
  countIssuesWithFilters,
} from '@/lib/db/issues';
import { findProjectById, findProjectsByOwnerId } from '@/lib/db/projects';
import { findUserById } from '@/lib/db/users';
import { createIssueAuditLog } from '@/lib/db/issue-audit-logs';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError, InvalidStateTransitionError, InternalError } from '@/lib/errors/helpers';
import type { CreateIssueInput, IssueState, CloseReason, UpdateIssueStateInput, UpdateIssueAssigneeInput, IssueFiltersInput } from '@/lib/validators/issue';

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  closeReason: string | null;
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
const VALID_TRANSITIONS: Record<IssueState, IssueState[]> = {
  OPEN: ['CLOSED'],
  CLOSED: ['OPEN'],
};

function validateStateTransition(from: IssueState, to: IssueState): void {
  const allowedTargets = VALID_TRANSITIONS[from];
  if (!allowedTargets.includes(to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

function getCloseReasonForState(state: IssueState, providedReason?: CloseReason): CloseReason | null {
  if (state === 'OPEN') {
    return null;
  }
  // For CLOSED state, default to COMPLETED if not provided
  return providedReason || 'COMPLETED';
}

export async function updateIssueState(
  projectId: string,
  issueId: string,
  data: UpdateIssueStateInput
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
    currentIssue.status as IssueState,
    data.state
  );

  // Determine closeReason based on state and provided value
  const closeReason = getCloseReasonForState(data.state, data.closeReason);

  // Use transaction to ensure atomicity of status update and audit logging
  return executeInTransactionAsync(db, (txnDb) => {
    // Update issue state and closeReason
    const updatedIssue = updateIssue(txnDb, issueId, {
      status: data.state,
      closeReason: closeReason,
    });

    if (!updatedIssue) {
      throw new InternalError('Failed to update issue state');
    }

    // Write audit log for state change
    createIssueAuditLog(txnDb, {
      issueId: issueId,
      projectId: projectId,
      actorId: user.id,
      action: 'ISSUE_STATUS_CHANGED',
      fromStatus: currentIssue.status,
      toStatus: data.state,
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

export interface IssueListResult {
  items: Issue[];
  total: number;
  pagination: {
    currentPage: number;
    totalPages: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function listIssuesWithFilters(
  filters: IssueFiltersInput
): Promise<IssueListResult> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Calculate pagination parameters
  const currentPage = filters.page;
  const limit = filters.limit;
  const offset = (currentPage - 1) * limit;

  // Get all projects owned by user for permission filtering
  const userProjects = findProjectsByOwnerId(db, user.id);
  const userProjectIds = userProjects.map(p => p.id);

  // If user has no projects, return empty result
  if (userProjectIds.length === 0) {
    return {
      items: [],
      total: 0,
      pagination: {
        currentPage,
        totalPages: 0,
        limit,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  // Build filters with project permission constraint
  const dbFilters: { projectId?: string; status?: string; assigneeId?: string } = {};
  if (filters.projectId) {
    // If projectId filter is provided, verify user owns that project
    if (!userProjectIds.includes(filters.projectId)) {
      // User requested specific project they don't own - return empty
      return {
        items: [],
        total: 0,
        pagination: {
          currentPage,
          totalPages: 0,
          limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
    dbFilters.projectId = filters.projectId;
  }

  if (filters.state) {
    dbFilters.status = filters.state;
  }

  if (filters.assigneeId) {
    dbFilters.assigneeId = filters.assigneeId;
  }

  // Get total count (before pagination)
  let totalCount = 0;
  if (!filters.projectId) {
    // No projectId filter - we need to count across user's projects only
    // For now, we'll get all issues and filter in application layer
    const allIssues = findIssuesWithFilters(db, dbFilters, { offset: 0, limit: Number.MAX_SAFE_INTEGER });
    const userIssues = allIssues.filter(issue => userProjectIds.includes(issue.projectId));
    totalCount = userIssues.length;

    // Get paginated results
    const paginatedIssues = userIssues.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      items: paginatedIssues,
      total: totalCount,
      pagination: {
        currentPage,
        totalPages,
        limit,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  } else {
    // Has projectId filter - use direct database query
    totalCount = countIssuesWithFilters(db, dbFilters);
    const issues = findIssuesWithFilters(db, dbFilters, { offset, limit });
    const totalPages = Math.ceil(totalCount / limit);

    return {
      items: issues,
      total: totalCount,
      pagination: {
        currentPage,
        totalPages,
        limit,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }
}
