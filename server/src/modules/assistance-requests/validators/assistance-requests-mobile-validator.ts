import { z } from 'zod';
import {
  AssistanceAssessmentStatus,
  AssistanceCategory,
  AssistanceRequestStatus,
  AssistanceUrgency,
  RoleType,
} from '../../../infastructures/prisma/common/client';

/** Every mobile side can file; the role switcher is device-local. */
export const MOBILE_ASSISTANCE_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

export const ASSISTANCE_ATTACHMENT_MAX_COUNT = 3;
export const ASSISTANCE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ASSISTANCE_ATTACHMENT_ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

export const ASSISTANCE_CANCELLABLE_STATUSES = [
  AssistanceRequestStatus.PENDING,
  AssistanceRequestStatus.UNDER_REVIEW,
  AssistanceRequestStatus.APPROVED,
] as const;

/** Multipart sends text; an empty string means "no pin". */
const coordinate = (label: string, min: number, max: number) =>
  z.preprocess(
    (value) =>
      value === '' || value === null || value === undefined
        ? undefined
        : Number(value),
    z
      .number(`${label} must be a number`)
      .min(min, `${label} is out of range`)
      .max(max, `${label} is out of range`)
      .optional(),
  );

const requestFields = {
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
  location_latitude: coordinate('Latitude', -90, 90),
  location_longitude: coordinate('Longitude', -180, 180),
  location_details: z
    .string()
    .trim()
    .max(200, 'Keep the landmark or address under 200 characters')
    .nullish(),
};

/** Both coordinates or neither. */
const hasWholePin = (body: {
  location_latitude?: number;
  location_longitude?: number;
}) =>
  (body.location_latitude === undefined) ===
  (body.location_longitude === undefined);

const pinError = {
  message: 'Pin the location on the map again',
  path: ['location_latitude'],
};

/** Multipart: text fields plus up to three `attachments`. */
export const CreateAssistanceRequestSchema = z
  .object(requestFields)
  .strict()
  .refine(hasWholePin, pinError);

/** JSON; every field sent. Attachments stay as filed; omitting the pin removes it. */
export const UpdateAssistanceRequestSchema = z
  .object(requestFields)
  .strict()
  .refine(hasWholePin, pinError);

export const CancelAssistanceRequestSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(300, 'Keep the reason under 300 characters')
      .nullish(),
  })
  .strict();

export const AssistanceRequestIdParamSchema = z.uuid(
  'A valid assistance request id is required',
);

export const AssistanceAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  mime: z.string(),
  size_bytes: z.number(),
});

/** Derived from the stage timestamps. */
export const AssistanceTimelineEntrySchema = z.object({
  label: z.string(),
  date: z.iso.datetime().nullable(),
  done: z.boolean(),
  note: z.string().nullable(),
});

export const MobileAssistanceRequestSchema = z.object({
  assistance_request_id: z.string(),
  reference_number: z.number(),
  /** e.g. `CARES-AR-2026-0007`. */
  reference_label: z.string(),
  title: z.string(),
  category: z.enum(AssistanceCategory),
  description: z.string(),
  urgency: z.enum(AssistanceUrgency),
  household_size: z.number(),
  location_latitude: z.number().nullable(),
  location_longitude: z.number().nullable(),
  location_details: z.string().nullable(),
  status: z.enum(AssistanceRequestStatus),
  assessment_status: z.enum(AssistanceAssessmentStatus),
  assessment_date: z.iso.datetime().nullable(),
  assigned_organization: z.string().nullable(),
  items: z.array(z.string()),
  /** Staff note, or the stock line for the status. */
  status_note: z.string(),
  attachments: z.array(AssistanceAttachmentSchema),
  timeline: z.array(AssistanceTimelineEntrySchema),
  /** Untouched by the relief desk. */
  can_edit: z.boolean(),
  can_cancel: z.boolean(),
  cancelled_at: z.iso.datetime().nullable(),
  cancel_reason: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const MobileAssistanceRequestListResponseSchema = z.object({
  items: z.array(MobileAssistanceRequestSchema),
});

export const MobileAssistanceRequestResponseSchema =
  MobileAssistanceRequestSchema;
