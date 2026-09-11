import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { RequestLoggerMiddleware } from './shared/middlewares/logger';
import { JwtMiddleware } from './infastructures/jwt/jwt-middleware';
import { PrismaModule } from './infastructures/prisma/prisma-module';
import { RedisModule } from './infastructures/redis/redis-module';
import { AuthModule } from './modules/auth/modules/auth-module';
import { HealthController } from './health-controller';
import { S3Module } from './infastructures/s3/s3-module';
import { MicroservicesModule } from './infastructures/microservices/microservices-module';
import { InterestsModule } from './modules/interests/modules/interests-module';
import { ProfileModule } from './modules/profile/modules/profile-module';
import { SettingsModule } from './modules/settings/modules/settings-module';
import { EventsModule } from './modules/events/modules/events-module';
import { EventAttendanceModule } from './modules/event-attendance/modules/event-attendance-module';
import { CertificateTemplatesModule } from './modules/certificate-templates/modules/certificate-templates-module';
import { CertificateDeploymentsModule } from './modules/certificate-deployments/modules/certificate-deployments-module';
import { UsersModule } from './modules/users/modules/users-module';
import { AccessControlModule } from './modules/access-control/modules/access-control-module';
import { LoginActivityModule } from './modules/login-activity/modules/login-activity-module';
import { SessionsModule } from './modules/sessions/modules/sessions-module';
import { AuditLogsModule } from './modules/audit-logs/modules/audit-logs-module';
import { SecurityPolicyModule } from './modules/security-policy/modules/security-policy-module';
import { SupportTicketsModule } from './modules/support-tickets/modules/support-tickets-module';
import { MonthlyReportsModule } from './modules/monthly-reports/modules/monthly-reports-module';
import { MailboxModule } from './modules/mailbox/modules/mailbox-module';
import { ChatModule } from './modules/chat/modules/chat-module';
import { AnnouncementsModule } from './modules/announcements/modules/announcements-module';
import { JwtModule } from './infastructures/jwt/jwt-module';
import { JwtAuthGuard } from './shared/guards/jwt-auth-guard';
import { RolesGuard } from './shared/guards/roles-guard';
import { SessionGuard } from './shared/guards/session-guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    JwtModule,
    RedisModule,
    S3Module,
    MicroservicesModule,
    AuthModule,
    InterestsModule,
    ProfileModule,
    SettingsModule,
    EventsModule,
    EventAttendanceModule,
    CertificateTemplatesModule,
    CertificateDeploymentsModule,
    UsersModule,
    AccessControlModule,
    LoginActivityModule,
    SessionsModule,
    AuditLogsModule,
    SecurityPolicyModule,
    SupportTicketsModule,
    MonthlyReportsModule,
    MailboxModule,
    ChatModule,
    AnnouncementsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      // After JwtAuthGuard: it needs the decoded token this guard checks against Redis.
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });

    consumer
      .apply(JwtMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'v1/auth/*path', method: RequestMethod.ALL },
        { path: 'v1/interests', method: RequestMethod.GET },
        // Google consent legs are browser redirects; they authenticate by OAuth state.
        { path: 'v1/mailbox/google', method: RequestMethod.GET },
        { path: 'v1/mailbox/google/callback', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
