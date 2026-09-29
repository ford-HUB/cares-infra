import { z } from 'zod';
import { NotificationFeedSchema } from './notifications-site-validator';

/** The app shows a short recent list; anything older is the portal's concern. */
export const MOBILE_NOTIFICATIONS_DEFAULT_LIMIT = 50;
export const MOBILE_NOTIFICATIONS_MAX_LIMIT = 100;

export const ListMobileNotificationsQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MOBILE_NOTIFICATIONS_MAX_LIMIT)
      .default(MOBILE_NOTIFICATIONS_DEFAULT_LIMIT),
  })
  .strict();

/** Same rows the portal reads — one table, one shape. */
export const MobileNotificationFeedSchema = NotificationFeedSchema;

export const NotificationIdParamSchema = z.uuid(
  'A valid notification id is required',
);
