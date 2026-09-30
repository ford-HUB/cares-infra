import { Module } from '@nestjs/common';
import { ResidentialNeedsMobileController } from '../controllers/residential-needs-mobile-controller';
import { ResidentialNeedsRepository } from '../repositories/residential-needs-repository';
import { ResidentialNeedsMobileService } from '../services/residential-needs-mobile-service';

@Module({
  controllers: [ResidentialNeedsMobileController],
  providers: [ResidentialNeedsMobileService, ResidentialNeedsRepository],
})
export class ResidentialNeedsMobileModule {}
