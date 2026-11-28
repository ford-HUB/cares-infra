import { z } from 'zod';
import {
  NotificationCategory,
  NotificationTone,
  RoleType,
} from '../../../infastructures/prisma/common/client';

/** Grouped client-side, so fetched whole but capped. */
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
  /** Null is account-wide. */
  audience_role: z.enum(RoleType).nullable(),
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
