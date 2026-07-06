import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Reflector } from '@nestjs/core';
import { join } from 'path';
import { AppModule } from './app-module';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform-interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception-filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running at http://localhost:${process.env.PORT ?? 3000}`);
}

bootstrap();
