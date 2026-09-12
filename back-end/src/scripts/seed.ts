// Seeds a demo warehouse with activity + audit history. Run with
// `npm run seed`, or `-- --reset` to wipe previously-seeded data first.
import { db } from '../prisma/db.js';
import { recomputeAllBinScores } from '../scoring/scoring.logic.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Deletes seed-owned rows in dependency order; scoped to this script's own tables.
async function resetDatabase() {
  console.log('--reset: clearing existing data...');
  await db.transaction(async (tx) => {
    const tables = [
      tx.sql.public.stockMovement,
      tx.sql.public.auditTask,
      tx.sql.public.palletItem,
      tx.sql.public.pallet,
      tx.sql.public.auditPlan,
      tx.sql.public.bin,
      tx.sql.public.product,
      tx.sql.public.rack,
      tx.sql.public.aisle,
      tx.sql.public.warehouse,
    ] as const;
    for (const table of tables) {
      await tx.execute(table.delete().build());
    }
  });
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomChoice<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}

function sample<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const idx = randomInt(0, pool.length - 1);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  return picked;
}

const PRODUCT_CATALOG = [
  'Corrugated Shipping Box (M)',
  'Corrugated Shipping Box (L)',
  'Pallet Wrap Film 20"',
  'Packing Tape 48mm',
  'Bubble Wrap Roll',
  'Foam Void Fill',
  'Steel Hex Bolts M8 (box)',
  'Steel Hex Bolts M10 (box)',
  'Nitrile Gloves (case)',
  'Safety Glasses (case)',
  'Hi-Vis Vest',
  'Forklift Battery Pack',
  'Pallet Jack Wheel Kit',
  'Barcode Label Roll',
  'Thermal Printer Ribbon',
  'Shrink Wrap Bags',
  'Wooden Pallet 48x40',
  'Plastic Tote Bin 64L',
  'Warehouse Broom',
  'Cleaning Solvent 5L',
];

