import { Module } from '@nestjs/common';
import { CertificatesRepository } from '../repositories/certificates-repository';
import { CertificateIssuanceService } from '../services/certificate-issuance-service';

/**
 * The generator and its repository, on their own so the scheduled sweep can run it
 * without pulling either client-facing module in. `NotificationScheduler` and the
 * audit recorder come from their global modules.
 */
@Module({
  providers: [CertificateIssuanceService, CertificatesRepository],
  exports: [CertificateIssuanceService, CertificatesRepository],
})
export class CertificatesCoreModule {}
