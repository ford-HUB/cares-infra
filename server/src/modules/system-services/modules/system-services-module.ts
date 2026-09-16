import { Module } from '@nestjs/common';
import { SystemServicesSiteModule } from './system-services-site-module';

/** Site-only: the scheduler control board lives on the admin portal. */
@Module({
  imports: [SystemServicesSiteModule],
})
export class SystemServicesModule {}
