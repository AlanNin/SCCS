import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { LoggingInterceptor } from './common/logging.interceptor.js';

/**
 * Global app wiring shared between the real bootstrap (main.ts) and tests,
 * so a test app exercises exactly the same pipes/filters/interceptors
 * production traffic goes through.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  return app;
}
