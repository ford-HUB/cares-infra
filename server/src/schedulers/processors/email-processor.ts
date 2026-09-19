import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { NodemailerService } from '../../infastructures/nodemailer/nodemailer-service';
import { TemplateUtils } from '../../shared/utils/templete-utils';
import { EMAIL_JOBS, type SendEmailJobData } from '../jobs/email-scheduler';
import { SCHEDULER_QUEUES, SchedulerRunRecorder } from '../scheduler-registry';
import { SchedulerRepository } from '../scheduler-repository';
import { CatalogedProcessor } from './base-processor';

/** The digest covers notices that arrived since the previous morning's run. */
const DIGEST_WINDOW_HOURS = 24;

/** How many titles the digest lists before "and N more". */
const DIGEST_PREVIEW_COUNT = 5;

const DEFAULT_SUPPORT_EMAIL = 'careeesadmin@gmail.com';
const DEFAULT_PORTAL_URL = 'http://localhost:5173';

/**
 * Sends queued mail and compiles the morning digest. A `send` that fails is retried
 * by BullMQ with backoff — SMTP hiccups are the norm, not the exception — and only
 * lands in the failed set once the attempts are spent.
 */
@Processor(SCHEDULER_QUEUES.email)
export class EmailProcessor extends CatalogedProcessor {
  protected readonly logger = new Logger(EmailProcessor.name);

  constructor(
    protected readonly recorder: SchedulerRunRecorder,
    @InjectQueue(SCHEDULER_QUEUES.email)
    private readonly queue: Queue,
    private readonly nodemailerService: NodemailerService,
    private readonly schedulerRepository: SchedulerRepository,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case EMAIL_JOBS.send:
        await this.send(job.data as SendEmailJobData);
        return;
      case EMAIL_JOBS.unreadDigest:
        await this.withRuntimeCap(job, () => this.sendUnreadDigests(job));
        return;
      default:
        this.logger.warn(`unknown email job "${job.name}" ignored`);
    }
  }

  private async send(mail: SendEmailJobData): Promise<void> {
    const html = await TemplateUtils.compileTemplate(mail.template, mail.data);
    await this.nodemailerService.sendEmail(mail.to, mail.subject, html, {
      replyTo: mail.replyTo,
    });
  }

  /**
   * One mail per person with unread attention/urgent notices. Each is enqueued as
   * its own `send` job rather than sent inline, so one bad address cannot fail the
   * whole digest and the sweep itself finishes quickly.
   */
  private async sendUnreadDigests(job: Job): Promise<void> {
    const since = new Date(Date.now() - DIGEST_WINDOW_HOURS * 60 * 60 * 1000);
    const digests = await this.schedulerRepository.findUnreadDigests(since);
    await this.note(
      job,
      `${digests.length} user(s) have unread notices to chase`,
    );

    const supportEmail =
      this.configService.get<string>('ACCESS_REQUEST_EMAIL')?.trim() ||
      DEFAULT_SUPPORT_EMAIL;
    const portalUrl =
      this.configService.get<string>('SITE_URL')?.trim() || DEFAULT_PORTAL_URL;

    for (const digest of digests) {
      const urgent = digest.notifications.filter(
        (one) => one.tone === 'CRITICAL',
      ).length;
      const preview = digest.notifications.slice(0, DIGEST_PREVIEW_COUNT);

      const mail: SendEmailJobData = {
        to: digest.email,
        subject: `${digest.notifications.length} CARES notification${
          digest.notifications.length === 1 ? '' : 's'
        } waiting for you`,
        template: 'notification-digest.html',
        data: {
          username: digest.firstname || digest.email,
          total: digest.notifications.length,
          plural: digest.notifications.length !== 1,
          urgent,
          preview: preview.map((one) => ({
            title: one.title,
            urgent: one.tone === 'CRITICAL',
          })),
          more: Math.max(0, digest.notifications.length - preview.length),
          portalUrl: `${portalUrl}/admin/notifications`,
          supportEmail,
        },
        replyTo: supportEmail,
      };

      await this.queue.add(EMAIL_JOBS.send, mail, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60 * 1000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      });
    }
    await this.note(job, `${digests.length} digest(s) queued`);
  }
}
