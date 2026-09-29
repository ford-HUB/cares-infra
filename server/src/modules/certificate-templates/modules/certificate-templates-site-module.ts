import { Module } from '@nestjs/common';
import { CertificateTemplatesSiteController } from '../controllers/certificate-templates-site-controller';
import { CertificateTemplatesRepository } from '../repositories/certificate-templates-repository';
import { CertificateTemplatesSiteService } from '../services/certificate-templates-site-service';

@Module({
  controllers: [CertificateTemplatesSiteController],
  providers: [CertificateTemplatesSiteService, CertificateTemplatesRepository],
  exports: [CertificateTemplatesSiteService],
})
export class CertificateTemplatesSiteModule {}
