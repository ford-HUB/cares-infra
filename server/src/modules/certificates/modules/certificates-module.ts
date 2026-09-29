import { Module } from '@nestjs/common';
import { CertificatesMobileModule } from './certificates-mobile-module';
import { CertificatesSiteModule } from './certificates-site-module';

@Module({
  imports: [CertificatesMobileModule, CertificatesSiteModule],
})
export class CertificatesModule {}
