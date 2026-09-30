import { Injectable } from '@nestjs/common';
import type { SendEmailOptions } from './mail-types';

/** Brevo's transactional HTTPS endpoint. Railway blocks outbound SMTP ports, so production cannot use the relay. */
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_TIMEOUT_MS = 15_000;

/** Splits `Name <address>` into Brevo's sender object; a bare address has no name. */
function toBrevoSender(from: string | undefined): {
  email: string;
  name?: string;
} {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from ?? '');
  if (!match) return { email: (from ?? '').trim() };
  const name = match[1].replace(/^"|"$/g, '');
  return name ? { email: match[2].trim(), name } : { email: match[2].trim() };
}

@Injectable()
export class BrevoMailClient {
  async send(
    from: string | undefined,
    to: string,
    subject: string,
    html: string,
    options?: SendEmailOptions,
  ): Promise<void> {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.SMTP_BREVO_APIKEY ?? '',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: toBrevoSender(from),
        to: [{ email: to }],
        subject,
        htmlContent: html,
        replyTo: options?.replyTo ? { email: options.replyTo } : undefined,
        // Brevo rejects an empty attachment array, so omit it when there is nothing to attach.
        attachment: options?.attachments?.length
          ? options.attachments.map((attachment) => ({
              name: attachment.filename,
              content: attachment.content.toString('base64'),
            }))
          : undefined,
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Brevo rejected the email (${response.status}): ${await response.text()}`,
      );
    }

    const result = (await response.json()) as { messageId?: string };
    console.log('Email sent: %s', result.messageId);
  }
}
