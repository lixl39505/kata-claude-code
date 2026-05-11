import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment content is required')
    .max(5000, 'Comment must be at most 5000 characters'),
});

export const commentIdSchema = z.object({
  commentId: z.string().min(1, 'Comment ID is required'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
