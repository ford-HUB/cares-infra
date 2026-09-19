import { Module } from '@nestjs/common';
import { EventAttendanceMobileController } from '../controllers/event-attendance-mobile-controller';
import { EventAttendanceRepository } from '../repositories/event-attendance-repository';
import { EventAttendanceMobileService } from '../services/event-attendance-mobile-service';

@Module({
  controllers: [EventAttendanceMobileController],
  providers: [EventAttendanceMobileService, EventAttendanceRepository],
  exports: [EventAttendanceMobileService],
})
export class EventAttendanceMobileModule {}
