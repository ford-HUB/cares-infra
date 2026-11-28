import { Module } from '@nestjs/common';
import { RankingsCoreModule } from '../../rankings/modules/rankings-core-module';
import { EventAttendanceRepository } from '../repositories/event-attendance-repository';
import { EventAttendanceValidationService } from '../services/event-attendance-validation-service';

/** Separate so mobile upload, live monitor and sweep share one instance. */
@Module({
  imports: [RankingsCoreModule],
  providers: [EventAttendanceValidationService, EventAttendanceRepository],
  exports: [EventAttendanceValidationService, EventAttendanceRepository],
})
export class EventAttendanceValidationModule {}
