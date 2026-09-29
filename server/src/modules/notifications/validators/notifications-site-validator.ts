import { z } from 'zod';
import {
  NotificationCategory,
  NotificationTone,
} from '../../../infastructures/prisma/common/client';

/**
 * The page splits "this week" from history client-side and folds history by month,
 * so the feed is fetched whole rather than paged — capped so a noisy month cannot
 * ship unbounded rows.
 */
export const NOTIFICATIONS_DEFAULT_LIMIT = 200;
export const NOTIFICATIONS_MAX_LIMIT = 500;

export const ListNotificationsQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(NOTIFICATIONS_MAX_LIMIT)
      .default(NOTIFICATIONS_DEFAULT_LIMIT),
  })
  .strict();

export const NotificationSchema = z.object({
  notification_id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(NotificationCategory),
  tone: z.enum(NotificationTone),
  href: z.string().nullable(),
  read: z.boolean(),
  created_at: z.iso.datetime(),
});

export const NotificationSummarySchema = z.object({
  total: z.number(),
  unread: z.number(),
  read: z.number(),
});

export const NotificationFeedSchema = z.object({
  summary: NotificationSummarySchema,
  items: z.array(NotificationSchema),
});
