import { Global, Module } from '@nestjs/common';
import { FrServiceClient } from './fr-service-client';
import { OcrServiceClient } from './ocr-service-client';
import { UcidServiceClient } from './ucid-service-client';

@Global()
@Module({
  providers: [FrServiceClient, OcrServiceClient, UcidServiceClient],
  exports: [FrServiceClient, OcrServiceClient, UcidServiceClient],
})
export class MicroservicesModule {}
