import { Module } from '@nestjs/common';
import { CertificateTemplatesRepository } from '../../certificate-templates/repositories/certificate-templates-repository';
import { EventsRepository } from '../../events/repositories/events-repository';
import { CertificateDeploymentsSiteController } from '../controllers/certificate-deployments-site-controller';
import { CertificateDeploymentsRepository } from '../repositories/certificate-deployments-repository';
import { CertificateDeploymentsSiteService } from '../services/certificate-deployments-site-service';

/** Foreign repositories listed directly to avoid pulling in their modules' controllers. */
@Module({
  controllers: [CertificateDeploymentsSiteController],
  providers: [
    CertificateDeploymentsSiteService,
    CertificateDeploymentsRepository,
    CertificateTemplatesRepository,
    EventsRepository,
  ],
  exports: [CertificateDeploymentsSiteService],
})
export class CertificateDeploymentsSiteModule {}
