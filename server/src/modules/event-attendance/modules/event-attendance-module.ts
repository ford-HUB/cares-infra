import { Module } from '@nestjs/common';
import { EventAttendanceMobileModule } from './event-attendance-mobile-module';
import { EventAttendanceSiteModule } from './event-attendance-site-module';

@Module({
  imports: [EventAttendanceMobileModule, EventAttendanceSiteModule],
})
export class EventAttendanceModule {}
