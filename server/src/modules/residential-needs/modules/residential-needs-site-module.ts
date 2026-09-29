import { Module } from '@nestjs/common';
import { ResidentialNeedsSiteController } from '../controllers/residential-needs-site-controller';
import { ResidentialNeedsSiteService } from '../services/residential-needs-site-service';

@Module({
  controllers: [ResidentialNeedsSiteController],
  providers: [ResidentialNeedsSiteService],
})
export class ResidentialNeedsSiteModule {}
