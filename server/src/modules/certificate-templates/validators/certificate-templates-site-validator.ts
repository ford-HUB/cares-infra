import { z } from 'zod';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { plainLabel } from '../../../shared/validators/plain-label-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';

/** Replaced by `Account.signature_url` at print time; the customizer never renders it. */
export const SIGNATURE_IMAGE_TOKEN = '{{signature-image}}';

export const CERTIFICATE_STATUSES = ['published', 'draft', 'archived'] as const;

export const CERTIFICATE_CATEGORIES = [
  'participation',
  'appreciation',
  'volunteer_hours',
  'completion',
  'sponsorship',
] as const;

export const CERTIFICATE_ORIENTATIONS = ['landscape', 'portrait'] as const;

export const CERTIFICATE_ACCENTS = [
  'emerald',
  'sky',
  'violet',
  'rose',
  'amber',
  'slate',
] as const;

export const CERTIFICATE_FRAMES = [
  'plain',
  'classic',
  'royal',
  'diagonal',
  'corners',
  'modern',
  'minimal',
] as const;

export const CERTIFICATE_SEAL_STYLES = [
  'stamp',
  'starburst',
  'rosette',
  'laurel',
  'ribbon',
  'monogram',
] as const;

export const CERTIFICATE_FONTS = [
  'default',
  'old_english',
  'pirata',
  'cinzel',
  'playfair',
  'cormorant',
  'garamond',
  'baskerville',
  'lora',
  'merriweather',
  'great_vibes',
  'pinyon',
  'dancing_script',
  'montserrat',
  'lato',
  'inter',
] as const;

/** Images are their own layer. */
export const CERTIFICATE_ELEMENTS = [
  'headline',
  'title',
  'body',
  'seal',
  'signatures',
] as const;

export const CERTIFICATE_IMAGE_SHAPES = [
  'square',
  'rounded',
  'circle',
  'triangle',
] as const;

export const CERTIFICATE_TEXT_ALIGNS = ['left', 'center', 'right'] as const;

/** Must match `FONT_WEIGHT_ORDER` in `site/src/constants/certificate-typography.ts`. */
export const CERTIFICATE_FONT_WEIGHTS = [
  'regular',
  'semibold',
  'bold',
  'extrabold',
] as const;

/** Must match `site/src/constants/certificate-design.ts`. */
export const MAX_SIGNATORIES = 3;
export const HEADLINE_MAX_LENGTH = 60;
export const TITLE_MAX_LENGTH = 80;
export const BODY_MAX_LENGTH = 240;

/** Filled per recipient; the first three are mandatory. */
export const CERTIFICATE_TOKENS = [
  '{{recipient}}',
  '{{event}}',
  '{{date}}',
  '{{hours}}',
  '{{organization}}',
] as const;

export const REQUIRED_CERTIFICATE_TOKENS = [
  '{{recipient}}',
  '{{event}}',
  '{{date}}',
] as const;

/** Catches half-typed tokens like `{{date}`. */
const TOKEN_LIKE_PATTERN = /\{+[^{}]*\}+/g;

/** Every brace group must be an exact placeholder; none required. Null when fine. */
export function placeholderIssue(text: string): string | null {
  const names = new Set<string>(
    CERTIFICATE_TOKENS.map((token) => token.slice(2, -2)),
  );

  for (const match of text.match(TOKEN_LIKE_PATTERN) ?? []) {
    const name = match.replace(/[{}]/g, '').trim();
    if (!names.has(name)) {
      return `"${match}" is not a placeholder.`;
    }
    if (match !== `{{${name}}}`) {
      return `"${match}" is written wrong — it must read {{${name}}}.`;
    }
  }

  return null;
}

/** Re-checked server-side: the portal isn't the only client. Null when fine. */
export function awardTextIssue(text: string): string | null {
  const malformed = placeholderIssue(text);
  if (malformed) return malformed;

  const missing = REQUIRED_CERTIFICATE_TOKENS.filter(
    (token) => !text.includes(token),
  );
  if (missing.length > 0) {
    return `Award text is missing ${missing.join(', ')}.`;
  }

  return null;
}

export const CERTIFICATE_MAX_IMAGES = 8;
/** Per file, before base64; matches the customizer limit. */
export const CERTIFICATE_IMAGE_MAX_BYTES = 512 * 1024;
export const CERTIFICATE_SVG_MAX_BYTES = 1024 * 1024;

export const CERTIFICATE_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
] as const;

export const CERTIFICATE_SVG_MIMES = ['image/svg+xml'] as const;

