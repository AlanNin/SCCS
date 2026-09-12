import type { JsonValue } from '@prisma/orm-postgres/target/codec-types';
import type { Db } from '../prisma/prisma.module.js';
import {
  ACTIVITY_WINDOW_DAYS,
  SCORE_WEIGHTS,
  STALE_AUDIT_CAP_DAYS,
} from './scoring.constants.js';

interface FactorBreakdown {
  raw: number;
  normalized: number;
  weight: number;
  contribution: number;
}

export interface BinScoreFactors {
  weights: typeof SCORE_WEIGHTS;
  factors: {
    daysSinceLastAudit: FactorBreakdown;
    movementFrequency: FactorBreakdown;
    adjustmentFrequency: FactorBreakdown;
    auditFailRate: FactorBreakdown;
    productDiversity: FactorBreakdown;
  };
  score: number;
  computedAt: string;
}

export interface ScoredBin {
  binId: number;
  score: number;
  scoreFactors: BinScoreFactors;
}

interface RawBinMetrics {
  binId: number;
  daysSinceLastAudit: number;
  movementCount: number;
  adjustmentCount: number;
  productDiversity: number;
  auditFailRatePct: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Scales `raw` against the batch's own [min, max]; a flat batch normalizes to 0.
function minMaxNormalize(raw: number, min: number, max: number): number {
  if (max <= min) return 0;
  return ((raw - min) / (max - min)) * 100;
}

function capNormalize(raw: number, capAt: number): number {
  return Math.min(100, (raw / capAt) * 100);
}

function rangeOf(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function withContribution(normalized: number, raw: number, weight: number): FactorBreakdown {
  return {
    raw: round2(raw),
    normalized: round2(normalized),
    weight,
    contribution: round2(normalized * weight),
  };
}

/** Reads the raw signals every scoring factor is built from. */
export async function collectRawMetrics(db: Pick<Db, 'orm'>): Promise<RawBinMetrics[]> {
  const now = Date.now();
  const activityCutoffIso = new Date(now - ACTIVITY_WINDOW_DAYS * MS_PER_DAY).toISOString();

  const [bins, recentMovements, doneTasks] = await Promise.all([
    db.orm.public.Bin.select('id', 'lastAuditedAt', 'createdAt')
      .include('pallets', (pallet) =>
        pallet.select('id').include('items', (item) => item.select('productId')),
      )
      .all(),
    db.orm.public.StockMovement.select('binId', 'type')
      .where((m) => m.createdAt.gte(activityCutoffIso))
      .all(),
    db.orm.public.AuditTask.select('binId', 'result').where({ status: 'DONE' }).all(),
  ]);

  const movementCountByBin = new Map<number, number>();
  const adjustmentCountByBin = new Map<number, number>();
  for (const m of recentMovements) {
    if (m.type === 'ADJUSTMENT') {
      adjustmentCountByBin.set(m.binId, (adjustmentCountByBin.get(m.binId) ?? 0) + 1);
    } else {
      movementCountByBin.set(m.binId, (movementCountByBin.get(m.binId) ?? 0) + 1);
    }
  }

  const auditTotalsByBin = new Map<number, { total: number; fail: number }>();
  for (const t of doneTasks) {
    const entry = auditTotalsByBin.get(t.binId) ?? { total: 0, fail: 0 };
    entry.total += 1;
    if (t.result === 'FAIL') entry.fail += 1;
    auditTotalsByBin.set(t.binId, entry);
  }

  return bins.map((bin) => {
    const referenceIso = bin.lastAuditedAt ?? bin.createdAt;
    const daysSinceLastAudit = Math.max(0, (now - new Date(referenceIso).getTime()) / MS_PER_DAY);
    const productDiversity = new Set(
      bin.pallets.flatMap((p) => p.items.map((i) => i.productId)),
    ).size;
    const auditTotals = auditTotalsByBin.get(bin.id);
    const auditFailRatePct =
      auditTotals && auditTotals.total > 0 ? (auditTotals.fail / auditTotals.total) * 100 : 0;

    return {
      binId: bin.id,
      daysSinceLastAudit,
      movementCount: movementCountByBin.get(bin.id) ?? 0,
      adjustmentCount: adjustmentCountByBin.get(bin.id) ?? 0,
      productDiversity,
      auditFailRatePct,
    };
  });
}

/** Turns raw per-bin metrics into normalized, weighted 0-100 risk scores. */
export function scoreBins(raw: RawBinMetrics[], computedAt: string = new Date().toISOString()): ScoredBin[] {
  const movementRange = rangeOf(raw.map((r) => r.movementCount));
  const adjustmentRange = rangeOf(raw.map((r) => r.adjustmentCount));
  const diversityRange = rangeOf(raw.map((r) => r.productDiversity));

  return raw.map((metrics) => {
    const factors: BinScoreFactors['factors'] = {
      daysSinceLastAudit: withContribution(
        capNormalize(metrics.daysSinceLastAudit, STALE_AUDIT_CAP_DAYS),
        metrics.daysSinceLastAudit,
        SCORE_WEIGHTS.daysSinceLastAudit,
      ),
      movementFrequency: withContribution(
        minMaxNormalize(metrics.movementCount, movementRange.min, movementRange.max),
        metrics.movementCount,
        SCORE_WEIGHTS.movementFrequency,
      ),
      adjustmentFrequency: withContribution(
        minMaxNormalize(metrics.adjustmentCount, adjustmentRange.min, adjustmentRange.max),
        metrics.adjustmentCount,
        SCORE_WEIGHTS.adjustmentFrequency,
      ),
      auditFailRate: withContribution(
        metrics.auditFailRatePct,
        metrics.auditFailRatePct,
        SCORE_WEIGHTS.auditFailRate,
      ),
      productDiversity: withContribution(
        minMaxNormalize(metrics.productDiversity, diversityRange.min, diversityRange.max),
        metrics.productDiversity,
        SCORE_WEIGHTS.productDiversity,
      ),
    };

    const score = Math.round(Object.values(factors).reduce((sum, f) => sum + f.contribution, 0));

    const scoreFactors: BinScoreFactors = { weights: SCORE_WEIGHTS, factors, score, computedAt };

    return { binId: metrics.binId, score: clamp(score, 0, 100), scoreFactors };
  });
}

/** Recomputes and persists risk scores for every bin. */
export async function recomputeAllBinScores(
  db: Pick<Db, 'orm' | 'transaction'>,
): Promise<{ updatedBins: number; computedAt: string }> {
  const raw = await collectRawMetrics(db);
  const computedAt = new Date().toISOString();
  const scored = scoreBins(raw, computedAt);

  await db.transaction(async (tx) => {
    for (const bin of scored) {
      await tx.orm.public.Bin.where({ id: bin.binId }).update({
        riskScore: bin.score,
        // BinScoreFactors is plain JSON at runtime, just not structurally a JsonValue.
        scoreFactors: bin.scoreFactors as unknown as JsonValue,
        lastScoredAt: computedAt,
      });
    }
  });

  return { updatedBins: scored.length, computedAt };
}