async function main() {
  if (process.argv.includes('--reset')) {
    await resetDatabase();
  }

  console.log('Seeding SCCS warehouse...');

  const warehouse = await db.orm.public.Warehouse.create({
    code: 'WH1',
    name: 'Main Distribution Center',
  });

  const aisleCodes = ['A1', 'A2', 'A3'];
  const rackCodes = ['R1', 'R2'];
  const binsPerRack = 5;

  const bins: { id: number; code: string }[] = [];
  for (const aisleCode of aisleCodes) {
    const aisle = await db.orm.public.Aisle.create({ warehouseId: warehouse.id, code: aisleCode });
    for (const rackCode of rackCodes) {
      const rack = await db.orm.public.Rack.create({ aisleId: aisle.id, code: rackCode });
      for (let i = 1; i <= binsPerRack; i++) {
        const code = `${aisleCode}-${rackCode}-B${String(i).padStart(2, '0')}`;
        const bin = await db.orm.public.Bin.create({ rackId: rack.id, code });
        bins.push({ id: bin.id, code: bin.code });
      }
    }
  }
  console.log(`Created ${bins.length} bins.`);

  const products: { id: number; sku: string }[] = [];
  for (const [i, name] of PRODUCT_CATALOG.entries()) {
    const sku = `SKU-${String(i + 1).padStart(4, '0')}`;
    const product = await db.orm.public.Product.create({ sku, name });
    products.push({ id: product.id, sku: product.sku });
  }
  console.log(`Created ${products.length} products.`);

  // Leave some bins empty so the heatmap shows realistic gaps.
  let palletSeq = 1;
  for (const bin of bins) {
    if (Math.random() < 0.15) continue;
    const palletCount = randomInt(1, 2);
    for (let p = 0; p < palletCount; p++) {
      const code = `PLT-${String(palletSeq++).padStart(5, '0')}`;
      const pallet = await db.orm.public.Pallet.create({ code, binId: bin.id });
      const lineCount = randomInt(1, 3);
      for (const product of sample(products, lineCount)) {
        await db.orm.public.PalletItem.create({
          palletId: pallet.id,
          productId: product.id,
          quantity: randomInt(5, 100),
        });
      }
    }
  }
  console.log(`Created ${palletSeq - 1} pallets.`);

  // Simulate the last 30 days of warehouse activity.
  const now = Date.now();
  let movementCount = 0;
  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
    const eventsToday = randomInt(2, 7);
    for (let e = 0; e < eventsToday; e++) {
      const bin = randomChoice(bins);
      const createdAt = new Date(
        now - dayOffset * MS_PER_DAY + randomInt(0, 20 * 60 * 60 * 1000),
      ).toISOString();
      const roll = Math.random();

      if (roll < 0.35) {
        await db.orm.public.StockMovement.create({
          type: 'PUTAWAY',
          binId: bin.id,
          quantity: randomInt(5, 50),
          createdAt,
        });
      } else if (roll < 0.65) {
        await db.orm.public.StockMovement.create({
          type: 'PICK',
          binId: bin.id,
          quantity: randomInt(1, 20),
          createdAt,
        });
      } else if (roll < 0.85) {
        const destination = randomChoice(bins.filter((b) => b.id !== bin.id));
        const quantity = randomInt(1, 30);
        // A move touches two bins - one row per side, linked via relatedBinId.
        await db.orm.public.StockMovement.create({
          type: 'MOVE',
          binId: bin.id,
          relatedBinId: destination.id,
          quantity,
          createdAt,
        });
        await db.orm.public.StockMovement.create({
          type: 'MOVE',
          binId: destination.id,
          relatedBinId: bin.id,
          quantity,
          createdAt,
        });
        movementCount++;
      } else {
        const delta = randomInt(1, 10) * (Math.random() < 0.5 ? -1 : 1);
        await db.orm.public.StockMovement.create({
          type: 'ADJUSTMENT',
          binId: bin.id,
          quantity: delta,
          note: 'Cycle count variance',
          createdAt,
        });
      }
      movementCount++;
    }
  }

  // Bias a few bins toward heavy adjustments so the heatmap shows a clear high-risk cluster.
  const hotBins = sample(bins, 4);
  for (const bin of hotBins) {
    for (let i = 0; i < 6; i++) {
      const createdAt = new Date(now - randomInt(0, 20) * MS_PER_DAY).toISOString();
      await db.orm.public.StockMovement.create({
        type: 'ADJUSTMENT',
        binId: bin.id,
        quantity: randomInt(1, 10) * (Math.random() < 0.5 ? -1 : 1),
        note: 'Recurring discrepancy',
        createdAt,
      });
      movementCount++;
    }
  }
  console.log(`Created ${movementCount} stock movement events.`);

  // Most bins stay never-audited so "days since last audit" has real spread.
  const historicalPlan = await db.orm.public.AuditPlan.create({
    name: 'Historical audits (seed data)',
    topN: 0,
  });

  const auditedBins = sample(bins, 12);
  for (const bin of auditedBins) {
    const auditedAt = new Date(now - randomInt(1, 45) * MS_PER_DAY).toISOString();
    const passed = Math.random() > 0.3;
    const expectedQuantity = randomInt(10, 150);
    const countedQuantity = passed ? expectedQuantity : expectedQuantity + randomInt(-15, -1);

    await db.orm.public.AuditTask.create({
      planId: historicalPlan.id,
      binId: bin.id,
      status: 'DONE',
      riskScoreAtCreation: 0,
      expectedQuantity,
      countedQuantity,
      result: passed ? 'PASS' : 'FAIL',
      completedAt: auditedAt,
      createdAt: auditedAt,
    });

    await db.orm.public.Bin.where({ id: bin.id }).update({ lastAuditedAt: auditedAt });
  }
  console.log(`Recorded ${auditedBins.length} historical audits.`);

  const { updatedBins } = await recomputeAllBinScores(db);
  console.log(`Recomputed risk scores for ${updatedBins} bins.`);

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
