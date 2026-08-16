import { Module } from '@nestjs/common';
import { GmailApiClient } from './gmail-api-client';

@Module({
  providers: [GmailApiClient],
  exports: [GmailApiClient],
})
export class GmailModule {}
