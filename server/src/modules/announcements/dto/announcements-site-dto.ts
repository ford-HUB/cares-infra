import { z } from 'zod';
import {
  AnnouncementListResponseSchema,
  AnnouncementResponseSchema,
  ListAnnouncementsQuerySchema,
  SaveAnnouncementSchema,
  SetAnnouncementPinnedSchema,
  SetAnnouncementStateSchema,
} from '../validators/announcements-site-validator';

export type ListAnnouncementsQueryDto = z.infer<
  typeof ListAnnouncementsQuerySchema
>;
export type SaveAnnouncementDto = z.infer<typeof SaveAnnouncementSchema>;
export type SetAnnouncementStateDto = z.infer<
  typeof SetAnnouncementStateSchema
>;
export type SetAnnouncementPinnedDto = z.infer<
  typeof SetAnnouncementPinnedSchema
>;
export type AnnouncementDto = z.infer<typeof AnnouncementResponseSchema>;
export type AnnouncementListDto = z.infer<
  typeof AnnouncementListResponseSchema
>;
