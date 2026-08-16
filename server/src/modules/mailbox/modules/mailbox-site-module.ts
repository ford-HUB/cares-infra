import { Module } from '@nestjs/common';
import { GmailModule } from '../../../infastructures/gmail/gmail-module';
import { PassportModule } from '../../../infastructures/passport/passport-module';
import { MailboxSiteController } from '../controllers/mailbox-site-controller';
import { MailboxRepository } from '../repositories/mailbox-repository';
import { MailboxSiteService } from '../services/mailbox-site-service';

@Module({
  imports: [PassportModule, GmailModule],
  controllers: [MailboxSiteController],
  providers: [MailboxSiteService, MailboxRepository],
  exports: [MailboxSiteService],
})
export class MailboxSiteModule {}
