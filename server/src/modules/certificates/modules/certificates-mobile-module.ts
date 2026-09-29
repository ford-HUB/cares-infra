import { Module } from '@nestjs/common';
import { CertificateTemplatesRepository } from '../../certificate-templates/repositories/certificate-templates-repository';
import { CertificatesMobileController } from '../controllers/certificates-mobile-controller';
import { CertificatesMobileService } from '../services/certificates-mobile-service';
import { CertificatesCoreModule } from './certificates-core-module';

/**
 * The templates repository is listed directly, as the deployments module does: it is
 * a stateless reader, and it is only here to find the artwork a sheet points at.
 */
@Module({
  imports: [CertificatesCoreModule],
  controllers: [CertificatesMobileController],
  providers: [CertificatesMobileService, CertificateTemplatesRepository],
  exports: [CertificatesMobileService],
})
export class CertificatesMobileModule {}
