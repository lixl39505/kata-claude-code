import { z } from 'zod';

export const notificationIdSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
});

export const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  isRead: z.coerce.boolean().optional(),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;

export const markNotificationAsReadSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
});

export type MarkNotificationAsReadInput = z.infer<typeof markNotificationAsReadSchema>;
