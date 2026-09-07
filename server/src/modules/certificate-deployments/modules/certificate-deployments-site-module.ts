import { Module } from '@nestjs/common';
import { CertificateTemplatesRepository } from '../../certificate-templates/repositories/certificate-templates-repository';
import { EventsRepository } from '../../events/repositories/events-repository';
import { CertificateDeploymentsSiteController } from '../controllers/certificate-deployments-site-controller';
import { CertificateDeploymentsRepository } from '../repositories/certificate-deployments-repository';
import { CertificateDeploymentsSiteService } from '../services/certificate-deployments-site-service';

/**
 * The two foreign repositories are listed here rather than imported through their own
 * modules: they are stateless readers over Prisma, and pulling in the events and
 * templates site modules would drag their controllers along with them.
 */
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
