import { Injectable } from '@nestjs/common';
import { Transporter, createTransport } from 'nodemailer';

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
  ): Promise<void> {
    const info = await this.nodemailer.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: templateName,
    });

    console.log('Email sent: %s', info.messageId);
  }
}
