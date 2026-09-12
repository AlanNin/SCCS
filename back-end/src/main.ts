import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './setup-app.js';
import { setupSwagger } from './swagger/swagger.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`SCCS backend listening on port ${port}`, 'Bootstrap');
}
await bootstrap();
