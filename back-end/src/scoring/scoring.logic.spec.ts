import { describe, expect, it } from 'vitest';
import { SCORE_WEIGHTS, STALE_AUDIT_CAP_DAYS } from './scoring.constants.js';
import { scoreBins } from './scoring.logic.js';

describe('scoreBins', () => {
  it('gives the bin with the most activity/diversity/fail-rate the max score, and an inactive bin the min', () => {
    const [hot, cold] = scoreBins([
      {
        binId: 1,
        daysSinceLastAudit: STALE_AUDIT_CAP_DAYS,
        movementCount: 100,
        adjustmentCount: 50,
        productDiversity: 10,
        auditFailRatePct: 100,
      },
      {
        binId: 2,
        daysSinceLastAudit: 0,
        movementCount: 0,
        adjustmentCount: 0,
        productDiversity: 0,
        auditFailRatePct: 0,
      },
    ]);

    expect(hot!.score).toBe(100);
    expect(cold!.score).toBe(0);
  });

  it('normalizes a flat batch (every bin tied) to 0 on the min-max factors', () => {
    const raw = [1, 2, 3].map((binId) => ({
      binId,
      daysSinceLastAudit: 0,
      movementCount: 7,
      adjustmentCount: 7,
      productDiversity: 3,
      auditFailRatePct: 0,
    }));

    const scored = scoreBins(raw);

    for (const bin of scored) {
      expect(bin.scoreFactors.factors.movementFrequency.normalized).toBe(0);
      expect(bin.scoreFactors.factors.adjustmentFrequency.normalized).toBe(0);
      expect(bin.scoreFactors.factors.productDiversity.normalized).toBe(0);
      expect(bin.score).toBe(0);
    }
  });

  it('caps days-since-last-audit at 100% once it reaches the staleness cap', () => {
    const [bin] = scoreBins([
      {
        binId: 1,
        daysSinceLastAudit: STALE_AUDIT_CAP_DAYS * 3,
        movementCount: 0,
        adjustmentCount: 0,
        productDiversity: 0,
        auditFailRatePct: 0,
      },
    ]);

    expect(bin!.scoreFactors.factors.daysSinceLastAudit.normalized).toBe(100);
    expect(bin!.score).toBe(Math.round(SCORE_WEIGHTS.daysSinceLastAudit * 100));
  });

  it('passes audit fail rate straight through as both raw and normalized', () => {
    const [bin] = scoreBins([
      {
        binId: 1,
        daysSinceLastAudit: 0,
        movementCount: 0,
        adjustmentCount: 0,
        productDiversity: 0,
        auditFailRatePct: 40,
      },
    ]);

    expect(bin!.scoreFactors.factors.auditFailRate.raw).toBe(40);
    expect(bin!.scoreFactors.factors.auditFailRate.normalized).toBe(40);
    expect(bin!.scoreFactors.factors.auditFailRate.contribution).toBe(40 * SCORE_WEIGHTS.auditFailRate);
  });

  it('returns an empty array for an empty input', () => {
    expect(scoreBins([])).toEqual([]);
  });

  it('persists the configured weights and a computedAt timestamp on every bin', () => {
    const [bin] = scoreBins([
      {
        binId: 1,
        daysSinceLastAudit: 5,
        movementCount: 2,
        adjustmentCount: 1,
        productDiversity: 1,
        auditFailRatePct: 0,
      },
    ]);

    expect(bin!.scoreFactors.weights).toEqual(SCORE_WEIGHTS);
    expect(new Date(bin!.scoreFactors.computedAt).toString()).not.toBe('Invalid Date');
  });
});
