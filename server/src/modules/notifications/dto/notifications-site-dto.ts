import { z } from 'zod';
import type {
  NotificationCategory,
  NotificationTone,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import {
  ListNotificationsQuerySchema,
  NotificationFeedSchema,
  NotificationSchema,
  NotificationSummarySchema,
} from '../validators/notifications-site-validator';

export type ListNotificationsQueryDto = z.infer<
  typeof ListNotificationsQuerySchema
>;
export type NotificationDto = z.infer<typeof NotificationSchema>;
export type NotificationSummaryDto = z.infer<typeof NotificationSummarySchema>;
export type NotificationFeedDto = z.infer<typeof NotificationFeedSchema>;

/** Addressed by role, user ids, or both; resolved to one row per person. */
export interface PublishNotificationInput {
  title: string;
  description: string;
  category: NotificationCategory;
  tone?: NotificationTone;
  href?: string;
  roles?: RoleType[];
  userIds?: string[];
  /** Mobile side the notice belongs to; unset for account-wide notices. */
  audienceRole?: RoleType;
  /** e.g. `event-start:42`; recipients already holding it are skipped. */
  dedupeKey?: string;
}
