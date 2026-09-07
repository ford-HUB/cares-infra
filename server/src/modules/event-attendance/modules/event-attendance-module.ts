import { Module } from '@nestjs/common';
import { EventAttendanceSiteModule } from './event-attendance-site-module';

@Module({
  imports: [EventAttendanceSiteModule],
})
export class EventAttendanceModule {}
