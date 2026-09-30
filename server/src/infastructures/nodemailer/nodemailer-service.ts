import { Injectable } from '@nestjs/common';
import { Transporter, createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { isProduction } from '../../shared/utils/environment-utils';
import { BrevoMailClient } from './brevo-mail-client';
import type { SendEmailOptions } from './mail-types';

@Injectable()
export class NodemailerService {
  /** Development only: the Gmail account over SMTP. */
  private readonly nodemailer: Transporter<SMTPTransport.SentMessageInfo> | null;
  private readonly sender: string | undefined;
  constructor(private readonly brevoMailClient: BrevoMailClient) {
    // Production sends through Brevo's HTTP API; development keeps the Gmail account.
    this.nodemailer = isProduction()
      ? null
      : createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });

    this.sender = isProduction()
      ? process.env.SMTP_FROM_AUTHOR
      : process.env.SMTP_USER;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: SendEmailOptions,
  ): Promise<void> {
    if (!this.nodemailer) {
      await this.brevoMailClient.send(this.sender, to, subject, html, options);
      return;
    }

    const info = await this.nodemailer.sendMail({
      from: this.sender,
      to,
      subject,
      html,
      replyTo: options?.replyTo,
      attachments: options?.attachments,
    });

    console.log('Email sent: %s', info.messageId);
  }
}
