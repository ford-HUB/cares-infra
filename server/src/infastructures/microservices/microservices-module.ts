import { Global, Module } from '@nestjs/common';
import { DecisionServiceClient } from './decision-service-client';
import { FrServiceClient } from './fr-service-client';
import { GpsValidatorServiceClient } from './gps-validator-service-client';
import { NlpServiceClient } from './nlp-service-client';
import { OcrServiceClient } from './ocr-service-client';
import { UcidServiceClient } from './ucid-service-client';

@Global()
@Module({
  providers: [
    FrServiceClient,
    OcrServiceClient,
    UcidServiceClient,
    NlpServiceClient,
    GpsValidatorServiceClient,
    DecisionServiceClient,
  ],
  exports: [
    FrServiceClient,
    OcrServiceClient,
    UcidServiceClient,
    NlpServiceClient,
    GpsValidatorServiceClient,
    DecisionServiceClient,
  ],
})
export class MicroservicesModule {}
