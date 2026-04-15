import { z } from 'zod';

export type IssueState = 'OPEN' | 'CLOSED';
export type CloseReason = 'COMPLETED' | 'NOT_PLANNED' | 'DUPLICATE';

export const createIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .trim()
    .max(5000, 'Description must be at most 5000 characters')
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const issueIdSchema = z.object({
  issueId: z.string().min(1, 'Issue ID is required'),
});

export type IssueIdInput = z.infer<typeof issueIdSchema>;

// Re-export projectIdSchema for use in issue routes
export { projectIdSchema, type ProjectIdInput } from './project';

export const updateIssueStateSchema = z
  .object({
    state: z.enum(['OPEN', 'CLOSED']),
    closeReason: z.enum(['COMPLETED', 'NOT_PLANNED', 'DUPLICATE']).optional(),
  })
  .refine(
    (data) => {
      // When state is OPEN, closeReason must not be provided
      if (data.state === 'OPEN' && data.closeReason !== undefined) {
        return false;
      }
      // When state is CLOSED, closeReason is optional (defaults to COMPLETED)
      return true;
    },
    {
      message: 'closeReason can only be provided when state is CLOSED',
      path: ['closeReason'],
    }
  );

export type UpdateIssueStateInput = z.infer<typeof updateIssueStateSchema>;

export const updateIssueAssigneeSchema = z.object({
  assigneeId: z.string().uuid('Invalid assignee ID').nullable(),
});

export type UpdateIssueAssigneeInput = z.infer<typeof updateIssueAssigneeSchema>;

export const issueFiltersSchema = z.object({
  projectId: z.string().uuid('Invalid project ID').optional(),
  state: z.enum(['OPEN', 'CLOSED']).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type IssueFiltersInput = z.infer<typeof issueFiltersSchema>;

export const batchUpdateIssuesSchema = z
  .object({
    issueIds: z
      .array(z.string().min(1, 'Issue ID cannot be empty'))
      .min(1, 'At least one issue ID is required')
      .max(100, 'Cannot batch update more than 100 issues at once'),
    state: z.enum(['OPEN', 'CLOSED']).optional(),
    assigneeId: z.string().uuid('Invalid assignee ID').nullable().optional(),
  })
  .refine(
    (data) => data.state !== undefined || data.assigneeId !== undefined,
    {
      message: 'At least one update field (state or assigneeId) must be provided',
      path: ['root'],
    }
  )
  .refine(
    (data) => {
      // Validate state transition rules
      if (data.state === 'OPEN') {
        return true; // OPEN state never has closeReason
      }
      return true; // CLOSED state validation handled in service layer
    },
    {
      message: 'Invalid state transition',
      path: ['state'],
    }
  );

export type BatchUpdateIssuesInput = z.infer<typeof batchUpdateIssuesSchema>;

// Preset Views Types
export const PRESET_VIEW_KEYS = {
  MY_ISSUES: 'MY_ISSUES',
  OPEN_ISSUES: 'OPEN_ISSUES',
  CLOSED_ISSUES: 'CLOSED_ISSUES',
} as const;

export type PresetViewKey = typeof PRESET_VIEW_KEYS[keyof typeof PRESET_VIEW_KEYS];

export const presetViewKeySchema = z.enum([
  PRESET_VIEW_KEYS.MY_ISSUES,
  PRESET_VIEW_KEYS.OPEN_ISSUES,
  PRESET_VIEW_KEYS.CLOSED_ISSUES,
]);

export type PresetViewKeyInput = z.infer<typeof presetViewKeySchema>;

export const presetViewParamsSchema = z.object({
  key: presetViewKeySchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PresetViewParamsInput = z.infer<typeof presetViewParamsSchema>;

// Close Reason Statistics Types
export const closeReasonStatsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID').optional(),
});

export type CloseReasonStatsInput = z.infer<typeof closeReasonStatsSchema>;

export interface CloseReasonStatsResult {
  items: Array<{
    closeReason: 'COMPLETED' | 'NOT_PLANNED' | 'DUPLICATE';
    count: number;
  }>;
  total: number;
}

// Preset view definitions
export const PRESET_VIEWS = {
  MY_ISSUES: {
    key: PRESET_VIEW_KEYS.MY_ISSUES,
    name: 'My Issues',
    description: 'Issues assigned to you',
  },
  OPEN_ISSUES: {
    key: PRESET_VIEW_KEYS.OPEN_ISSUES,
    name: 'Open Issues',
    description: 'All open issues across your projects',
  },
  CLOSED_ISSUES: {
    key: PRESET_VIEW_KEYS.CLOSED_ISSUES,
    name: 'Closed Issues',
    description: 'All closed issues across your projects',
  },
} as const;

export type PresetViewDefinition = typeof PRESET_VIEWS[keyof typeof PRESET_VIEWS];
