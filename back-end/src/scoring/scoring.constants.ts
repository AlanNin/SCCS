// Weights must sum to 1. Tune here to change how the risk score is composed.
export const SCORE_WEIGHTS = {
  daysSinceLastAudit: 0.3,
  movementFrequency: 0.25,
  adjustmentFrequency: 0.25,
  auditFailRate: 0.15,
  productDiversity: 0.05,
} as const;

// Days since last audit at which the staleness factor maxes out.
export const STALE_AUDIT_CAP_DAYS = 60;

// Activity window used for the movement / adjustment factors.
export const ACTIVITY_WINDOW_DAYS = 30;
