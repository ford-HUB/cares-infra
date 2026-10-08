import { Module } from '@nestjs/common';
import { AssistanceRequestsMobileModule } from './assistance-requests-mobile-module';
import { AssistanceRequestsSiteModule } from './assistance-requests-site-module';

/** Beneficiaries file and track assistance from the app; directors review it in the portal. */
@Module({
  imports: [AssistanceRequestsMobileModule, AssistanceRequestsSiteModule],
})
export class AssistanceRequestsModule {}
