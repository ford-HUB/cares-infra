import { Module } from '@nestjs/common';
import { CertificateTemplatesSiteModule } from './certificate-templates-site-module';

@Module({
  imports: [CertificateTemplatesSiteModule],
  exports: [CertificateTemplatesSiteModule],
})
export class CertificateTemplatesModule {}
