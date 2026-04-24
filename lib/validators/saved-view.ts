import { z } from 'zod';

// Re-export issueFiltersSchema for use in saved view filters
export { issueFiltersSchema, type IssueFiltersInput } from './issue';

/**
 * Schema for creating a saved view
 */
export const createSavedViewSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'View name is required')
    .max(100, 'View name must be at most 100 characters'),
  filters: z.object({
    projectId: z.string().uuid('Invalid project ID').optional(),
    state: z.enum(['OPEN', 'CLOSED']).optional(),
    assigneeId: z.string().uuid('Invalid assignee ID').optional(),
    sortBy: z.enum(['createdAt']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
});

export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>;

/**
 * Schema for view ID parameter
 */
export const savedViewIdSchema = z.object({
  viewId: z.string().min(1, 'View ID is required'),
});

export type SavedViewIdInput = z.infer<typeof savedViewIdSchema>;

/**
 * Schema for listing saved views with pagination
 */
export const listSavedViewsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListSavedViewsInput = z.infer<typeof listSavedViewsSchema>;

/**
 * Schema for querying issues using a saved view
 */
export const savedViewIssuesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SavedViewIssuesQueryInput = z.infer<typeof savedViewIssuesQuerySchema>;
