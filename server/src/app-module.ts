import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestLoggerMiddleware } from './modules/middlewares/logger';
import { PrismaModule } from './modules/prisma/prisma-module';
import { AuthModule } from './modules/auth/auth-module';
import { HealthController } from './health-controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
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
