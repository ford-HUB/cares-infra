import { NestFactory } from '@nestjs/core';
import { AppModule } from './app-module';
import { Reflector } from '@nestjs/core';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform-interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception-filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running at http://localhost:${process.env.PORT ?? 3000}`);
}

bootstrap();