import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../modules/notifications/modules/notifications-module';
import { CleanupScheduler } from './jobs/cleanup.scheduler';
import { DiagnosticsScheduler } from './jobs/diagnostics.scheduler';
import { EmailScheduler } from './jobs/email.scheduler';
import { NotificationScheduler } from './jobs/notification.scheduler';
import { CleanupProcessor } from './processors/cleanup.processor';
import { DiagnosticsProcessor } from './processors/diagnostics.processor';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { SystemDiagnosticsChecker } from './scheduler.diagnostics';
import { SCHEDULER_QUEUES, SchedulerRunRecorder } from './scheduler.registry';
import { SchedulerRepository } from './scheduler.repository';

/**
 * Background work on BullMQ. `jobs/` hold the schedulers — they register the
 * catalogued sweeps on boot and expose `publish`/`enqueue` for features to call.
 * `processors/` hold the workers that do the work. Both share Redis with the rest of
 * the server; the queues are namespaced under `cares:` so their keys stand apart
 * from the session and cache entries.
 */
@Global()
@Module({
  imports: [
    // Async so the connection reads the env after ConfigModule has loaded `.env` —
    // a static `forRoot` would see it empty at decoration time.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: Number(config.get<string>('REDIS_PORT')),
        },
        prefix: 'cares',
      }),
    }),
    BullModule.registerQueue(
      { name: SCHEDULER_QUEUES.email },
      { name: SCHEDULER_QUEUES.notification },
      { name: SCHEDULER_QUEUES.cleanup },
      { name: SCHEDULER_QUEUES.diagnostics },
    ),
    NotificationsModule,
  ],
  providers: [
    SchedulerRunRecorder,
    SchedulerRepository,
    EmailScheduler,
    NotificationScheduler,
    CleanupScheduler,
    DiagnosticsScheduler,
    SystemDiagnosticsChecker,
    EmailProcessor,
    NotificationProcessor,
    CleanupProcessor,
    DiagnosticsProcessor,
  ],
  exports: [
    BullModule,
    SchedulerRunRecorder,
    EmailScheduler,
    NotificationScheduler,
    CleanupScheduler,
    SystemDiagnosticsChecker,
  ],
})
export class SchedulersModule {}
