import { Module } from '@nestjs/common';
import { EventAttendanceValidationModule } from './event-attendance-validation-module';
import { EventAttendanceMobileController } from '../controllers/event-attendance-mobile-controller';
import { EventAttendanceMobileService } from '../services/event-attendance-mobile-service';

@Module({
  imports: [EventAttendanceValidationModule],
  controllers: [EventAttendanceMobileController],
  providers: [EventAttendanceMobileService],
  exports: [EventAttendanceMobileService],
})
export class EventAttendanceMobileModule {}
