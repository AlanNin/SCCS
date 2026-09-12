import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../src/prisma/db.js';
import { createTestApp } from './utils/test-app.js';

describe('Swagger docs (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('401s on /docs with no credentials and challenges for Basic Auth', async () => {
    const res = await request(app.getHttpServer()).get('/docs').expect(401);
    expect(res.headers['www-authenticate']).toMatch(/^Basic/);
  });

  it('401s on /docs with wrong credentials', async () => {
    await request(app.getHttpServer())
      .get('/docs')
      .auth('admin', 'definitely-wrong')
      .expect(401);
  });

  it('200s on /docs with the configured credentials', async () => {
    const user = process.env.SWAGGER_USER!;
    const password = process.env.SWAGGER_PASSWORD!;
    await request(app.getHttpServer()).get('/docs').auth(user, password).expect(200);
  });

  it('serves a valid OpenAPI document at /docs-json', async () => {
    const user = process.env.SWAGGER_USER!;
    const password = process.env.SWAGGER_PASSWORD!;
    const res = await request(app.getHttpServer()).get('/docs-json').auth(user, password).expect(200);
    expect(res.body.info).toMatchObject({ title: 'SCCS API' });
    expect(res.body.paths).toHaveProperty('/api/bins');
    expect(res.body.paths).toHaveProperty('/api/audit-tasks/{id}/count');
  });
});
