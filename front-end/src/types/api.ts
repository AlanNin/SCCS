export type RiskBand = "low" | "medium" | "high";
export type AuditStatus = "PENDING" | "DONE";
export type AuditResult = "PASS" | "FAIL";

export interface BinSummary {
  id: number;
  code: string;
  riskScore: number;
  band: RiskBand;
  lastAuditedAt: string | null;
  lastScoredAt: string | null;
  rack: { id: number; code: string };
  aisle: { id: number; code: string };
  warehouse: { id: number; code: string; name: string };
}

export interface BinSearchResult {
  id: number;
  code: string;
  riskScore: number;
  band: RiskBand;
  lastAuditedAt: string | null;
  rack: { code: string };
  aisle: { code: string };
}

export interface ScoreFactorBreakdown {
  raw: number;
  normalized: number;
  weight: number;
  contribution: number;
}

export interface BinScoreFactors {
  weights: {
    daysSinceLastAudit: number;
    movementFrequency: number;
    adjustmentFrequency: number;
    auditFailRate: number;
    productDiversity: number;
  };
  factors: {
    daysSinceLastAudit: ScoreFactorBreakdown;
    movementFrequency: ScoreFactorBreakdown;
    adjustmentFrequency: ScoreFactorBreakdown;
    auditFailRate: ScoreFactorBreakdown;
    productDiversity: ScoreFactorBreakdown;
  };
  score: number;
  computedAt: string;
}

export interface PalletItemDetail {
  id: number;
  quantity: number;
  product: { id: number; sku: string; name: string };
}

export interface PalletDetail {
  id: number;
  code: string;
  items: PalletItemDetail[];
}

export interface BinDetail {
  id: number;
  code: string;
  riskScore: number;
  band: RiskBand;
  scoreFactors: BinScoreFactors | null;
  lastAuditedAt: string | null;
  lastScoredAt: string | null;
  rack: { id: number; code: string };
  aisle: { id: number; code: string };
  warehouse: { id: number; code: string; name: string };
  pallets: PalletDetail[];
}

export interface RecomputeResult {
  updatedBins: number;
  computedAt: string;
}

export interface AuditPlanSummary {
  id: number;
  name: string;
  topN: number;
  createdAt: string;
  taskCount: number;
  pendingCount: number;
  doneCount: number;
}

export interface AuditPlanTask {
  id: number;
  status: AuditStatus;
  riskScoreAtCreation: number;
  band: RiskBand;
  expectedQuantity: number | null;
  countedQuantity: number | null;
  result: AuditResult | null;
  completedAt: string | null;
  bin: { id: number; code: string };
}

export interface AuditPlanDetail {
  id: number;
  name: string;
  topN: number;
  createdAt: string;
  tasks: AuditPlanTask[];
}

export interface AuditTaskListItem {
  id: number;
  status: AuditStatus;
  riskScoreAtCreation: number;
  band: RiskBand;
  expectedQuantity: number | null;
  countedQuantity: number | null;
  result: AuditResult | null;
  completedAt: string | null;
  createdAt: string;
  bin: { id: number; code: string };
  plan: { id: number; name: string } | null;
}

export interface AuditTaskDetail {
  id: number;
  status: AuditStatus;
  riskScoreAtCreation: number;
  band: RiskBand;
  expectedQuantity: number | null;
  countedQuantity: number | null;
  result: AuditResult | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  plan: { id: number; name: string } | null;
  bin: {
    id: number;
    code: string;
    rack: { code: string };
    aisle: { code: string };
    pallets: PalletDetail[];
  };
}

export interface CreateAuditPlanInput {
  topN: number;
  name?: string;
}

export interface SubmitCountInput {
  countedQuantity: number;
  result: AuditResult;
  notes?: string;
}

/** Shape of the JSON body HttpExceptionFilter sends for every error response. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}
