import { z } from 'zod';
import {
  AssistanceAssessmentStatus,
  AssistanceCategory,
  AssistanceRequestStatus,
  AssistanceUrgency,
  RoleType,
} from '../../../infastructures/prisma/common/client';

/** Every mobile side can file; the app's role switcher is local to the device. */
export const MOBILE_ASSISTANCE_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

/** Proof documents on a request — photos from the camera or a picked PDF / image. */
export const ASSISTANCE_ATTACHMENT_MAX_COUNT = 3;
export const ASSISTANCE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ASSISTANCE_ATTACHMENT_ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

/** Multipart body: these text fields beside up to three `attachments` files. */
export const CreateAssistanceRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Tell us what you need')
      .max(160, 'Keep what you need under 160 characters'),
    category: z.enum(AssistanceCategory, 'Choose an assistance category'),
    description: z
      .string()
      .trim()
      .min(1, 'Describe your situation')
      .max(500, 'Keep the description under 500 characters'),
    urgency: z.enum(AssistanceUrgency, 'Choose how urgent this is'),
  })
  .strict();

export const AssistanceAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  mime: z.string(),
  size_bytes: z.number(),
});

/** One stage on the request's progress trail, derived from the stage timestamps. */
export const AssistanceTimelineEntrySchema = z.object({
  label: z.string(),
  date: z.iso.datetime().nullable(),
  done: z.boolean(),
  note: z.string().nullable(),
});

export const MobileAssistanceRequestSchema = z.object({
  assistance_request_id: z.string(),
  reference_number: z.number(),
  /** `CARES-AR-2026-0007` — the year filed and the padded tracking number. */
  reference_label: z.string(),
  title: z.string(),
  category: z.enum(AssistanceCategory),
  description: z.string(),
  urgency: z.enum(AssistanceUrgency),
  household_size: z.number(),
  status: z.enum(AssistanceRequestStatus),
  assessment_status: z.enum(AssistanceAssessmentStatus),
  assessment_date: z.iso.datetime().nullable(),
  assigned_organization: z.string().nullable(),
  items: z.array(z.string()),
  /** Staff note, or a stock line for the status when none was written. */
  status_note: z.string(),
  attachments: z.array(AssistanceAttachmentSchema),
  timeline: z.array(AssistanceTimelineEntrySchema),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const MobileAssistanceRequestListResponseSchema = z.object({
  items: z.array(MobileAssistanceRequestSchema),
});

export const MobileAssistanceRequestResponseSchema =
  MobileAssistanceRequestSchema;
