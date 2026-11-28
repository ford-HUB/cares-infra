import { Module } from '@nestjs/common';
import { CertificateTemplatesRepository } from '../../certificate-templates/repositories/certificate-templates-repository';
import { CertificatesMobileController } from '../controllers/certificates-mobile-controller';
import { CertificatesMobileService } from '../services/certificates-mobile-service';
import { CertificatesCoreModule } from './certificates-core-module';

/** Templates repository listed directly: stateless, only used to find artwork. */
@Module({
  imports: [CertificatesCoreModule],
  controllers: [CertificatesMobileController],
  providers: [CertificatesMobileService, CertificateTemplatesRepository],
  exports: [CertificatesMobileService],
})
export class CertificatesMobileModule {}
