export type RiskBand = 'low' | 'medium' | 'high';

// Heatmap thresholds: green (low) / yellow (medium) / red (high).
export function riskBand(score: number): RiskBand {
  if (score < 34) return 'low';
  if (score < 67) return 'medium';
  return 'high';
}
