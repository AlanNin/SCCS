import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { db } from '../src/prisma/db.js';
import { createTestApp } from './utils/test-app.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('GET /api returns service health', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect({ status: 'ok', service: 'sccs-backend' });
  });

  it('404s on a route no controller matches', async () => {
    // Unmatched routes never reach a controller, so they're handled by the
    // platform's default 404 (plain text), not HttpExceptionFilter's JSON
    // body - that shape is covered by the per-resource 404 tests instead.
    await request(app.getHttpServer()).get('/api/does-not-exist').expect(404);
  });
});
