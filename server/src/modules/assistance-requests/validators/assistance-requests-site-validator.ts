import { z } from 'zod';
import {
  AssistanceAssessmentStatus,
  AssistanceCategory,
  AssistanceRequestStatus,
  AssistanceUrgency,
} from '../../../infastructures/prisma/common/client';

export const AssistanceRequestIdParamSchema = z.uuid(
  'A valid assistance request id is required',
);

export const AssistanceAttachmentIdParamSchema = z.uuid(
  'A valid attachment id is required',
);

/** Approving may carry a note the beneficiary reads under the status. */
export const ApproveAssistanceRequestSchema = z
  .object({
    note: z
      .string()
      .trim()
      .max(500, 'Keep the note under 500 characters')
      .nullish(),
  })
  .strict();

/** A decline must say why — the beneficiary reads it in the app. */
export const DeclineAssistanceRequestSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, 'Say why the request is declined')
      .max(500, 'Keep the reason under 500 characters'),
  })
  .strict();

export const SiteAssistanceAttachmentSchema = z.object({
  assistance_request_attachment_id: z.string(),
  name: z.string(),
  mime: z.string(),
  size_bytes: z.number(),
});

export const SiteAssistanceRequestSchema = z.object({
  assistance_request_id: z.string(),
  reference_number: z.number(),
  /** `CARES-AR-2026-0007`, the same label the beneficiary sees. */
  reference_label: z.string(),
  requester_id: z.string(),
  requester_firstname: z.string(),
  requester_lastname: z.string(),
  requester_email: z.string(),
  requester_role_type: z.string(),
  requester_barangay: z.string().nullable(),
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
  /** Staff note — the approval note or the decline reason. */
  status_note: z.string().nullable(),
  attachments: z.array(SiteAssistanceAttachmentSchema),
  screened_at: z.iso.datetime().nullable(),
  decided_at: z.iso.datetime().nullable(),
  released_at: z.iso.datetime().nullable(),
  cancelled_at: z.iso.datetime().nullable(),
  cancel_reason: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const SiteAssistanceRequestListResponseSchema = z.object({
  items: z.array(SiteAssistanceRequestSchema),
});
