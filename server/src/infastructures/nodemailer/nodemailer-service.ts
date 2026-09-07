import { Injectable } from '@nestjs/common';
import { Transporter, createTransport } from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  /** Where a human reply should land — the sender is always the SMTP account. */
  replyTo?: string;
  attachments?: MailAttachment[];
}

@Injectable()
export class NodemailerService {
  private readonly nodemailer: Transporter;
  constructor() {
    this.nodemailer = createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    options?: SendEmailOptions,
  ): Promise<void> {
    const info = await this.nodemailer.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: templateName,
      replyTo: options?.replyTo,
      attachments: options?.attachments,
    });

    console.log('Email sent: %s', info.messageId);
  }
}
