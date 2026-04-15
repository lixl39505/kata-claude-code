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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
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
