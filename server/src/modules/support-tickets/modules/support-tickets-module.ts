import { Module } from '@nestjs/common';
import { SupportTicketsMobileModule } from './support-tickets-mobile-module';
import { SupportTicketsSiteModule } from './support-tickets-site-module';

@Module({
  imports: [SupportTicketsMobileModule, SupportTicketsSiteModule],
})
export class SupportTicketsModule {}
