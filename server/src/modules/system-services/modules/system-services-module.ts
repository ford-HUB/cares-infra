import { Module } from '@nestjs/common';
import { SystemServicesSiteModule } from './system-services-site-module';

@Module({
  imports: [SystemServicesSiteModule],
})
export class SystemServicesModule {}
