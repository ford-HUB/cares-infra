import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { NotificationGateway } from '../../gateways/notification.gateway';
import {
  NotificationCategory,
  NotificationTone,
  ReportDepartment,
  RoleType,
} from '../../infastructures/prisma/common/client';
import type { PublishNotificationInput } from '../../modules/notifications/dto/notifications-site-dto';
import { NotificationsRepository } from '../../modules/notifications/repositories/notifications-repository';
import { toNotificationDto } from '../../modules/notifications/services/notifications-site-service';
import { NOTIFICATION_JOBS } from '../jobs/notification.scheduler';
import { SCHEDULER_QUEUES, SchedulerRunRecorder } from '../scheduler.registry';
import { SchedulerRepository } from '../scheduler.repository';
import { CatalogedProcessor } from './base.processor';

/** How far ahead the event sweep looks; matches "starts in 2 hours" on the row. */
const EVENT_LOOKAHEAD_HOURS = 2;

/** Days before month-end on which a missing report is chased. */
const REPORT_REMINDER_DAYS_LEFT = new Set([5, 3, 1]);

/** A credential lapsing inside this window is flagged. */
const CREDENTIAL_LOOKAHEAD_HOURS = 24;

const DEPARTMENT_LABELS: Record<ReportDepartment, string> = {
  CCS: 'College of Computer Studies',
  CBA: 'College of Business Administration',
  CEA: 'College of Engineering & Architecture',
  CNAHS: 'College of Nursing & Allied Health Sciences',
  CAS: 'College of Arts & Sciences',
  CCJE: 'College of Criminal Justice Education',
};

/**
 * Turns a `publish` request into one row per recipient and pushes each over the
 * socket, and runs the scheduled sweeps that decide what to publish on their own.
 * Sweeps are idempotent through the dedupe key: running one twice writes nothing new.
 */
