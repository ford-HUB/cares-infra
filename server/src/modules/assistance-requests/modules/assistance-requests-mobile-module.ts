import { Module } from '@nestjs/common';
import { AssistanceRequestsMobileController } from '../controllers/assistance-requests-mobile-controller';
import { AssistanceRequestsRepository } from '../repositories/assistance-requests-repository';
import { AssistanceRequestsMobileService } from '../services/assistance-requests-mobile-service';

@Module({
  controllers: [AssistanceRequestsMobileController],
  providers: [AssistanceRequestsMobileService, AssistanceRequestsRepository],
})
export class AssistanceRequestsMobileModule {}
