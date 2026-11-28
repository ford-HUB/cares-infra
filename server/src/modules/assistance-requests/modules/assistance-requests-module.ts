import { Module } from '@nestjs/common';
import { AssistanceRequestsMobileModule } from './assistance-requests-mobile-module';
import { AssistanceRequestsSiteModule } from './assistance-requests-site-module';

@Module({
  imports: [AssistanceRequestsMobileModule, AssistanceRequestsSiteModule],
})
export class AssistanceRequestsModule {}
