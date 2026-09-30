import { z } from 'zod';
import {
  ListMobileNotificationsQuerySchema,
  MarkAllMobileNotificationsReadQuerySchema,
  MobileNotificationFeedSchema,
} from '../validators/notifications-mobile-validator';

export type ListMobileNotificationsQueryDto = z.infer<
  typeof ListMobileNotificationsQuerySchema
>;
export type MarkAllMobileNotificationsReadQueryDto = z.infer<
  typeof MarkAllMobileNotificationsReadQuerySchema
>;
export type MobileNotificationFeedDto = z.infer<
  typeof MobileNotificationFeedSchema
>;
