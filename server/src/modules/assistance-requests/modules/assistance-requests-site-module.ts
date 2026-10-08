import { Module } from '@nestjs/common';
import { AssistanceRequestsSiteController } from '../controllers/assistance-requests-site-controller';
import { AssistanceRequestsRepository } from '../repositories/assistance-requests-repository';
import { AssistanceRequestsSiteService } from '../services/assistance-requests-site-service';

/** Director-side review. `NotificationScheduler` comes from the global schedulers module. */
@Module({
  controllers: [AssistanceRequestsSiteController],
  providers: [AssistanceRequestsSiteService, AssistanceRequestsRepository],
})
export class AssistanceRequestsSiteModule {}
