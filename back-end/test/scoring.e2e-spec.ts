import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../src/prisma/db.js';
import { createTestWarehouse, type TestWarehouseFixture } from './utils/fixtures.js';
import { createTestApp } from './utils/test-app.js';

describe('Scoring (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: TestWarehouseFixture;

  beforeAll(async () => {
    app = await createTestApp();
    fixture = await createTestWarehouse({ binCount: 2, productCount: 1 });

    // Bin 1: heavy recent activity + adjustments -> should score high.
    for (let i = 0; i < 6; i++) {
      await fixture.addMovement({ type: 'PICK', binId: fixture.binIds[0]!, quantity: 3 });
    }
    for (let i = 0; i < 4; i++) {
      await fixture.addMovement({ type: 'ADJUSTMENT', binId: fixture.binIds[0]!, quantity: -2 });
    }
    // Bin 2: no activity at all -> should score low.
  });

  afterAll(async () => {
    await fixture.cleanup();
    await app.close();
    await db.close();
  });

  it('POST /api/scoring/recompute recomputes every bin and returns a summary', async () => {
    const res = await request(app.getHttpServer()).post('/api/scoring/recompute').expect(201);
    expect(res.body).toMatchObject({ updatedBins: expect.any(Number) });
    expect(res.body.updatedBins).toBeGreaterThanOrEqual(2);
    expect(typeof res.body.computedAt).toBe('string');
  });

  it('gives the busy/adjusted bin a strictly higher risk score than the idle bin, with a factor breakdown', async () => {
    await request(app.getHttpServer()).post('/api/scoring/recompute').expect(201);

    const busy = await request(app.getHttpServer()).get(`/api/bins/${fixture.binIds[0]}`).expect(200);
    const idle = await request(app.getHttpServer()).get(`/api/bins/${fixture.binIds[1]}`).expect(200);

    expect(busy.body.riskScore).toBeGreaterThan(idle.body.riskScore);
    expect(busy.body.scoreFactors.factors.movementFrequency.raw).toBe(6);
    expect(busy.body.scoreFactors.factors.adjustmentFrequency.raw).toBe(4);
    expect(busy.body.scoreFactors.factors).toHaveProperty('daysSinceLastAudit');
    expect(busy.body.scoreFactors.factors).toHaveProperty('auditFailRate');
    expect(busy.body.scoreFactors.factors).toHaveProperty('productDiversity');
  });
});
