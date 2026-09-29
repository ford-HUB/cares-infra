import { Injectable } from '@nestjs/common';
import { Transporter, createTransport } from 'nodemailer';
import { isProduction } from '../../shared/utils/environment-utils';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  /** Where a human reply should land — the sender is always the configured mail account. */
  replyTo?: string;
  attachments?: MailAttachment[];
}

@Injectable()
export class NodemailerService {
  private readonly nodemailer: Transporter;
  private readonly sender: string | undefined;
  constructor() {
    // Production sends through Resend's SMTP relay; development keeps the Gmail account.
    this.nodemailer = isProduction()
      ? createTransport({
          host: 'smtp.resend.com',
          port: 465,
          secure: true,
          auth: {
            user: 'resend',
            pass: process.env.SMTP_RESEND_APIKEY,
          },
        })
      : createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });

    this.sender = isProduction()
      ? process.env.SMTP_RESEND_AUTHOR_ORIGIN
      : process.env.SMTP_USER;
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    options?: SendEmailOptions,
  ): Promise<void> {
    const info = await this.nodemailer.sendMail({
      from: this.sender,
      to,
      subject,
      html: templateName,
      replyTo: options?.replyTo,
      attachments: options?.attachments,
    });

    console.log('Email sent: %s', info.messageId);
  }
}
