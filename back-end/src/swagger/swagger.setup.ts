import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import { resolveSwaggerCredentials } from './swagger-credentials.js';

const DOCS_PATH = 'docs';
const logger = new Logger('Swagger');

/**
 * Mounts the OpenAPI UI at /docs behind HTTP Basic Auth (the browser's
 * native password prompt - `challenge: true`), gated by SWAGGER_USER /
 * SWAGGER_PASSWORD. Credentials are required outside development so the
 * docs never accidentally ship open in a deployed environment.
 */
export function setupSwagger(app: INestApplication): void {
  const { user, password, usingDefaults } = resolveSwaggerCredentials(process.env);

  if (usingDefaults) {
    logger.warn(
      'SWAGGER_USER / SWAGGER_PASSWORD not set - using insecure development defaults ' +
        '(admin/admin) for /docs. Set both in .env for anything beyond local dev.',
    );
  }

  app.use(
    `/${DOCS_PATH}`,
    basicAuth({
      users: { [user]: password },
      challenge: true,
      realm: 'SCCS API Docs',
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('SCCS API')
    .setDescription(
      'Smart Cycle Count Scoring - warehouse bin risk scoring, audit plans, and the mobile count flow.',
    )
    .setVersion('1.0')
    .addTag('bins', 'Heatmap data, bin detail, bin search')
    .addTag('scoring', 'Risk score recomputation')
    .addTag('audit-plans', 'Top-N risky bin audit plans')
    .addTag('audit-tasks', 'Per-bin audit tasks and the count flow')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(DOCS_PATH, app, document);

  logger.log(`API docs available at /${DOCS_PATH} (HTTP Basic Auth)`);
}