/** A `data:` URL or an existing asset route; off-site URLs refused. */
const AssetReferenceSchema = z
  .string()
  .max(2_000_000, 'Imported file is too large to send inline')
  .refine(
    (value) =>
      value.startsWith('data:') ||
      /\/certificate-templates\/[^/]+\/assets\/[^/?#]+/.test(value),
    'An imported file must be uploaded, not linked from another site',
  );

const PositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

/** One entry per block, so no position is missing. */
const LayoutSchema = z.object(
  Object.fromEntries(
    CERTIFICATE_ELEMENTS.map((element) => [element, PositionSchema]),
  ) as Record<(typeof CERTIFICATE_ELEMENTS)[number], typeof PositionSchema>,
);

const ImageSchema = z.object({
  id: z.string().min(1).max(120),
  url: AssetReferenceSchema,
  name: z.string().min(1).max(255),
  x: z.number().min(-50).max(150),
  y: z.number().min(-50).max(150),
  width: z.number().min(1).max(200),
  height: z.number().min(1).max(200),
  shape: z.enum(CERTIFICATE_IMAGE_SHAPES),
  z: z.number().int().min(-100).max(100),
});

const ElementRecord = <T extends z.ZodTypeAny>(value: T) =>
  z.partialRecord(z.enum(CERTIFICATE_ELEMENTS), value);

export const CertificateDesignSchema = z.object({
  accent: z.enum(CERTIFICATE_ACCENTS),
  frame: z.enum(CERTIFICATE_FRAMES),
  frame_svg_url: AssetReferenceSchema.optional(),
  frame_svg_name: z.string().max(255).optional(),
  layout: LayoutSchema,
  font: z.enum(CERTIFICATE_FONTS).default('default'),
  element_fonts: ElementRecord(z.enum(CERTIFICATE_FONTS)).default({}),
  element_sizes: ElementRecord(z.number().min(6).max(120)).default({}),
  element_widths: ElementRecord(z.number().min(5).max(100)).default({}),
  element_heights: ElementRecord(z.number().min(3).max(100)).default({}),
  element_aligns: ElementRecord(z.enum(CERTIFICATE_TEXT_ALIGNS)).default({}),
  element_weights: ElementRecord(z.enum(CERTIFICATE_FONT_WEIGHTS)).default({}),
  element_underlines: ElementRecord(z.boolean()).default({}),
  /** Optional: older designs print the template name. */
  title: z
    .string()
    .trim()
    .min(1)
    .max(TITLE_MAX_LENGTH)
    .superRefine((title, ctx) => {
      const issue = placeholderIssue(title);
      if (issue) ctx.addIssue({ code: 'custom', message: issue });
    })
    .optional(),
  headline: z.string().trim().min(4).max(HEADLINE_MAX_LENGTH),
  body: z
    .string()
    .trim()
    .min(20)
    .max(BODY_MAX_LENGTH)
    .superRefine((body, ctx) => {
      const issue = awardTextIssue(body);
      if (issue) ctx.addIssue({ code: 'custom', message: issue });
    }),
  show_seal: z.boolean(),
  seal_label: z.string().trim().max(24).default(''),
  seal_style: z.enum(CERTIFICATE_SEAL_STYLES).optional(),
  seal_accent: z.enum(CERTIFICATE_ACCENTS).optional(),
  seal_svg_url: AssetReferenceSchema.optional(),
  seal_svg_name: z.string().max(255).optional(),
  images: z.array(ImageSchema).max(CERTIFICATE_MAX_IMAGES).default([]),
});

/** Submitted as an account; name, title and department re-read server-side. */
const SignatorySchema = z.object({
  coordinator_id: z.uuid('Pick a coordinator account'),
});

const TemplateDetailsSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(160),
  category: z.enum(CERTIFICATE_CATEGORIES),
  status: z.enum(CERTIFICATE_STATUSES),
  orientation: z.enum(CERTIFICATE_ORIENTATIONS),
});

export const SaveCertificateTemplateSchema = TemplateDetailsSchema.extend({
  design: CertificateDesignSchema,
  signatories: z.array(SignatorySchema).min(1).max(MAX_SIGNATORIES),
}).strict();

/** Name and category only; the name is also the printed title, so it must be placeholder-safe. */
export const CreateCertificateTemplateSchema = withoutPrototypeKeys(
  z
    .object({
      name: plainLabel(z.string().trim().min(3).max(80), 'Template name'),
      description: z
        .string()
        .trim()
        .min(10)
        .max(160)
        .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), {
          message: 'Description cannot contain control characters',
        }),
      category: z.enum(CERTIFICATE_CATEGORIES),
      orientation: z.enum(CERTIFICATE_ORIENTATIONS).default('landscape'),
    })
    .strict(),
);

export const CertificateTemplateIdParamSchema = z.uuid(
  'A valid template id is required',
);

export const CertificateAssetIdParamSchema = z.uuid(
  'A valid asset id is required',
);

const SignatoryResponseSchema = z.object({
  id: z.string(),
  coordinator_id: z.string(),
  name: z.string(),
  title: z.string(),
  department: z.string(),
  /** Always `{{signature-image}}`; resolved per recipient. */
  signature_token: z.string(),
  /** False until the coordinator uploads a signature. */
  has_signature: z.boolean(),
});

const DesignResponseSchema = CertificateDesignSchema.omit({
  images: true,
}).extend({
  images: z.array(ImageSchema),
});

export const CertificateTemplateResponseSchema = TemplateDetailsSchema.extend({
  id: z.string(),
  reference: z.string(),
  issued: z.number().int(),
  deployed_events: z.number().int(),
  design: DesignResponseSchema,
  signatories: z.array(SignatoryResponseSchema),
  updated_at: z.iso.datetime(),
  updated_by: z.string(),
});

export const CertificateTemplateListResponseSchema = z.array(
  CertificateTemplateResponseSchema,
);

export const SignatoryCoordinatorResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  department: z.string(),
  email: z.string(),
  has_signature: z.boolean(),
});

export const SignatoryCoordinatorListResponseSchema = z.array(
  SignatoryCoordinatorResponseSchema,
);

export const DeleteCertificateTemplateResponseSchema = z.object({
  id: z.string(),
});
