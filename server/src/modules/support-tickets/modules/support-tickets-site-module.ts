import { Module } from '@nestjs/common';
import { SupportTicketsSiteController } from '../controllers/support-tickets-site-controller';
import { SupportTicketsRepository } from '../repositories/support-tickets-repository';
import { SupportTicketsSiteService } from '../services/support-tickets-site-service';

@Module({
  controllers: [SupportTicketsSiteController],
  providers: [SupportTicketsSiteService, SupportTicketsRepository],
  exports: [SupportTicketsSiteService, SupportTicketsRepository],
})
export class SupportTicketsSiteModule {}
