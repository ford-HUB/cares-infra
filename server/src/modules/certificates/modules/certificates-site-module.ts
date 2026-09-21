import { Module } from '@nestjs/common';
import { CertificatesSiteController } from '../controllers/certificates-site-controller';
import { CertificatesSiteService } from '../services/certificates-site-service';
import { CertificatesCoreModule } from './certificates-core-module';

@Module({
  imports: [CertificatesCoreModule],
  controllers: [CertificatesSiteController],
  providers: [CertificatesSiteService],
  exports: [CertificatesSiteService],
})
export class CertificatesSiteModule {}
