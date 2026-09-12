import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../src/prisma/db.js';
import { createTestWarehouse, type TestWarehouseFixture } from './utils/fixtures.js';
import { createTestApp } from './utils/test-app.js';

describe('Audit tasks (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: TestWarehouseFixture;

  beforeAll(async () => {
    app = await createTestApp();
    fixture = await createTestWarehouse({ binCount: 1, productCount: 1 });
    await fixture.addPallet(fixture.binIds[0]!, [{ productId: fixture.productIds[0]!, quantity: 20 }]);
  });

  afterAll(async () => {
    await fixture.cleanup();
    await app.close();
    await db.close();
  });

  it('GET /api/audit-tasks/by-bin/:binId opens an ad-hoc task when none is pending', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/audit-tasks/by-bin/${fixture.binIds[0]}`)
      .expect(200);

    expect(res.body).toMatchObject({
      status: 'PENDING',
      plan: null,
      expectedQuantity: 20,
      bin: { id: fixture.binIds[0], code: 'B1' },
    });
    expect(res.body.bin.pallets).toHaveLength(1);
  });

  it('GET /api/audit-tasks/by-bin/:binId reuses the existing pending task', async () => {
    const first = await request(app.getHttpServer())
      .get(`/api/audit-tasks/by-bin/${fixture.binIds[0]}`)
      .expect(200);
    const second = await request(app.getHttpServer())
      .get(`/api/audit-tasks/by-bin/${fixture.binIds[0]}`)
      .expect(200);
    expect(second.body.id).toBe(first.body.id);
  });

  it('GET /api/audit-tasks/by-bin/:binId 404s for a bin that does not exist', async () => {
    await request(app.getHttpServer()).get('/api/audit-tasks/by-bin/999999999').expect(404);
  });

  it('GET /api/audit-tasks/:id 404s for a task that does not exist', async () => {
    await request(app.getHttpServer()).get('/api/audit-tasks/999999999').expect(404);
  });

  describe('full count flow', () => {
    let taskId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/audit-tasks/by-bin/${fixture.binIds[0]}`)
        .expect(200);
      taskId = res.body.id;
    });

    it('lists the task under status=PENDING', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-tasks')
        .query({ status: 'PENDING' })
        .expect(200);
      expect(res.body.some((t: { id: number }) => t.id === taskId)).toBe(true);
    });

    it('lists the task with no status filter at all', async () => {
      const res = await request(app.getHttpServer()).get('/api/audit-tasks').expect(200);
      expect(res.body.some((t: { id: number }) => t.id === taskId)).toBe(true);
    });

    it('rejects an invalid count payload', async () => {
      await request(app.getHttpServer())
        .post(`/api/audit-tasks/${taskId}/count`)
        .send({ countedQuantity: 18, result: 'MAYBE' })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/api/audit-tasks/${taskId}/count`)
        .send({ result: 'PASS' })
        .expect(400);
    });

    it('POST /api/audit-tasks/:id/count completes the task, stamps the bin, and recomputes scores', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/audit-tasks/${taskId}/count`)
        .send({ countedQuantity: 18, result: 'FAIL', notes: 'short by 2' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: taskId,
        status: 'DONE',
        countedQuantity: 18,
        result: 'FAIL',
        notes: 'short by 2',
      });
      expect(res.body.completedAt).not.toBeNull();

      const bin = await request(app.getHttpServer()).get(`/api/bins/${fixture.binIds[0]}`).expect(200);
      expect(bin.body.lastAuditedAt).not.toBeNull();
    });

    it('moves the task from PENDING to DONE in the status filter', async () => {
      const pending = await request(app.getHttpServer())
        .get('/api/audit-tasks')
        .query({ status: 'PENDING' })
        .expect(200);
      expect(pending.body.some((t: { id: number }) => t.id === taskId)).toBe(false);

      const done = await request(app.getHttpServer())
        .get('/api/audit-tasks')
        .query({ status: 'DONE' })
        .expect(200);
      expect(done.body.some((t: { id: number }) => t.id === taskId)).toBe(true);
    });

    it('rejects counting the same task twice', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/audit-tasks/${taskId}/count`)
        .send({ countedQuantity: 18, result: 'PASS' })
        .expect(400);
      expect(res.body.message).toContain('already counted');
    });

    it('opens a fresh ad-hoc task for the bin once the previous one is DONE', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/audit-tasks/by-bin/${fixture.binIds[0]}`)
        .expect(200);
      expect(res.body.id).not.toBe(taskId);
      expect(res.body.status).toBe('PENDING');
    });

    it('completes a count with no notes given (defaults to null)', async () => {
      const opened = await request(app.getHttpServer())
        .get(`/api/audit-tasks/by-bin/${fixture.binIds[0]}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/api/audit-tasks/${opened.body.id}/count`)
        .send({ countedQuantity: 20, result: 'PASS' })
        .expect(201);

      expect(res.body.notes).toBeNull();
    });
  });

  it('POST /api/audit-tasks/:id/count 404s for a task that does not exist', async () => {
    await request(app.getHttpServer())
      .post('/api/audit-tasks/999999999/count')
      .send({ countedQuantity: 1, result: 'PASS' })
      .expect(404);
  });
});
