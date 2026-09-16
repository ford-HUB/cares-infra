import { Module } from '@nestjs/common';
import { AccessControlSiteModule } from './access-control-site-module';

@Module({
  imports: [AccessControlSiteModule],
  // Re-exported so the app-wide PermissionsGuard can resolve effective rights.
  exports: [AccessControlSiteModule],
})
export class AccessControlModule {}
