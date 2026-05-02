import { getDb, executeInTransactionAsync } from '@/lib/db';
import {
  createIssue as createIssueDb,
  findIssuesByProjectId,
  findIssueById,
  updateIssue as updateIssueDb,
  findIssuesWithFilters,
  countIssuesWithFilters,
  getCloseReasonStats as getCloseReasonStatsDb,
} from '@/lib/db/issues';
import { findProjectById } from '@/lib/db/projects';
import { findUserById } from '@/lib/db/users';
import { isProjectMember as isProjectMemberDb } from '@/lib/db/project-members';
import { createIssueAuditLog } from '@/lib/db/issue-audit-logs';
import { requireAuthenticatedUser } from './auth';
import { createAssigneeChangedNotification } from './notification';
import { NotFoundError, InvalidStateTransitionError, InternalError, ForbiddenError, ConflictError } from '@/lib/errors';
import type { CreateIssueInput, IssueState, CloseReason, UpdateIssueStateInput, UpdateIssueAssigneeInput, UpdateIssueInput, IssueFiltersInput, BatchUpdateIssuesInput, PresetViewKey, PresetViewParamsInput, PresetViewDefinition, CloseReasonStatsInput, CloseReasonStatsResult, DashboardStatsInput, DashboardStatsResult } from '@/lib/validators/issue';
import { PRESET_VIEWS } from '@/lib/validators/issue';

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

  // Verify project exists and user is a member
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if user is a project member
  if (!isProjectMemberDb(db, projectId, user.id)) {
    throw new ForbiddenError('You do not have access to this project');
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

  // Verify project exists and user is a member
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if user is a project member
  if (!isProjectMemberDb(db, projectId, user.id)) {
    throw new ForbiddenError('You do not have access to this project');
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

  // Verify project exists and user is a member
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if user is a project member
  if (!isProjectMemberDb(db, projectId, user.id)) {
    throw new ForbiddenError('You do not have access to this project');
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

  // Verify project exists and user is a member
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if user is a project member
  if (!isProjectMemberDb(db, projectId, user.id)) {
    throw new ForbiddenError('You do not have access to this project');
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
  try {
    return executeInTransactionAsync(db, (txnDb) => {
      // Update issue state and closeReason with optimistic locking
      const updatedIssue = updateIssueDb(txnDb, issueId, {
        status: data.state,
        closeReason: closeReason,
      }, data.expectedUpdatedAt);

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
  } catch (error) {
    // Handle optimistic locking conflict
    if (error instanceof Error && 'code' in error && error.code === 'CONFLICT') {
      const conflictError = error as Error & { code: string; currentIssue?: Issue };
      throw new ConflictError('Issue has been modified by another user. Please refresh and try again.', {
        currentIssue: conflictError.currentIssue,
      });
    }
    throw error;
  }
}

export async function updateIssueAssignee(
  projectId: string,
  issueId: string,
  data: UpdateIssueAssigneeInput
): Promise<Issue> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Verify project exists and user is a member
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if user is a project member
  if (!isProjectMemberDb(db, projectId, user.id)) {
    throw new ForbiddenError('You do not have access to this project');
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

  // If setting an assignee, verify the user exists and is a project member
  if (data.assigneeId !== null) {
    const assignee = findUserById(db, data.assigneeId);
    if (!assignee) {
      throw new NotFoundError('Assignee');
    }

    // Check if assignee is a project member
    if (!isProjectMemberDb(db, projectId, data.assigneeId)) {
      throw new ForbiddenError('Assignee must be a member of this project');
    }
  }

  // Use transaction to ensure atomicity
  try {
    return executeInTransactionAsync(db, (txnDb) => {
      const updatedIssue = updateIssueDb(txnDb, issueId, {
        assigneeId: data.assigneeId,
      }, data.expectedUpdatedAt);

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

      // Create notification for the new assignee if assignee actually changed
      // Only notify when assignee is different from current assignee
      if (data.assigneeId !== null && data.assigneeId !== currentIssue.assigneeId) {
        createAssigneeChangedNotification(data.assigneeId, issueId, projectId);
      }

      return updatedIssue;
    });
  } catch (error) {
    // Handle optimistic locking conflict
    if (error instanceof Error && 'code' in error && error.code === 'CONFLICT') {
      const conflictError = error as Error & { code: string; currentIssue?: Issue };
      throw new ConflictError('Issue has been modified by another user. Please refresh and try again.', {
        currentIssue: conflictError.currentIssue,
      });
    }
    throw error;
  }
}

/**
 * Update issue fields (title, description) with optimistic locking
 */
export async function updateIssue(
  projectId: string,
  issueId: string,
  data: UpdateIssueInput
): Promise<Issue> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Verify project exists and user is a member
  const project = findProjectById(db, projectId);
  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if user is a project member
  if (!isProjectMemberDb(db, projectId, user.id)) {
    throw new ForbiddenError('You do not have access to this project');
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

  // Use transaction to ensure atomicity of update and audit logging
  try {
    return executeInTransactionAsync(db, (txnDb) => {
      // Build update object
      const updateFields: {
        title?: string;
        description?: string | null;
      } = {};

      if (data.title !== undefined) {
        updateFields.title = data.title;
      }

      if (data.description !== undefined) {
        updateFields.description = data.description;
      }

      // Update issue with optimistic locking
      const updatedIssue = updateIssueDb(txnDb, issueId, updateFields, data.expectedUpdatedAt);

      if (!updatedIssue) {
        throw new InternalError('Failed to update issue');
      }

      // Write audit log for title/description changes
      const titleChanged = data.title !== undefined && data.title !== currentIssue.title;
      const descriptionChanged = data.description !== undefined && data.description !== currentIssue.description;

      if (titleChanged || descriptionChanged) {
        createIssueAuditLog(txnDb, {
          issueId: issueId,
          projectId: projectId,
          actorId: user.id,
          action: 'ISSUE_STATUS_CHANGED', // Using existing action type for simplicity
          fromStatus: null,
          toStatus: null,
        });
      }

      return updatedIssue;
    });
  } catch (error) {
    // Handle optimistic locking conflict
    if (error instanceof Error && 'code' in error && error.code === 'CONFLICT') {
      const conflictError = error as Error & { code: string; currentIssue?: Issue };
      throw new ConflictError('Issue has been modified by another user. Please refresh and try again.', {
        currentIssue: conflictError.currentIssue,
      });
    }
    throw error;
  }
}

export interface IssueListResult {
  items: Issue[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasNextPage: boolean;
  };
}

export async function listIssuesWithFilters(
  filters: IssueFiltersInput
): Promise<IssueListResult> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Get pagination parameters
  const limit = filters.limit;
  const offset = filters.offset;

  // Get all projects where user is a member for permission filtering
  const { findProjectIdsByUserId } = await import('@/lib/db/project-members');
  const userProjectIds = findProjectIdsByUserId(db, user.id);

  // If user has no projects, return empty result
  if (userProjectIds.length === 0) {
    return {
      items: [],
      total: 0,
      pagination: {
        limit,
        offset,
        hasNextPage: false,
      },
    };
  }

  // Build filters with project permission constraint
  const dbFilters: { projectId?: string; status?: string; assigneeId?: string; projectIds?: string[] } = {};

  if (filters.projectId) {
    // If projectId filter is provided, verify user is a member of that project
    if (!userProjectIds.includes(filters.projectId)) {
      // User requested specific project they don't have access to - return empty
      return {
        items: [],
        total: 0,
        pagination: {
          limit,
          offset,
          hasNextPage: false,
        },
      };
    }
    dbFilters.projectId = filters.projectId;
  } else {
    // No projectId filter - restrict to user's projects for permission isolation
    dbFilters.projectIds = userProjectIds;
  }

  if (filters.state) {
    dbFilters.status = filters.state;
  }

  if (filters.assigneeId) {
    dbFilters.assigneeId = filters.assigneeId;
  }

  // Get total count (before pagination)
  const totalCount = countIssuesWithFilters(db, dbFilters);

  // Get paginated results with sorting
  const issues = findIssuesWithFilters(db, dbFilters, { offset, limit }, {
    sortBy: filters.sortBy,
    order: filters.order,
  });

  return {
    items: issues,
    total: totalCount,
    pagination: {
      limit,
      offset,
      hasNextPage: offset + limit < totalCount,
    },
  };
}

/**
 * Batch update multiple issues
 */
export async function batchUpdateIssues(data: BatchUpdateIssuesInput): Promise<{
  success: true;
  updatedCount: number;
}> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Validate all issue IDs exist and user has access to them
  const issuesToUpdate: Issue[] = [];
  const projectsMap = new Map<string, boolean>(); // Cache project membership checks

  for (const issueId of data.issueIds) {
    const issue = findIssueById(db, issueId);
    if (!issue) {
      throw new NotFoundError(`Issue ${issueId} not found`);
    }

    // Check if user is a member of the project (use cache if available)
    let hasAccess = projectsMap.get(issue.projectId);
    if (hasAccess === undefined) {
      hasAccess = isProjectMemberDb(db, issue.projectId, user.id);
      projectsMap.set(issue.projectId, hasAccess);
    }

    if (!hasAccess) {
      throw new ForbiddenError(`You do not have access to issue ${issueId}`);
    }

    issuesToUpdate.push(issue);
  }

  // If setting an assignee, verify the user exists and is a member of all affected projects
  if (data.assigneeId !== undefined) {
    if (data.assigneeId !== null) {
      const assignee = findUserById(db, data.assigneeId);
      if (!assignee) {
        throw new NotFoundError('Assignee');
      }

      // Verify assignee is a member of all unique projects affected by this batch
      const uniqueProjectIds = [...new Set(issuesToUpdate.map(issue => issue.projectId))];
      for (const projectId of uniqueProjectIds) {
        if (!isProjectMemberDb(db, projectId, data.assigneeId)) {
          throw new ForbiddenError('Assignee must be a member of all affected projects');
        }
      }
    }
  }

  // Validate state transitions and prepare updates
  const updates: Array<{
    issue: Issue;
    newState?: IssueState;
    newCloseReason: CloseReason | null;
  }> = [];

  for (const issue of issuesToUpdate) {
    const updateData: {
      state?: IssueState;
      closeReason?: CloseReason | null;
    } = {};

    // Handle state update
    if (data.state !== undefined) {
      validateStateTransition(issue.status as IssueState, data.state);
      updateData.state = data.state;
      updateData.closeReason = getCloseReasonForState(data.state);
    }

    updates.push({
      issue,
      newState: updateData.state,
      newCloseReason: updateData.closeReason ?? null,
    });
  }

  // Use transaction to ensure atomicity
  let updatedCount = 0;
  executeInTransactionAsync(db, (txnDb) => {
    for (const { issue, newState, newCloseReason } of updates) {
      const updateFields: {
        status?: IssueState;
        closeReason?: CloseReason | null;
        assigneeId?: string | null;
      } = {};

      if (newState !== undefined) {
        updateFields.status = newState;
        updateFields.closeReason = newCloseReason;
      }

      if (data.assigneeId !== undefined) {
        updateFields.assigneeId = data.assigneeId;
      }

      // Update the issue
      const updatedIssue = updateIssueDb(txnDb, issue.id, updateFields);
      if (!updatedIssue) {
        throw new InternalError(`Failed to update issue ${issue.id}`);
      }

      // Write audit logs for changes
      if (newState !== undefined && newState !== issue.status) {
        createIssueAuditLog(txnDb, {
          issueId: issue.id,
          projectId: issue.projectId,
          actorId: user.id,
          action: 'ISSUE_STATUS_CHANGED',
          fromStatus: issue.status,
          toStatus: newState,
        });
      }

      if (data.assigneeId !== undefined && data.assigneeId !== issue.assigneeId) {
        createIssueAuditLog(txnDb, {
          issueId: issue.id,
          projectId: issue.projectId,
          actorId: user.id,
          action: 'ISSUE_ASSIGNEE_CHANGED',
          fromAssigneeId: issue.assigneeId,
          toAssigneeId: data.assigneeId,
          fromStatus: null,
          toStatus: null,
        });
      }

      updatedCount++;
    }
  });

  return {
    success: true,
    updatedCount,
  };
}

/**
 * Get all available preset view definitions
 */
export function getPresetViews(): PresetViewDefinition[] {
  return Object.values(PRESET_VIEWS);
}

/**
 * Get preset view results by key
 */
export async function getPresetViewResults(
  params: PresetViewParamsInput
): Promise<{
  view: PresetViewDefinition;
  items: Issue[];
  total: number;
}> {
  const user = await requireAuthenticatedUser();

  // Map preset view keys to their corresponding filters
  const viewFiltersMap: Record<PresetViewKey, Omit<IssueFiltersInput, 'limit' | 'offset' | 'sortBy' | 'order'>> = {
    MY_ISSUES: {
      assigneeId: user.id, // Only issues assigned to current user
    },
    OPEN_ISSUES: {
      state: 'OPEN', // Only open issues
    },
    CLOSED_ISSUES: {
      state: 'CLOSED', // Only closed issues
    },
  };

  // Get the filters for the requested view
  const baseFilters = viewFiltersMap[params.key];

  // Create full filter params with pagination
  const filters: IssueFiltersInput = {
    ...baseFilters,
    limit: params.limit,
    offset: params.offset,
    sortBy: 'createdAt',
    order: 'desc',
  };

  // Get view definition
  const viewDefinition = PRESET_VIEWS[params.key];

  // Reuse existing listIssuesWithFilters functionality
  const result = await listIssuesWithFilters(filters);

  return {
    view: viewDefinition,
    items: result.items,
    total: result.total,
  };
}

/**
 * Get close reason statistics for issues
 * Supports both project-specific and global statistics
 */
export async function getCloseReasonStats(
  filters: CloseReasonStatsInput
): Promise<CloseReasonStatsResult> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Build filters with project permission constraint
  const dbFilters: { projectId?: string; projectIds?: string[] } = {};

  if (filters.projectId) {
    // If projectId filter is provided, verify user is a member of that project
    if (!isProjectMemberDb(db, filters.projectId, user.id)) {
      // User requested specific project they don't have access to - return empty
      return {
        items: [],
        total: 0,
      };
    }
    dbFilters.projectId = filters.projectId;
  } else {
    // No projectId filter - get statistics for all user's projects for permission isolation
    const { findProjectIdsByUserId } = await import('@/lib/db/project-members');
    const userProjectIds = findProjectIdsByUserId(db, user.id);

    // If user has no projects, return empty result
    if (userProjectIds.length === 0) {
      return {
        items: [],
        total: 0,
      };
    }
    dbFilters.projectIds = userProjectIds;
  }

  // Get close reason statistics from database
  return getCloseReasonStatsDb(db, dbFilters);
}

/**
 * Get dashboard statistics for issues
 * Provides aggregated metrics: total counts, status distribution, and close reason statistics
 * Supports both project-specific and global statistics
 */
export async function getDashboardStats(
  filters: DashboardStatsInput
): Promise<DashboardStatsResult> {
  const db = getDb();
  const user = await requireAuthenticatedUser();

  // Build base filters with project permission constraint
  const baseFilters: { projectId?: string; projectIds?: string[] } = {};

  if (filters.projectId) {
    // If projectId filter is provided, verify user is a member of that project
    if (!isProjectMemberDb(db, filters.projectId, user.id)) {
      // User requested specific project they don't have access to - return empty stats
      return {
        total: 0,
        openCount: 0,
        closedCount: 0,
        closeReasonStats: {
          items: [],
          total: 0,
        },
      };
    }
    baseFilters.projectId = filters.projectId;
  } else {
    // No projectId filter - get statistics for all user's projects for permission isolation
    const { findProjectIdsByUserId } = await import('@/lib/db/project-members');
    const userProjectIds = findProjectIdsByUserId(db, user.id);

    // If user has no projects, return empty result
    if (userProjectIds.length === 0) {
      return {
        total: 0,
        openCount: 0,
        closedCount: 0,
        closeReasonStats: {
          items: [],
          total: 0,
        },
      };
    }
    baseFilters.projectIds = userProjectIds;
  }

  // Get total count (all statuses)
  const total = countIssuesWithFilters(db, baseFilters);

  // Get open issues count
  const openCount = countIssuesWithFilters(db, {
    ...baseFilters,
    status: 'OPEN',
  });

  // Get closed issues count
  const closedCount = countIssuesWithFilters(db, {
    ...baseFilters,
    status: 'CLOSED',
  });

  // Get close reason statistics (only for closed issues)
  const closeReasonStats = await getCloseReasonStats({
    projectId: filters.projectId,
  });

  return {
    total,
    openCount,
    closedCount,
    closeReasonStats,
  };
}
