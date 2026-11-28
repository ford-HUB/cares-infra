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

  // Railway: one proxy hop, so request.ip comes from X-Forwarded-For (IP allowlist, audit).
  // Development trusts nothing to prevent spoofing.
  app.set('trust proxy', isProduction() ? 1 : false);

  // Certificate designs inline artwork as base64; sized to the customizer's per-file limits.
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

void bootstrap();
