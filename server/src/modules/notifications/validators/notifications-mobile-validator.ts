import { z } from 'zod';
import { RoleType } from '../../../infastructures/prisma/common/client';
import { NotificationFeedSchema } from './notifications-site-validator';

export const MOBILE_AUDIENCE_ROLES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

/** That side plus account-wide rows; omitted returns all so off-side news still pops. */
const AudienceRoleSchema = z.enum(MOBILE_AUDIENCE_ROLES).optional();

/** Short recent list. */
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

export const MobileNotificationFeedSchema = NotificationFeedSchema;

export const NotificationIdParamSchema = z.uuid(
  'A valid notification id is required',
);
