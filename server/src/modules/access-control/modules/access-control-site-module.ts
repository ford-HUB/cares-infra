import { Module } from '@nestjs/common';
import { AccessControlSiteController } from '../controllers/access-control-site-controller';
import { AccessControlRepository } from '../repositories/access-control-repository';
import { AccessControlSiteService } from '../services/access-control-site-service';

@Module({
  controllers: [AccessControlSiteController],
  providers: [AccessControlSiteService, AccessControlRepository],
  exports: [AccessControlSiteService, AccessControlRepository],
})
export class AccessControlSiteModule {}
