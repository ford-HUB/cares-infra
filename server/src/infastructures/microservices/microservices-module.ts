import { Global, Module } from '@nestjs/common';
import { FrServiceClient } from './fr-service-client';
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
  ],
  exports: [
    FrServiceClient,
    OcrServiceClient,
    UcidServiceClient,
    NlpServiceClient,
  ],
})
export class MicroservicesModule {}
