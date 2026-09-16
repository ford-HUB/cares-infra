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

/**
 * What a feature or scheduler hands to the publisher. Addressing is by role, by
 * explicit user ids, or both; the processor resolves it to one row per person.
 */
export interface PublishNotificationInput {
  title: string;
  description: string;
  category: NotificationCategory;
  tone?: NotificationTone;
  href?: string;
  /** Every current holder of these roles receives it. */
  roles?: RoleType[];
  /** Specific people, in addition to (or instead of) the roles. */
  userIds?: string[];
  /**
   * Stable per thing-being-announced (e.g. `event-start:42`). A recipient who already
   * holds a row with this key is skipped, so a sweep that runs every few minutes
   * cannot announce the same event twice.
   */
  dedupeKey?: string;
}
