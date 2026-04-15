import { z } from 'zod';

/**
 * Schema for adding a project member
 */
export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['MEMBER']).optional().default('MEMBER'),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;

/**
 * Schema for removing a project member (uses URL params)
 */
export const removeProjectMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type RemoveProjectMemberInput = z.infer<typeof removeProjectMemberSchema>;

/**
 * Schema for listing project members with pagination
 */
export const listProjectMembersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListProjectMembersInput = z.infer<typeof listProjectMembersSchema>;
