import { Module } from '@nestjs/common';
import { CertificatesRepository } from '../repositories/certificates-repository';
import { CertificateIssuanceService } from '../services/certificate-issuance-service';

/** Separate so the scheduled sweep needs no client-facing modules. */
@Module({
  providers: [CertificateIssuanceService, CertificatesRepository],
  exports: [CertificateIssuanceService, CertificatesRepository],
})
export class CertificatesCoreModule {}
