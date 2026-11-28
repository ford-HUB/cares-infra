import { z } from 'zod'
import {
  awardTextIssue,
  BODY_MAX_LENGTH,
  CERTIFICATE_ACCENT_ORDER,
  HEADLINE_MAX_LENGTH,
  MAX_SIGNATORIES,
  placeholderIssue,
  TITLE_MAX_LENGTH,
} from '../constants/certificate-design'
import { CERTIFICATE_FONT_ORDER } from '../constants/certificate-fonts'
import {
  ELEMENT_HEIGHT_MAX,
  ELEMENT_HEIGHT_MIN,
  ELEMENT_WIDTH_MAX,
  ELEMENT_WIDTH_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_WEIGHT_ORDER,
  TEXT_ALIGN_ORDER,
} from '../constants/certificate-typography'
import { CERTIFICATE_FRAME_ORDER } from '../constants/certificate-frames'
import { CERTIFICATE_SEAL_ORDER } from '../constants/certificate-seals'
import { CERTIFICATE_ELEMENT_ORDER } from '../constants/certificate-layout'
import { TEMPLATE_CATEGORY_ORDER, TEMPLATE_STATUS_ORDER } from '../constants/certificate-templates'

// Filled from the picked coordinator; guards shape, not typed text.
const signatorySchema = z.object({
  id: z.string(),
  coordinatorId: z.string().min(1, 'Pick a coordinator account'),
  name: z.string().trim().min(2, 'Signatory name is required'),
  title: z.string().trim().min(2, 'Signatory title is required'),
  department: z.string().trim().min(2, 'Signatory department is required'),
  // Resolved at print time; no control changes it.
  signatureToken: z.string(),
  hasSignature: z.boolean(),
  avatarUrl: z.string().optional(),
})

const positionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
})

const layoutSchema = z.object(
  Object.fromEntries(
    CERTIFICATE_ELEMENT_ORDER.map((id) => [id, positionSchema]),
  ) as Record<(typeof CERTIFICATE_ELEMENT_ORDER)[number], typeof positionSchema>,
)

// Placed by dragging; guards the stored shape.
const imageSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  shape: z.enum(['square', 'rounded', 'circle', 'triangle']),
  z: z.number(),
})

export const certificateTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Template name is required')
    .max(80, 'Template name must not exceed 80 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Describe when this template is used')
    .max(160, 'Description must not exceed 160 characters'),
  category: z.enum(TEMPLATE_CATEGORY_ORDER),
  status: z.enum(TEMPLATE_STATUS_ORDER),
  orientation: z.enum(['landscape', 'portrait']),
  accent: z.enum(CERTIFICATE_ACCENT_ORDER),
  frame: z.enum(CERTIFICATE_FRAME_ORDER),
  images: z.array(imageSchema),
  /** Replaces the built-in frame when set. */
  frameSvgUrl: z.string().optional(),
  frameSvgName: z.string().optional(),
  layout: layoutSchema,
  font: z.enum(CERTIFICATE_FONT_ORDER),
  // Only changed blocks carry an entry.
  elementFonts: z.partialRecord(
    z.enum(CERTIFICATE_ELEMENT_ORDER),
    z.enum(CERTIFICATE_FONT_ORDER),
  ),
  /** Points; the field clamps as typed, so this guards the stored shape. */
  elementSizes: z.partialRecord(
    z.enum(CERTIFICATE_ELEMENT_ORDER),
    z.number().min(FONT_SIZE_MIN).max(FONT_SIZE_MAX),
  ),
  elementWidths: z.partialRecord(
    z.enum(CERTIFICATE_ELEMENT_ORDER),
    z.number().min(ELEMENT_WIDTH_MIN).max(ELEMENT_WIDTH_MAX),
  ),
  elementHeights: z.partialRecord(
    z.enum(CERTIFICATE_ELEMENT_ORDER),
    z.number().min(ELEMENT_HEIGHT_MIN).max(ELEMENT_HEIGHT_MAX),
  ),
  elementAligns: z.partialRecord(
    z.enum(CERTIFICATE_ELEMENT_ORDER),
    z.enum(TEXT_ALIGN_ORDER),
  ),
  elementWeights: z.partialRecord(
    z.enum(CERTIFICATE_ELEMENT_ORDER),
    z.enum(FONT_WEIGHT_ORDER),
  ),
  elementUnderlines: z.partialRecord(z.enum(CERTIFICATE_ELEMENT_ORDER), z.boolean()),
  title: z
    .string()
    .trim()
    .min(1, 'The award name is required')
    .max(TITLE_MAX_LENGTH, `Award name must not exceed ${TITLE_MAX_LENGTH} characters`)
    .superRefine((title, ctx) => {
      const issue = placeholderIssue(title)
      if (issue) {
        ctx.addIssue({ code: 'custom', message: issue })
      }
    }),
  headline: z
    .string()
    .trim()
    .min(4, 'The headline is required')
    .max(HEADLINE_MAX_LENGTH, `Headline must not exceed ${HEADLINE_MAX_LENGTH} characters`),
  body: z
    .string()
    .trim()
    .min(20, 'The award text is required')
    .max(BODY_MAX_LENGTH, `Award text must not exceed ${BODY_MAX_LENGTH} characters`)
    // Bad placeholders only show up at print time, so check them here.
    .superRefine((body, ctx) => {
      const issue = awardTextIssue(body)
      if (issue) {
        ctx.addIssue({ code: 'custom', message: issue })
      }
    }),
  showSeal: z.boolean(),
  sealLabel: z.string().trim().max(24, 'Seal label must not exceed 24 characters'),
  sealStyle: z.enum(CERTIFICATE_SEAL_ORDER),
  /** Unset follows the sheet's accent. */
  sealAccent: z.enum(CERTIFICATE_ACCENT_ORDER).optional(),
  /** Wins over `sealStyle` while set. */
  sealSvgUrl: z.string().optional(),
  sealSvgName: z.string().optional(),
  signatories: z
    .array(signatorySchema)
    .min(1, 'A certificate needs at least one signatory')
    .max(MAX_SIGNATORIES, `A certificate takes at most ${MAX_SIGNATORIES} signatories`),
})

export type CertificateTemplateFormValues = z.infer<typeof certificateTemplateSchema>
