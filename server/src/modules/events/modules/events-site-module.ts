import { Module } from '@nestjs/common';
import { EventsSiteController } from '../controllers/events-site-controller';
import { EventsRepository } from '../repositories/events-repository';
import { EventsSiteService } from '../services/events-site-service';

@Module({
  controllers: [EventsSiteController],
  providers: [EventsSiteService, EventsRepository],
  exports: [EventsSiteService],
})
export class EventsSiteModule {}
