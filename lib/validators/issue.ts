import { z } from 'zod';

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
