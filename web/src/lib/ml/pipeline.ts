import { parseBinaryChurn, parseCsv, parseNumericValue } from "../csv";
import {
  applySchemaOverride,
  formatFeatureLabel,
  inferSchema,
} from "../schema-mapper";
import {
  classifyRiskSegment,
  type ChurnAnalysisReport,
  type CustomerDriver,
  type FeatureImportanceItem,
  type InferredSchema,
  type ModelMetrics,
  type SchemaOverride,
  type ScoredCustomer,
  type SegmentDistribution,
} from "../types";
import {
  predictProba,
  sigmoid,
  trainLogisticRegression,
  type LogisticModel,
} from "./logistic";
import { computeClassificationMetrics, stratifiedSplit } from "./metrics";
import {
  fitPreprocessor,
  transformRows,
  type FittedPreprocessor,
} from "./preprocess";

export const MAX_ANALYSIS_ROWS = 5_000;
export const MIN_SUPERVISED_ROWS = 30;
export const MIN_CLASS_SAMPLES = 5;

export interface AnalyzeInput {
  csvText: string;
  datasetName: string;
  schemaOverride?: SchemaOverride;
  referenceCsvText?: string;
}

const POSITIVE_NUM_HINTS =
  /(delay|late|ticket|complaint|komplain|outage|gangguan|days_ago|inactive|telat|cancel)/i;
const NEGATIVE_NUM_HINTS =
  /(tenure|lama|session|active|usage|nps|satisfaction|puas)/i;
const NEUTRAL_REVENUE_HINTS = /(revenue|bill|mrr|tagihan|charge|arpu)/i;

function buildHeuristicModel(prep: FittedPreprocessor): LogisticModel {
  const weights = prep.featureMeta.map((meta) => {
    if (meta.kind === "categorical") {
      const val = (meta.categoryValue ?? "").toLowerCase();
      const col = meta.sourceColumn.toLowerCase();
      if (col.includes("auto_debit")) {
        return val === "ya" || val === "yes" || val === "true" ? -0.5 : 0.55;
      }
      if (/(bulanan|monthly|starter|tidak|no)/i.test(val)) return 0.65;
      if (/(tahunan|annual|24 bulan|12 bulan|enterprise|ya|yes)/i.test(val)) {
        return -0.55;
      }
      return 0;
    }
    if (NEUTRAL_REVENUE_HINTS.test(meta.sourceColumn)) return 0;
    if (POSITIVE_NUM_HINTS.test(meta.sourceColumn)) return 0.75;
    if (NEGATIVE_NUM_HINTS.test(meta.sourceColumn)) return -0.55;
    return 0.08;
  });
  return { weights, bias: -0.45 };
}

function computeGlobalFeatureImportance(
  prep: FittedPreprocessor,
  model: LogisticModel,
): FeatureImportanceItem[] {
  // Use max-magnitude per original column so multi-category one-hot columns
  // neither inflate importance nor cancel opposite-sign dummies to zero.
  const grouped = new Map<string, { maxAbs: number; dominantSigned: number }>();

  for (let j = 0; j < prep.featureMeta.length; j += 1) {
    const meta = prep.featureMeta[j];
    const w = model.weights[j] ?? 0;
    const absW = Math.abs(w);
    const prev = grouped.get(meta.sourceColumn);
    if (!prev || absW > prev.maxAbs) {
      grouped.set(meta.sourceColumn, { maxAbs: absW, dominantSigned: w });
    }
  }

  const totalAbs =
    Array.from(grouped.values()).reduce((acc, v) => acc + v.maxAbs, 0) || 1;

  return Array.from(grouped.entries())
    .map(([feature, stats]) => {
      const direction: "increase" | "decrease" =
        stats.dominantSigned >= 0 ? "increase" : "decrease";
      return {
        feature,
        label: formatFeatureLabel(feature),
        importancePct: Number(((stats.maxAbs / totalAbs) * 100).toFixed(1)),
        direction,
        directionLabel:
          direction === "increase" ? "Meningkatkan Risiko" : "Menurunkan Risiko",
      };
    })
    .sort((a, b) => b.importancePct - a.importancePct);
}

