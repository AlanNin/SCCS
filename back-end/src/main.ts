import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './setup-app.js';
import { setupSwagger } from './swagger/swagger.setup.js';

let app: INestApplication;

async function bootstrap(): Promise<INestApplication> {
  if (!app) {
    app = await NestFactory.create(AppModule);
    configureApp(app);
    setupSwagger(app);
    await app.init();
  }
  return app;
}

void bootstrap().then((app) => {
  const port = process.env.PORT ?? 3000;
  app.listen(port);
  Logger.log(`SCCS backend listening on port ${port}`, 'Bootstrap');
});

// Vercel - exported request handler, reuses the cached app above, no app.listen().
export default async function handler(req: any, res: any) {
  try {
    const nestApp = await bootstrap();
    const server = nestApp.getHttpAdapter().getInstance();
    server(req, res);
  } catch (error) {
    console.error('Error initializing NestJS app:', error);
    res.status(500).send('Internal Server Error');
  }
}
