import { z } from "zod";

export type RiskSegment = "High" | "Medium" | "Low";
export type AnalysisMode = "supervised" | "inference-only";

export interface InferredSchema {
  allColumns: string[];
  idColumn: string | null;
  nameColumn: string | null;
  targetColumn: string | null;
  revenueColumn: string | null;
  segmentColumn: string | null;
  numericFeatures: string[];
  categoricalFeatures: string[];
  candidateFeatures: string[];
  ignoredColumns: string[];
}

export interface SchemaOverride {
  targetColumn?: string | null;
  revenueColumn?: string | null;
  selectedFeatures?: string[];
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface ModelMetrics {
  rocAuc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainSize: number;
  testSize: number;
  positiveRate: number;
  confusionMatrix: ConfusionMatrix;
}

export interface FeatureImportanceItem {
  feature: string;
  label: string;
  importancePct: number;
  direction: "increase" | "decrease";
  directionLabel: string;
}

export interface CustomerDriver {
  feature: string;
  label: string;
  value: string;
  contribution: number;
  direction: "increase" | "decrease";
}

export interface ScoredCustomer {
  rowKey: string;
  id: string;
  name: string;
  segmentLabel: string;
  monthlyRevenueIdr: number;
  churnProbability: number; // 0-100 integer
  riskSegment: RiskSegment;
  actualChurn: number | null;
  topDrivers: CustomerDriver[];
  rawFeatures: Record<string, string>;
}

export interface SegmentDistribution {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  highRevenueAtRiskIdr: number;
  mediumRevenueAtRiskIdr: number;
  totalMonthlyRevenueIdr: number;
}

export interface ChurnAnalysisReport {
  datasetName: string;
  mode: AnalysisMode;
  modeNotice: string | null;
  durationMs: number;
  totalCustomers: number;
  schema: InferredSchema;
  metrics: ModelMetrics | null;
  segments: SegmentDistribution;
  featureImportance: FeatureImportanceItem[];
  customers: ScoredCustomer[];
}

export interface PresetDatasetInfo {
  id: "edtech" | "telco";
  label: string;
  shortLabel: string;
  filename: string;
  description: string;
  rows: number;
}

export const SegmentPlaybookItemSchema = z.object({
  title: z.string().min(3),
  targetCondition: z.string().min(3),
  tactic: z.string().min(5),
  channel: z.string().min(2),
  successMetric: z.string().min(3),
});

export const SegmentRetentionPlanSchema = z.object({
  executiveSummary: z.string().min(10),
  estimatedSaveableRevenueIdr: z.number().nonnegative(),
  assumptionNote: z.string().min(5),
  playbooks: z.array(SegmentPlaybookItemSchema).min(2).max(5),
});

export type SegmentRetentionPlan = z.infer<typeof SegmentRetentionPlanSchema> & {
  modelUsed?: string;
};

export const CustomerRetentionPlanSchema = z.object({
  riskDiagnosis: z.string().min(10),
  recommendedAction: z.string().min(10),
  recommendedOffer: z.string().min(5),
  channel: z.string().min(2),
  outreachMessage: z.string().min(15),
});

export type CustomerRetentionPlan = z.infer<typeof CustomerRetentionPlanSchema> & {
  modelUsed?: string;
};

export function classifyRiskSegment(probabilityPct: number): RiskSegment {
  if (probabilityPct >= 70) return "High";
  if (probabilityPct >= 40) return "Medium";
  return "Low";
}
