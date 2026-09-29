import { Module } from '@nestjs/common';
import { CertificateDeploymentsSiteModule } from './certificate-deployments-site-module';

@Module({
  imports: [CertificateDeploymentsSiteModule],
  exports: [CertificateDeploymentsSiteModule],
})
export class CertificateDeploymentsModule {}
