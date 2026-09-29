import { Module } from '@nestjs/common';
import { EventAttendanceValidationModule } from './event-attendance-validation-module';
import { EventAttendanceSiteController } from '../controllers/event-attendance-site-controller';
import { EventAttendanceSiteService } from '../services/event-attendance-site-service';

@Module({
  imports: [EventAttendanceValidationModule],
  controllers: [EventAttendanceSiteController],
  providers: [EventAttendanceSiteService],
  exports: [EventAttendanceSiteService],
})
export class EventAttendanceSiteModule {}
