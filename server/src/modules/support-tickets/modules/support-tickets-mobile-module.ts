import { Module } from '@nestjs/common';
import { SupportTicketsMobileController } from '../controllers/support-tickets-mobile-controller';
import { SupportTicketsRepository } from '../repositories/support-tickets-repository';
import { SupportTicketsMobileService } from '../services/support-tickets-mobile-service';

@Module({
  controllers: [SupportTicketsMobileController],
  providers: [SupportTicketsMobileService, SupportTicketsRepository],
  exports: [SupportTicketsMobileService],
})
export class SupportTicketsMobileModule {}
