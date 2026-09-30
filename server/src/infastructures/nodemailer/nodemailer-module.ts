import { Global, Module } from '@nestjs/common';
import { BrevoMailClient } from './brevo-mail-client';
import { NodemailerService } from './nodemailer-service';
import { ResendMailClient } from './resend-mail-client';

@Global()
@Module({
  providers: [NodemailerService, BrevoMailClient, ResendMailClient],
  exports: [NodemailerService],
})
export class NodemailerModule {}
