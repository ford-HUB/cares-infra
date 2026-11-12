import { z } from 'zod';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';

export const MAILBOX_DEFAULT_PAGE_SIZE = 25;
export const MAILBOX_MAX_PAGE_SIZE = 50;

/** The folders the portal exposes; each maps to a Gmail system label. */
export const MailboxFolderSchema = z.enum([
  'inbox',
  'starred',
  'sent',
  'drafts',
  'spam',
  'trash',
]);

export const ListMailQuerySchema = z
  .object({
    folder: MailboxFolderSchema.default('inbox'),
    /** Passed straight to Gmail search, so the admin gets the same syntax as Gmail. */
    search: z.string().trim().max(200).optional(),
    page_token: z.string().trim().max(500).optional(),
    page_size: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAILBOX_MAX_PAGE_SIZE)
      .default(MAILBOX_DEFAULT_PAGE_SIZE),
  })
  .strict();

const EmailAddressSchema = z.email('A valid email address is required');

const LINE_BREAK_PATTERN = /[\r\n]/;

/** Gmail thread ids are hexadecimal strings. */
const GMAIL_THREAD_ID_PATTERN = /^[0-9a-f]+$/i;

/**
 * `<id@domain>` in printable ASCII, without spaces or nested angle brackets.
 * The value is written raw into the In-Reply-To and References headers.
 */
const MESSAGE_ID_PATTERN = /^<[!-;=?-~]+@[!-;=?-~]+>$/;

export const SendMailSchema = withoutPrototypeKeys(
  z
    .object({
      to: z
        .array(EmailAddressSchema)
        .min(1, 'At least one recipient is required')
        .max(50),
      cc: z.array(EmailAddressSchema).max(50).optional(),
      bcc: z.array(EmailAddressSchema).max(50).optional(),
      /** Written into the Subject header, so it must stay on one line. */
      subject: z
        .string()
        .trim()
        .max(500)
        .refine(
          (value) =>
            !LINE_BREAK_PATTERN.test(value) &&
            !CONTROL_CHARACTER_PATTERN.test(value),
          {
            message: 'Subject cannot contain line breaks or control characters',
          },
        )
        .default(''),
      body: z.string().max(100_000).default(''),
      /** Set when replying — keeps the message inside the original Gmail thread. */
      thread_id: z
        .string()
        .trim()
        .max(200)
        .regex(GMAIL_THREAD_ID_PATTERN, 'A valid thread id is required')
        .optional(),
      /** The original message's `Message-ID` header, so mail clients thread the reply. */
      in_reply_to: z
        .string()
        .trim()
        .max(500)
        .regex(MESSAGE_ID_PATTERN, 'A valid Message-ID is required')
        .optional(),
    })
    .strict(),
);

export const MarkMailReadSchema = z
  .object({
    unread: z.boolean(),
  })
  .strict();

export const MailboxConnectionResponseSchema = z.object({
  connected: z.boolean(),
  email: z.string().nullable(),
  connected_at: z.string().nullable(),
});

export const MailboxAuthorizeResponseSchema = z.object({
  authorize_url: z.string(),
});

export const MailAttachmentSchema = z.object({
  attachment_id: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  size: z.number(),
});

export const MailSummarySchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  from_name: z.string(),
  from_email: z.string(),
  to: z.array(z.string()),
  subject: z.string(),
  snippet: z.string(),
  /** ISO-8601; the portal formats it for display. */
  received_at: z.string(),
  unread: z.boolean(),
  starred: z.boolean(),
  has_attachments: z.boolean(),
});

export const MailListResponseSchema = z.object({
  messages: z.array(MailSummarySchema),
  next_page_token: z.string().nullable(),
  estimated_total: z.number(),
});

export const MailDetailSchema = MailSummarySchema.extend({
  cc: z.array(z.string()),
  /** Sanitised HTML when Gmail carries an HTML part, otherwise null. */
  body_html: z.string().nullable(),
  body_text: z.string(),
  /** RFC `Message-ID`, needed to thread a reply correctly. */
  message_id_header: z.string().nullable(),
  attachments: z.array(MailAttachmentSchema),
});

export const SendMailResponseSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
});

export const MailboxDisconnectResponseSchema = z.object({
  disconnected: z.boolean(),
});
