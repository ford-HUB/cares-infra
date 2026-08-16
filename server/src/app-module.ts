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
import { JwtModule } from './infastructures/jwt/jwt-module';
import { JwtAuthGuard } from './shared/guards/jwt-auth-guard';
import { RolesGuard } from './shared/guards/roles-guard';

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
      )
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
