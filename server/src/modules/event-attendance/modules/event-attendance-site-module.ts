import { Module } from '@nestjs/common';
import { EventAttendanceSiteController } from '../controllers/event-attendance-site-controller';
import { EventAttendanceRepository } from '../repositories/event-attendance-repository';
import { EventAttendanceSiteService } from '../services/event-attendance-site-service';

@Module({
  controllers: [EventAttendanceSiteController],
  providers: [EventAttendanceSiteService, EventAttendanceRepository],
  exports: [EventAttendanceSiteService],
})
export class EventAttendanceSiteModule {}
