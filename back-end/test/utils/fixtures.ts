import { db } from '../../src/prisma/db.js';

export interface TestWarehouseFixture {
  runId: string;
  warehouseId: number;
  aisleId: number;
  rackId: number;
  binIds: number[];
  productIds: number[];
  palletIds: number[];
  /** Creates a pallet with the given items in one of this fixture's bins. */
  addPallet: (binId: number, items: { productId: number; quantity: number }[]) => Promise<{ id: number; code: string }>;
  /** Records a stock movement against one of this fixture's bins. */
  addMovement: (params: {
    type: 'PUTAWAY' | 'PICK' | 'MOVE' | 'ADJUSTMENT';
    binId: number;
    quantity: number;
    createdAt?: string;
    relatedBinId?: number;
  }) => Promise<{ id: number }>;
  /** Deletes every row this fixture created, in dependency order. */
  cleanup: () => Promise<void>;
}

/** Creates a small, uniquely-coded warehouse fixture so e2e tests never collide with each other. */
export async function createTestWarehouse(
  options: { binCount?: number; productCount?: number } = {},
): Promise<TestWarehouseFixture> {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const binCount = options.binCount ?? 3;
  const productCount = options.productCount ?? 2;

  const warehouse = await db.orm.public.Warehouse.create({
    code: `TEST-WH-${runId}`,
    name: 'E2E Test Warehouse',
  });
  const aisle = await db.orm.public.Aisle.create({ warehouseId: warehouse.id, code: 'A1' });
  const rack = await db.orm.public.Rack.create({ aisleId: aisle.id, code: 'R1' });

  const binIds: number[] = [];
  for (let i = 0; i < binCount; i++) {
    const bin = await db.orm.public.Bin.create({ rackId: rack.id, code: `B${i + 1}` });
    binIds.push(bin.id);
  }

  const productIds: number[] = [];
  for (let i = 0; i < productCount; i++) {
    const product = await db.orm.public.Product.create({
      sku: `TEST-SKU-${runId}-${i}`,
      name: `Test Product ${i}`,
    });
    productIds.push(product.id);
  }

  const palletIds: number[] = [];
  const movementIds: number[] = [];

  const addPallet: TestWarehouseFixture['addPallet'] = async (binId, items) => {
    const pallet = await db.orm.public.Pallet.create({
      code: `TEST-PLT-${runId}-${palletIds.length + 1}`,
      binId,
    });
    palletIds.push(pallet.id);
    for (const item of items) {
      await db.orm.public.PalletItem.create({
        palletId: pallet.id,
        productId: item.productId,
        quantity: item.quantity,
      });
    }
    return pallet;
  };

  const addMovement: TestWarehouseFixture['addMovement'] = async (params) => {
    const movement = await db.orm.public.StockMovement.create({
      type: params.type,
      binId: params.binId,
      relatedBinId: params.relatedBinId ?? null,
      quantity: params.quantity,
      createdAt: params.createdAt ?? new Date().toISOString(),
    });
    movementIds.push(movement.id);
    return movement;
  };

  const cleanup = async () => {
    await db.transaction(async (tx) => {
      if (binIds.length > 0) {
        await tx.orm.public.StockMovement.where((m) => m.binId.in(binIds)).delete();
        await tx.orm.public.AuditTask.where((t) => t.binId.in(binIds)).delete();
      }
      if (palletIds.length > 0) {
        await tx.orm.public.PalletItem.where((i) => i.palletId.in(palletIds)).delete();
        await tx.orm.public.Pallet.where((p) => p.id.in(palletIds)).delete();
      }
      if (binIds.length > 0) {
        await tx.orm.public.Bin.where((b) => b.id.in(binIds)).delete();
      }
      if (productIds.length > 0) {
        await tx.orm.public.Product.where((p) => p.id.in(productIds)).delete();
      }
      await tx.orm.public.Rack.where({ id: rack.id }).delete();
      await tx.orm.public.Aisle.where({ id: aisle.id }).delete();
      await tx.orm.public.Warehouse.where({ id: warehouse.id }).delete();
    });
  };

  return {
    runId,
    warehouseId: warehouse.id,
    aisleId: aisle.id,
    rackId: rack.id,
    binIds,
    productIds,
    palletIds,
    addPallet,
    addMovement,
    cleanup,
  };
}

/** Deletes audit plans (and, via cascade, their tasks) created directly through the API in a test. */
export async function cleanupAuditPlans(planIds: number[]): Promise<void> {
  if (planIds.length === 0) return;
  await db.orm.public.AuditPlan.where((p) => p.id.in(planIds)).delete();
}
