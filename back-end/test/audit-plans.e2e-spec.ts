import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../src/prisma/db.js';
import { cleanupAuditPlans, createTestWarehouse, type TestWarehouseFixture } from './utils/fixtures.js';
import { createTestApp } from './utils/test-app.js';

describe('Audit plans (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: TestWarehouseFixture;
  let createdPlanIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    fixture = await createTestWarehouse({ binCount: 1, productCount: 1 });
    await fixture.addPallet(fixture.binIds[0]!, [{ productId: fixture.productIds[0]!, quantity: 42 }]);
    // Guarantee this bin ranks in any Top-N by making it maximally risky.
    await db.orm.public.Bin.where({ id: fixture.binIds[0] }).update({ riskScore: 100 });
  });

  afterAll(async () => {
    await cleanupAuditPlans(createdPlanIds);
    await fixture.cleanup();
    await app.close();
    await db.close();
  });

  it('POST /api/audit-plans creates a plan with a PENDING task per top-N bin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/audit-plans')
      .send({ topN: 1, name: `E2E plan ${fixture.runId}` })
      .expect(201);
    createdPlanIds.push(res.body.id);

    expect(res.body.name).toBe(`E2E plan ${fixture.runId}`);
    expect(res.body.topN).toBe(1);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0]).toMatchObject({
      status: 'PENDING',
      riskScoreAtCreation: 100,
      band: 'high',
      expectedQuantity: 42,
      bin: { id: fixture.binIds[0], code: 'B1' },
    });
  });

  it('uses a default generated name when none is given', async () => {
    const res = await request(app.getHttpServer()).post('/api/audit-plans').send({ topN: 1 }).expect(201);
    createdPlanIds.push(res.body.id);
    expect(res.body.name).toMatch(/^Top \d+ risk audit -/);
  });

  it('rejects an out-of-range topN', async () => {
    await request(app.getHttpServer()).post('/api/audit-plans').send({ topN: 0 }).expect(400);
    await request(app.getHttpServer()).post('/api/audit-plans').send({ topN: 101 }).expect(400);
    await request(app.getHttpServer()).post('/api/audit-plans').send({}).expect(400);
  });

  it('GET /api/audit-plans lists plans with pending/done counts', async () => {
    const res = await request(app.getHttpServer()).get('/api/audit-plans').expect(200);
    const created = res.body.find((p: { id: number }) => p.id === createdPlanIds[0]);
    expect(created).toMatchObject({ taskCount: 1, pendingCount: 1, doneCount: 0 });
  });

  it('GET /api/audit-plans/:id returns the plan detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/audit-plans/${createdPlanIds[0]}`)
      .expect(200);
    expect(res.body.id).toBe(createdPlanIds[0]);
    expect(res.body.tasks).toHaveLength(1);
  });

  it('GET /api/audit-plans/:id 404s for a plan that does not exist', async () => {
    await request(app.getHttpServer()).get('/api/audit-plans/999999999').expect(404);
  });
});
