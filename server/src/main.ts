import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app-module';
import { Reflector } from '@nestjs/core';
import { ResponseTransformInterceptor } from './shared/interceptors/response-transform-interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception-filter';
import { allowedOrigins, isProduction } from './shared/utils/environment-utils';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  // Railway terminates TLS at one proxy hop, so request.ip must come from X-Forwarded-For
  // there (the portal IP allowlist and audit trail depend on it). Direct connections in
  // development trust nothing, so a client cannot spoof its address.
  app.set('trust proxy', isProduction() ? 1 : false);

  // Certificate designs are saved whole, with newly imported artwork inlined as data
  // URLs, so one save can carry several megabytes of base64. Express's 100 KB default
  // would reject those with a bare 413; the ceiling here is the customizer's own
  // per-file limits added up, not an open door.
  app.useBodyParser('json', { limit: '12mb' });
  app.useBodyParser('urlencoded', { limit: '12mb', extended: true });

  app.enableCors({
    origin: allowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Server is running at http://localhost:${process.env.PORT ?? 3000}`,
  );
}

bootstrap();
