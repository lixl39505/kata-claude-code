import { z } from 'zod';

export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

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

export const updateIssueStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']),
});

export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;

export const updateIssueAssigneeSchema = z.object({
  assigneeId: z.string().uuid('Invalid assignee ID').nullable(),
});

export type UpdateIssueAssigneeInput = z.infer<typeof updateIssueAssigneeSchema>;

export const issueFiltersSchema = z.object({
  projectId: z.string().uuid('Invalid project ID').optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type IssueFiltersInput = z.infer<typeof issueFiltersSchema>;
