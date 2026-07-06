import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { RequestLoggerMiddleware } from './modules/middlewares/logger';
import { AuthMiddleware } from './modules/middlewares/auth-middleware';
import { PrismaModule } from './infastructures/prisma/prisma-module';
import { RedisModule } from './infastructures/redis/redis-module';
import { AuthModule } from './modules/auth/auth-module';
import { HealthController } from './health-controller';
import { S3Module } from './infastructures/s3/s3-module';
import { MicroservicesModule } from './infastructures/microservices/microservices-module';
import { OnboardingModule } from './modules/onboarding/onboarding-module';
import { ProfileModule } from './modules/profile/profile-module';
import { AccountSettingsModule } from './modules/account-settings/account-settings-module';
import { EventsModule } from './modules/events/events-module';
import { JwtModule } from './infastructures/jwt/jwt-module';
import { JwtAuthGuard } from './common/guards/jwt-auth-guard';
import { RolesGuard } from './common/guards/roles-guard';

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
    OnboardingModule,
    ProfileModule,
    AccountSettingsModule,
    EventsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})


export class AppModule implements NestModule
{
    configure(consumer: MiddlewareConsumer) {
        consumer
          .apply(RequestLoggerMiddleware)
          .forRoutes({ path: '*path', method: RequestMethod.ALL });

        consumer
          .apply(AuthMiddleware)
          .exclude(
            { path: 'health', method: RequestMethod.GET },
            { path: 'v1/auth/*path', method: RequestMethod.ALL },
            { path: 'v1/onboarding/interests', method: RequestMethod.GET },
          )
          .forRoutes({ path: '*path', method: RequestMethod.ALL });
    }
}
