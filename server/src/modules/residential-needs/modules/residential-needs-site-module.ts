import { Module } from '@nestjs/common';
import { ResidentialNeedsSiteController } from '../controllers/residential-needs-site-controller';
import { ResidentialNeedsRepository } from '../repositories/residential-needs-repository';
import { ResidentialNeedsSiteService } from '../services/residential-needs-site-service';

@Module({
  controllers: [ResidentialNeedsSiteController],
  providers: [ResidentialNeedsSiteService, ResidentialNeedsRepository],
})
export class ResidentialNeedsSiteModule {}
