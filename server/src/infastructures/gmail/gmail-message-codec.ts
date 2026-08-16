import sanitizeHtml from 'sanitize-html';
import { GmailMessage, GmailMessagePart } from './gmail-api-client';

export interface ParsedMailAddress {
  name: string;
  email: string;
}

export interface ParsedMailAttachment {
  attachment_id: string;
  filename: string;
  mime_type: string;
  size: number;
}

export interface ParsedMailBodies {
  html: string | null;
  text: string;
}

export interface RawMessageInput {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  /** The original `Message-ID`, set when this is a reply. */
  inReplyTo?: string;
}

/**
 * Remote images are dropped along with scripts: an email that phones home the moment an
 * admin opens it is a tracking pixel, and the portal should not fire it automatically.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'span']),
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    span: ['style'],
    div: ['style'],
    p: ['style'],
    td: ['style', 'colspan', 'rowspan'],
    th: ['style', 'colspan', 'rowspan'],
    table: ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
  exclusiveFilter: (frame) => frame.tag === 'img',
};

export function decodeBase64Url(data: string): string {
  return Buffer.from(
    data.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString('utf8');
}

export function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function headerValue(message: GmailMessage, name: string): string {
  const target = name.toLowerCase();
  const header = message.payload?.headers?.find(
    (candidate) => candidate.name.toLowerCase() === target,
  );
  return header?.value ?? '';
}

/** `"Jane Doe" <jane@x.com>` and a bare `jane@x.com` both parse. */
export function parseAddress(value: string): ParsedMailAddress {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  if (match) {
    return { name: stripQuotes(match[1]), email: match[2].trim() };
  }
  const email = value.trim();
  return { name: email, email };
}

/** Splits on commas that sit outside quotes, so `"Doe, Jane" <j@x>` stays one address. */
export function parseAddressList(value: string): string[] {
  if (!value.trim()) return [];

  const addresses: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of value) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === ',' && !inQuotes) {
      if (current.trim()) addresses.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) addresses.push(current.trim());

  return addresses;
}

/**
 * Walks the MIME tree for the best body parts. Gmail nests `multipart/alternative`
 * inside `multipart/mixed` whenever there are attachments, so this cannot just read
 * `payload.body`.
 */
export function extractBodies(message: GmailMessage): ParsedMailBodies {
  const html: string[] = [];
  const text: string[] = [];

  const walk = (part: GmailMessagePart | undefined): void => {
    if (!part) return;

    // A part with a filename is an attachment even when its type is text/*.
    if (!part.filename && part.body?.data) {
      if (part.mimeType === 'text/html')
        html.push(decodeBase64Url(part.body.data));
      else if (part.mimeType === 'text/plain')
        text.push(decodeBase64Url(part.body.data));
    }

    part.parts?.forEach(walk);
  };

  walk(message.payload);

  const rawHtml = html.join('');
  const plain = text.join('\n').trim();

  return {
    html: rawHtml ? sanitizeHtml(rawHtml, SANITIZE_OPTIONS) : null,
    text:
      plain ||
      (rawHtml ? sanitizeHtml(rawHtml, { allowedTags: [] }).trim() : ''),
  };
}

export function extractAttachments(
  message: GmailMessage,
): ParsedMailAttachment[] {
  const attachments: ParsedMailAttachment[] = [];

  const walk = (part: GmailMessagePart | undefined): void => {
    if (!part) return;

    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        attachment_id: part.body.attachmentId,
        filename: part.filename,
        mime_type: part.mimeType ?? 'application/octet-stream',
        size: part.body.size ?? 0,
      });
    }

    part.parts?.forEach(walk);
  };

  walk(message.payload);
  return attachments;
}

/** Builds the base64url RFC 2822 payload the Gmail send endpoint expects. */
export function buildRawMessage(input: RawMessageInput): string {
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to.join(', ')}`,
    ...(input.cc?.length ? [`Cc: ${input.cc.join(', ')}`] : []),
    ...(input.bcc?.length ? [`Bcc: ${input.bcc.join(', ')}`] : []),
    `Subject: ${encodeHeaderValue(input.subject)}`,
    ...(input.inReplyTo
      ? [`In-Reply-To: ${input.inReplyTo}`, `References: ${input.inReplyTo}`]
      : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];

  const body = Buffer.from(input.body, 'utf8').toString('base64');
  return encodeBase64Url(`${headers.join('\r\n')}\r\n\r\n${body}`);
}

/** Headers are ASCII-only, so anything else goes out as RFC 2047 encoded-words. */
function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function stripQuotes(value: string): string {
  return value.replace(/^"(.*)"$/, '$1').trim();
}
