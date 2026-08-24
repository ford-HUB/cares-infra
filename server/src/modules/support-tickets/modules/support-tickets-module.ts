import { Module } from '@nestjs/common';
import { SupportTicketsSiteModule } from './support-tickets-site-module';

/**
 * Site-only for now: tickets are raised from the Flutter app through a channel that
 * does not exist yet, so there is no mobile half to wire up.
 */
@Module({
  imports: [SupportTicketsSiteModule],
})
export class SupportTicketsModule {}
