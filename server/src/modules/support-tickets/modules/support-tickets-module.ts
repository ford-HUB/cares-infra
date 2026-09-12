import { Module } from '@nestjs/common';
import { SupportTicketsMobileModule } from './support-tickets-mobile-module';
import { SupportTicketsSiteModule } from './support-tickets-site-module';

/** Mobile files and follows up on tickets; the portal works the queue. */
@Module({
  imports: [SupportTicketsMobileModule, SupportTicketsSiteModule],
})
export class SupportTicketsModule {}