@Processor(SCHEDULER_QUEUES.notification)
export class NotificationProcessor extends CatalogedProcessor {
  protected readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    protected readonly recorder: SchedulerRunRecorder,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly schedulerRepository: SchedulerRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case NOTIFICATION_JOBS.publish:
        await this.publish(job.data as PublishNotificationInput);
        return;
      case NOTIFICATION_JOBS.eventStartReminders:
        await this.withRuntimeCap(job, () => this.remindEventStarts(job));
        return;
      case NOTIFICATION_JOBS.reportDeadlineReminders:
        await this.withRuntimeCap(job, () => this.remindReportDeadlines(job));
        return;
      case NOTIFICATION_JOBS.credentialExpiryAlerts:
        await this.withRuntimeCap(job, () => this.alertCredentialExpiry(job));
        return;
      default:
        this.logger.warn(`unknown notification job "${job.name}" ignored`);
    }
  }

  // ------------------------------------------------------------------- publish

  /** Resolves the audience to people, writes their rows, and pushes each one live. */
  private async publish(input: PublishNotificationInput): Promise<number> {
    const byRole = await this.notificationsRepository.findRecipientIdsByRoles(
      input.roles ?? [],
    );
    const recipients = new Set([...byRole, ...(input.userIds ?? [])]);
    if (recipients.size === 0) return 0;

    const rows = await this.notificationsRepository.createMany(
      [...recipients].map((userId) => ({
        userId,
        title: input.title,
        description: input.description,
        category: input.category,
        tone: input.tone ?? NotificationTone.INFO,
        href: input.href ?? null,
        dedupeKey: input.dedupeKey ?? null,
      })),
    );

    for (const row of rows) {
      this.notificationGateway.emitNew(row.user_id, toNotificationDto(row));
    }
    return rows.length;
  }

  // -------------------------------------------------------------------- sweeps

  private async remindEventStarts(job: Job): Promise<void> {
    const now = new Date();
    const horizon = addHours(now, EVENT_LOOKAHEAD_HOURS);
    const events = await this.schedulerRepository.findEventsStartingBetween(
      now,
      horizon,
    );
    await this.note(
      job,
      `${events.length} event(s) start within ${EVENT_LOOKAHEAD_HOURS}h`,
    );

    let written = 0;
    for (const event of events) {
      const coordinators =
        await this.schedulerRepository.findCoordinatorIdsForDepartment(
          event.department,
        );
      const startsIn = relativeFromNow(event.event_started, now);

      written += await this.publish({
        title: `${event.title} starts ${startsIn}`,
        description: `Attendance opens at ${formatTimeOfDay(event.event_started)}${
          event.department ? ` · ${event.department}` : ''
        }. Make sure the roster and geofence are ready.`,
        category: NotificationCategory.EVENT,
        tone: NotificationTone.ATTENTION,
        href: '/admin/event-list',
        roles: [RoleType.DIRECTOR],
        userIds: coordinators,
        dedupeKey: `event-start:${event.event_id}`,
      });
    }
    await this.note(job, `${written} notification(s) written`);
  }

  private async remindReportDeadlines(job: Job): Promise<void> {
    const today = new Date();
    const daysLeft = daysInMonth(today) - today.getDate();
    if (!REPORT_REMINDER_DAYS_LEFT.has(daysLeft)) {
      await this.note(
        job,
        `${daysLeft} day(s) left in the month — not a reminder day`,
      );
      return;
    }

    const period = periodOf(today);
    const reported = new Set(
      await this.schedulerRepository.findDepartmentsReportedFor(period),
    );
    const missing = Object.values(ReportDepartment).filter(
      (department) => !reported.has(department),
    );
    await this.note(
      job,
      `${missing.length} department(s) have not filed ${period}`,
    );

    let written = 0;
    for (const department of missing) {
      const coordinators =
        await this.schedulerRepository.findCoordinatorIdsForDepartment(
          department,
        );
      if (coordinators.length === 0) continue;

      written += await this.publish({
        title: `Monthly report due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        description: `${DEPARTMENT_LABELS[department]} has not submitted its ${monthName(
          today,
        )} report. The reporting window closes at month end.`,
        category: NotificationCategory.REPORT,
        tone:
          daysLeft === 1
            ? NotificationTone.CRITICAL
            : NotificationTone.ATTENTION,
        href: '/admin/upload-report',
        userIds: coordinators,
        dedupeKey: `report-due:${period}:${department}:${daysLeft}`,
      });
    }
    await this.note(job, `${written} notification(s) written`);
  }

  private async alertCredentialExpiry(job: Job): Promise<void> {
    const now = new Date();
    const horizon = addHours(now, CREDENTIAL_LOOKAHEAD_HOURS);
    const accounts =
      await this.schedulerRepository.findCredentialsExpiringBetween(
        now,
        horizon,
      );
    await this.note(
      job,
      `${accounts.length} credential(s) lapse within ${CREDENTIAL_LOOKAHEAD_HOURS}h`,
    );

    let written = 0;
    for (const account of accounts) {
      const name =
        `${account.user.firstname} ${account.user.lastname}`.trim() ||
        account.email;
      const lapses = relativeFromNow(account.credential_expires_at!, now);

      written += await this.publish({
        title: 'Your temporary credentials expire soon',
        description: `Sign-in for ${account.email} stops working ${lapses}. Change your password before then to keep your access.`,
        category: NotificationCategory.ACCESS,
        tone: NotificationTone.ATTENTION,
        href: '/admin/settings',
        userIds: [account.user_id],
        dedupeKey: `credential-expiry:self:${account.account_id}`,
      });

      written += await this.publish({
        title: `${name}'s credentials expire ${lapses}`,
        description: `The temporary credential issued to ${account.email} has not been replaced. Re-issue it if the account is still needed.`,
        category: NotificationCategory.ACCESS,
        tone: NotificationTone.INFO,
        href: '/admin/manage-users',
        roles: [RoleType.ADMIN],
        dedupeKey: `credential-expiry:admin:${account.account_id}`,
      });
    }
    await this.note(job, `${written} notification(s) written`);
  }
}

// ------------------------------------------------------------ date helpers
// The server has no date library; these cover exactly what the sweeps say.

const TIME_ZONE = process.env.TZ || 'Asia/Manila';

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** `YYYY-MM`, the shape `MonthlyReport.period` is stored in. */
function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthName(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: TIME_ZONE,
  }).format(date);
}

function formatTimeOfDay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date);
}

/** "in 45 minutes", "in 2 hours", "in 3 days" — a person reads this, not a parser. */
function relativeFromNow(date: Date, now: Date): string {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}
