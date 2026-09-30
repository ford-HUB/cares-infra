import { Injectable } from '@nestjs/common';
import type { SendEmailOptions } from './mail-types';

/** Resend's HTTPS endpoint. No longer the production sender — kept so it can be switched back. */
const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 15_000;

/** Unused while production sends through Brevo; inject this into NodemailerService to switch back. */
@Injectable()
export class ResendMailClient {
  async send(
    to: string,
    subject: string,
    html: string,
    options?: SendEmailOptions,
  ): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SMTP_RESEND_APIKEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.SMTP_RESEND_AUTHOR_ORIGIN,
        to,
        subject,
        html,
        reply_to: options?.replyTo,
        attachments: options?.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content.toString('base64'),
          content_type: attachment.contentType,
        })),
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Resend rejected the email (${response.status}): ${await response.text()}`,
      );
    }

    const result = (await response.json()) as { id?: string };
    console.log('Email sent: %s', result.id);
  }
}
