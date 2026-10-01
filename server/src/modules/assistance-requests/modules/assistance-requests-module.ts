import { Module } from '@nestjs/common';
import { AssistanceRequestsMobileModule } from './assistance-requests-mobile-module';

/** Beneficiaries file and track assistance from the app; no portal side yet. */
@Module({ imports: [AssistanceRequestsMobileModule] })
export class AssistanceRequestsModule {}
