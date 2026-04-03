import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  key: z
    .string()
    .trim()
    .min(2, 'Key must be at least 2 characters')
    .max(20, 'Key must be at most 20 characters')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
      message:
        'Key must start with a letter and contain only letters, numbers, and underscores',
    })
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z][A-Z0-9_]*$/.test(val), {
      message: 'Key must start with a letter and contain only uppercase letters, numbers, and underscores after transformation',
    }),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters')
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const projectIdSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export type ProjectIdInput = z.infer<typeof projectIdSchema>;
