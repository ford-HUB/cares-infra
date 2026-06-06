import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestLoggerMiddleware } from './modules/middlewares/logger';
import { PrismaModule } from './infastructures/prisma/prisma-module';
import { RedisModule } from './infastructures/redis/redis-module';
import { AuthModule } from './modules/auth/auth-module';
import { HealthController } from './health-controller';
import { S3Module } from './infastructures/s3/s3-module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    S3Module,
    AuthModule,
  ],
  controllers: [HealthController],
})


export class AppModule implements NestModule
{
    configure(consumer: MiddlewareConsumer) {
        consumer
          .apply(RequestLoggerMiddleware)
          .forRoutes({ path: '*path', method: RequestMethod.ALL });
    }
}
