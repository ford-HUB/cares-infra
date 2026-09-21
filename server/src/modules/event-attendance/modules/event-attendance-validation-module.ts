import { Module } from '@nestjs/common';
import { RankingsCoreModule } from '../../rankings/modules/rankings-core-module';
import { EventAttendanceRepository } from '../repositories/event-attendance-repository';
import { EventAttendanceValidationService } from '../services/event-attendance-validation-service';

/**
 * The post-event ruling, on its own so the mobile upload path, the portal's live
 * monitor and the scheduled sweep all share one instance of it.
 */
@Module({
  imports: [RankingsCoreModule],
  providers: [EventAttendanceValidationService, EventAttendanceRepository],
  exports: [EventAttendanceValidationService, EventAttendanceRepository],
})
export class EventAttendanceValidationModule {}
