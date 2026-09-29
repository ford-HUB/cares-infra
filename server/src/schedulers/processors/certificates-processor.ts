import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CertificateIssuanceService } from '../../modules/certificates/services/certificate-issuance-service';
import { CERTIFICATES_JOBS } from '../jobs/certificates-scheduler';
import { SCHEDULER_QUEUES, SchedulerRunRecorder } from '../scheduler-registry';
import { CatalogedProcessor } from './base-processor';

/** Cuts certificates for every finished event with a deployment still going out. */
@Processor(SCHEDULER_QUEUES.certificates)
export class CertificatesProcessor extends CatalogedProcessor {
  protected readonly logger = new Logger(CertificatesProcessor.name);

  constructor(
    protected readonly recorder: SchedulerRunRecorder,
    private readonly issuance: CertificateIssuanceService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== CERTIFICATES_JOBS.issueEventCertificates) {
      this.logger.warn(`unknown certificates job "${job.name}" ignored`);
      return;
    }

    await this.withRuntimeCap(job, async () => {
      const summaries = await this.issuance.sweep();
      if (summaries.length === 0) {
        await this.note(
          job,
          'No finished events with certificates to hand out',
        );
        return;
      }
      for (const one of summaries) {
        await this.note(
          job,
          `${one.reference} · ${one.eventName}: ${one.issued} newly issued, ${one.distributed}/${one.participants} distributed${one.completed ? ' — deployment completed' : ''}`,
        );
      }
    });
  }
}