function computeLocalDrivers(
  row: Record<string, string>,
  vec: number[],
  prep: FittedPreprocessor,
  model: LogisticModel,
): CustomerDriver[] {
  const grouped = new Map<string, number>();

  for (let j = 0; j < prep.featureMeta.length; j += 1) {
    const meta = prep.featureMeta[j];
    const contrib = (model.weights[j] ?? 0) * (vec[j] ?? 0);
    grouped.set(meta.sourceColumn, (grouped.get(meta.sourceColumn) ?? 0) + contrib);
  }

  return Array.from(grouped.entries())
    .map(([feature, contribution]) => ({
      feature,
      label: formatFeatureLabel(feature),
      value: (row[feature] ?? "").trim() || "-",
      contribution: Number(contribution.toFixed(3)),
      direction: (contribution >= 0 ? "increase" : "decrease") as
        | "increase"
        | "decrease",
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);
}

function buildScoredCustomers(
  rows: Record<string, string>[],
  X: number[][],
  probs: number[],
  actualLabels: Array<number | null>,
  schema: InferredSchema,
  prep: FittedPreprocessor,
  model: LogisticModel,
): { customers: ScoredCustomer[]; segments: SegmentDistribution } {
  const segments: SegmentDistribution = {
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    highRevenueAtRiskIdr: 0,
    mediumRevenueAtRiskIdr: 0,
    totalMonthlyRevenueIdr: 0,
  };

  const customers: ScoredCustomer[] = rows.map((row, idx) => {
    const probPct = Math.max(0, Math.min(100, Math.round((probs[idx] ?? 0) * 100)));
    const riskSegment = classifyRiskSegment(probPct);
    const revenue = schema.revenueColumn
      ? Math.max(0, Math.round(parseNumericValue(row[schema.revenueColumn]) ?? 0))
      : 0;

    segments.totalMonthlyRevenueIdr += revenue;
    if (riskSegment === "High") {
      segments.highCount += 1;
      segments.highRevenueAtRiskIdr += revenue;
    } else if (riskSegment === "Medium") {
      segments.mediumCount += 1;
      segments.mediumRevenueAtRiskIdr += revenue;
    } else {
      segments.lowCount += 1;
    }

    const id =
      schema.idColumn && row[schema.idColumn]
        ? row[schema.idColumn]
        : `CUST-${String(idx + 1).padStart(4, "0")}`;
    const name =
      schema.nameColumn && row[schema.nameColumn] ? row[schema.nameColumn] : id;
    const segmentLabel =
      schema.segmentColumn && row[schema.segmentColumn]
        ? row[schema.segmentColumn]
        : "-";

    const rawFeatures: Record<string, string> = {};
    for (const col of [...schema.numericFeatures, ...schema.categoricalFeatures]) {
      rawFeatures[col] = row[col] ?? "-";
    }

    return {
      rowKey: `${id}#${idx}`,
      id,
      name,
      segmentLabel,
      monthlyRevenueIdr: revenue,
      churnProbability: probPct,
      riskSegment,
      actualChurn: actualLabels[idx] ?? null,
      topDrivers: computeLocalDrivers(row, X[idx], prep, model),
      rawFeatures,
    };
  });

  customers.sort((a, b) => {
    if (b.churnProbability !== a.churnProbability) {
      return b.churnProbability - a.churnProbability;
    }
    if (b.monthlyRevenueIdr !== a.monthlyRevenueIdr) {
      return b.monthlyRevenueIdr - a.monthlyRevenueIdr;
    }
    return a.rowKey.localeCompare(b.rowKey);
  });

  return { customers, segments };
}

export function analyzeChurnDataset(input: AnalyzeInput): ChurnAnalysisReport {
  const startedAt = Date.now();
  const parsed = parseCsv(input.csvText);

  if (parsed.rows.length > MAX_ANALYSIS_ROWS) {
    throw new Error(
      `Jumlah baris melebihi batas maksimum (${MAX_ANALYSIS_ROWS.toLocaleString("id-ID")} baris). Potong dataset Anda lalu unggah ulang.`,
    );
  }

  const inferred = inferSchema(parsed.headers, parsed.rows);
  const schema = applySchemaOverride(inferred, input.schemaOverride);

  if (schema.numericFeatures.length + schema.categoricalFeatures.length === 0) {
    throw new Error(
      "Tidak ada kolom fitur numerik atau kategorikal yang valid untuk dianalisis. Periksa isi CSV Anda.",
    );
  }

  // Supervised path when target column is present
  if (schema.targetColumn) {
    const validRows: Record<string, string>[] = [];
    const labels: number[] = [];

    for (const row of parsed.rows) {
      const y = parseBinaryChurn(row[schema.targetColumn]);
      if (y !== null) {
        validRows.push(row);
        labels.push(y);
      }
    }

    if (validRows.length < MIN_SUPERVISED_ROWS) {
      throw new Error(
        `Dataset berlabel memerlukan minimal ${MIN_SUPERVISED_ROWS} baris valid untuk pelatihan model (ditemukan ${validRows.length} baris).`,
      );
    }

    const posCount = labels.filter((v) => v === 1).length;
    const negCount = labels.length - posCount;
    if (posCount === 0 || negCount === 0) {
      throw new Error(
        `Kolom target "${schema.targetColumn}" hanya memiliki satu kelas (semua baris bernilai ${posCount === 0 ? "0 / tidak churn" : "1 / churn"}). Model membutuhkan kedua kelas untuk dilatih.`,
      );
    }
    if (posCount < MIN_CLASS_SAMPLES || negCount < MIN_CLASS_SAMPLES) {
      throw new Error(
        `Kolom target "${schema.targetColumn}" terlalu tidak seimbang (churn=${posCount}, aktif=${negCount}). Dibutuhkan minimal ${MIN_CLASS_SAMPLES} baris pada masing-masing kelas untuk evaluasi split 80/20.`,
      );
    }

    const { trainIdx, testIdx } = stratifiedSplit(labels, 5);
    const trainRows = trainIdx.map((i) => validRows[i]);
    const testRows = testIdx.map((i) => validRows[i]);
    const yTrain = trainIdx.map((i) => labels[i]);
    const yTest = testIdx.map((i) => labels[i]);

    const evalPrep = fitPreprocessor(trainRows, schema);
    const XTrain = transformRows(trainRows, evalPrep);
    const XTest = transformRows(testRows, evalPrep);
    const evalModel = trainLogisticRegression(XTrain, yTrain);
    const testProbs = predictProba(XTest, evalModel);
    const metrics: ModelMetrics = computeClassificationMetrics(
      yTest,
      testProbs,
      trainRows.length,
    );

    const fullPrep = fitPreprocessor(validRows, schema);
    const XFull = transformRows(validRows, fullPrep);
    const fullModel = trainLogisticRegression(XFull, labels);
    const fullProbs = predictProba(XFull, fullModel);

    const featureImportance = computeGlobalFeatureImportance(fullPrep, fullModel);
    const { customers, segments } = buildScoredCustomers(
      validRows,
      XFull,
      fullProbs,
      labels,
      schema,
      fullPrep,
      fullModel,
    );

    return {
      datasetName: input.datasetName,
      mode: "supervised",
      modeNotice: null,
      durationMs: Math.max(1, Date.now() - startedAt),
      totalCustomers: validRows.length,
      schema,
      metrics,
      segments,
      featureImportance,
      customers,
    };
  }

  // Inference-only path: use matching reference preset model if provided
  if (input.referenceCsvText) {
    const refParsed = parseCsv(input.referenceCsvText);
    const refSchema = inferSchema(refParsed.headers, refParsed.rows);
    if (refSchema.targetColumn) {
      const refRows: Record<string, string>[] = [];
      const refLabels: number[] = [];
      for (const r of refParsed.rows) {
        const y = parseBinaryChurn(r[refSchema.targetColumn]);
        if (y !== null) {
          refRows.push(r);
          refLabels.push(y);
        }
      }
      const refPrep = fitPreprocessor(refRows, schema);
      const XRef = transformRows(refRows, refPrep);
      const refModel = trainLogisticRegression(XRef, refLabels);
      const XIncoming = transformRows(parsed.rows, refPrep);
      const probs = predictProba(XIncoming, refModel);
      const featureImportance = computeGlobalFeatureImportance(refPrep, refModel);
      const { customers, segments } = buildScoredCustomers(
        parsed.rows,
        XIncoming,
        probs,
        parsed.rows.map(() => null),
        schema,
        refPrep,
        refModel,
      );

      return {
        datasetName: input.datasetName,
        mode: "inference-only",
        modeNotice:
          "Mode Prediksi Tanpa Label Historis: skema CSV cocok dengan dataset referensi bawaan sehingga skor diprediksi menggunakan model Logistic Regression terlatih.",
        durationMs: Math.max(1, Date.now() - startedAt),
        totalCustomers: parsed.rows.length,
        schema,
        metrics: null,
        segments,
        featureImportance,
        customers,
      };
    }
  }

  // Fallback heuristic scoring for novel unlabeled CSV schemas
  const prep = fitPreprocessor(parsed.rows, schema);
  const X = transformRows(parsed.rows, prep);
  const heuristicModel = buildHeuristicModel(prep);
  const probs = X.map((row) => {
    let z = heuristicModel.bias;
    for (let j = 0; j < heuristicModel.weights.length; j += 1) {
      z += heuristicModel.weights[j] * (row[j] ?? 0);
    }
    return sigmoid(z);
  });

  const featureImportance = computeGlobalFeatureImportance(prep, heuristicModel);
  const { customers, segments } = buildScoredCustomers(
    parsed.rows,
    X,
    probs,
    parsed.rows.map(() => null),
    schema,
    prep,
    heuristicModel,
  );

  return {
    datasetName: input.datasetName,
    mode: "inference-only",
    modeNotice:
      "Mode Prediksi Tanpa Label Historis: CSV tidak memiliki kolom target churn, sehingga skor dihitung menggunakan pembobotan fitur perilaku dan metrik ROC-AUC tidak ditampilkan.",
    durationMs: Math.max(1, Date.now() - startedAt),
    totalCustomers: parsed.rows.length,
    schema,
    metrics: null,
    segments,
    featureImportance,
    customers,
  };
}
