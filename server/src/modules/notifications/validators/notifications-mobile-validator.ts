import { z } from 'zod';
import { RoleType } from '../../../infastructures/prisma/common/client';
import { NotificationFeedSchema } from './notifications-site-validator';

/** The sides an app account can switch between. */
export const MOBILE_AUDIENCE_ROLES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

/**
 * Scopes a read to one side of the account: that side's rows plus the
 * account-wide ones. Omitted, every row comes back — the app reads it whole so
 * news for a side the person is not looking at still pops on the device.
 */
const AudienceRoleSchema = z.enum(MOBILE_AUDIENCE_ROLES).optional();

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
    role: AudienceRoleSchema,
  })
  .strict();

export const MarkAllMobileNotificationsReadQuerySchema = z
  .object({ role: AudienceRoleSchema })
  .strict();

/** Same rows the portal reads — one table, one shape. */
export const MobileNotificationFeedSchema = NotificationFeedSchema;

export const NotificationIdParamSchema = z.uuid(
  'A valid notification id is required',
);
