import { Injectable } from '@nestjs/common';
import { isProduction } from '../../shared/utils/environment-utils';
import { BrevoMailClient } from './brevo-mail-client';
import type { SendEmailOptions } from './mail-types';
import { ResendMailClient } from './resend-mail-client';

@Injectable()
export class NodemailerService {
  constructor(
    private readonly brevoMailClient: BrevoMailClient,
    private readonly resendMailClient: ResendMailClient,
  ) {}

  /** Production sends through Resend; development keeps Brevo. */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: SendEmailOptions,
  ): Promise<void> {
    if (isProduction()) {
      await this.resendMailClient.send(to, subject, html, options);
      return;
    }

    await this.brevoMailClient.send(
      process.env.SMTP_FROM_AUTHOR,
      to,
      subject,
      html,
      options,
    );
  }
}
