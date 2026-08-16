import { Module } from '@nestjs/common';
import { MailboxSiteModule } from './mailbox-site-module';

@Module({
  imports: [MailboxSiteModule],
})
export class MailboxModule {}
