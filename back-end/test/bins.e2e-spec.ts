import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../src/prisma/db.js';
import { createTestWarehouse, type TestWarehouseFixture } from './utils/fixtures.js';
import { createTestApp } from './utils/test-app.js';

describe('Bins (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: TestWarehouseFixture;
  let palletId: number;

  beforeAll(async () => {
    app = await createTestApp();
    fixture = await createTestWarehouse({ binCount: 2, productCount: 2 });
    const pallet = await fixture.addPallet(fixture.binIds[0]!, [
      { productId: fixture.productIds[0]!, quantity: 12 },
      { productId: fixture.productIds[1]!, quantity: 5 },
    ]);
    palletId = pallet.id;
  });

  afterAll(async () => {
    await fixture.cleanup();
    await app.close();
    await db.close();
  });

  it('GET /api/bins includes the fixture bins with a risk band', async () => {
    const res = await request(app.getHttpServer()).get('/api/bins').expect(200);
    expect(Array.isArray(res.body)).toBe(true);

    const found = res.body.find((b: { id: number }) => b.id === fixture.binIds[0]);
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      code: 'B1',
      rack: { code: 'R1' },
      aisle: { code: 'A1' },
      warehouse: { code: `TEST-WH-${fixture.runId}` },
    });
    expect(['low', 'medium', 'high']).toContain(found.band);
  });

  it('GET /api/bins/:id returns score, pallets, and products for an existing bin', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/bins/${fixture.binIds[0]}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: fixture.binIds[0],
      code: 'B1',
      rack: { code: 'R1' },
      aisle: { code: 'A1' },
    });
    expect(res.body.pallets).toHaveLength(1);
    expect(res.body.pallets[0].id).toBe(palletId);
    expect(res.body.pallets[0].items).toHaveLength(2);
    const quantities = res.body.pallets[0].items
      .map((i: { quantity: number }) => i.quantity)
      .sort((a: number, b: number) => a - b);
    expect(quantities).toEqual([5, 12]);
  });

  it('GET /api/bins/:id 404s for a bin that does not exist', async () => {
    const res = await request(app.getHttpServer()).get('/api/bins/999999999').expect(404);
    expect(res.body.message).toContain('999999999');
  });

  it('GET /api/bins/:id 400s for a non-numeric id', async () => {
    await request(app.getHttpServer()).get('/api/bins/not-a-number').expect(400);
  });

  it('GET /api/bins/search?q= finds bins by code substring', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/bins/search')
      .query({ q: 'B1' })
      .expect(200);

    expect(res.body.some((b: { id: number }) => b.id === fixture.binIds[0])).toBe(true);
  });

  it('GET /api/bins/search 400s when q is missing', async () => {
    await request(app.getHttpServer()).get('/api/bins/search').expect(400);
  });
});
