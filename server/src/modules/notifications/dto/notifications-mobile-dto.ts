import { z } from 'zod';
import {
  ListMobileNotificationsQuerySchema,
  MobileNotificationFeedSchema,
} from '../validators/notifications-mobile-validator';

export type ListMobileNotificationsQueryDto = z.infer<
  typeof ListMobileNotificationsQuerySchema
>;
export type MobileNotificationFeedDto = z.infer<
  typeof MobileNotificationFeedSchema
>;
