import { Module } from '@nestjs/common';
import { AccessControlSiteModule } from './access-control-site-module';

@Module({
  imports: [AccessControlSiteModule],
})
export class AccessControlModule {}
