import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/setup-app.js';
import { setupSwagger } from '../../src/swagger/swagger.setup.js';

/** Boots a fully-configured Nest app (same pipes/filters/Swagger as prod) against the real test database. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  setupSwagger(app);
  await app.init();
  return app;
}
