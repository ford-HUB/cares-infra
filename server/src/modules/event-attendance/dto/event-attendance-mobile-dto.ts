import { z } from 'zod';
import {
  LiveCoordinateResponseSchema,
  LiveCoordinateSchema,
  SyncCoordinatesFieldsSchema,
  SyncCoordinatesResponseSchema,
} from '../validators/event-attendance-mobile-validator';

export type LiveCoordinateDto = z.infer<typeof LiveCoordinateSchema>;
export type LiveCoordinateResponseDto = z.infer<
  typeof LiveCoordinateResponseSchema
>;
export type SyncCoordinatesFieldsDto = z.infer<
  typeof SyncCoordinatesFieldsSchema
>;
export type SyncCoordinatesResponseDto = z.infer<
  typeof SyncCoordinatesResponseSchema
>;
