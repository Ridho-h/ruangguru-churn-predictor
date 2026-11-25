import { parseBinaryChurn, parseNumericValue } from "./csv";
import type { InferredSchema, SchemaOverride } from "./types";

const ID_PATTERNS = [/^(customer_?id|user_?id|client_?id|account_?id|id|kode_?pelanggan)$/i];
const NAME_PATTERNS = [/^(customer_?name|user_?name|full_?name|nama(_?pelanggan)?|name)$/i];
const TARGET_PATTERNS = [/^(churn|is_?churn|churned|attrition|exited|status_?churn|berhenti)$/i];
const REVENUE_PATTERNS = [/(mrr|revenue|monthly_?bill|monthly_?charge|tagihan|pendapatan|spend|arpu|bill_?idr)/i];
const SEGMENT_PATTERNS = [/(plan|tier|package|paket|segment|contract|kontrak)/i];

const FEATURE_LABELS: Record<string, string> = {
  plan_tier: "Paket Langganan",
  package_name: "Paket Internet",
  tenure_months: "Lama Berlangganan (Bulan)",
  monthly_revenue_idr: "Pendapatan Bulanan (IDR)",
  monthly_bill_idr: "Tagihan Bulanan (IDR)",
  weekly_active_sessions: "Sesi Aktif / Minggu",
  last_login_days_ago: "Hari Sejak Login Terakhir",
  support_tickets_30d: "Tiket Support (30 Hari)",
  payment_delays_90d: "Keterlambatan Bayar (90 Hari)",
  late_payments_90d: "Telat Bayar (90 Hari)",
  nps_score: "Skor Kepuasan (NPS)",
  contract_type: "Tipe Kontrak",
  avg_usage_gb: "Pemakaian Rata-Rata (GB)",
  outage_incidents_30d: "Gangguan Jaringan (30 Hari)",
  cs_complaints_30d: "Komplain CS (30 Hari)",
  auto_debit: "Auto-Debit",
};

export function formatFeatureLabel(col: string): string {
  const key = col.trim().toLowerCase();
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
  return col
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function inferSchema(
  headers: string[],
  rows: Record<string, string>[],
): InferredSchema {
  const sample = rows.slice(0, 300);

  let idColumn: string | null = null;
  let nameColumn: string | null = null;
  let targetColumn: string | null = null;
  let revenueColumn: string | null = null;
  let segmentColumn: string | null = null;

  for (const h of headers) {
    if (!idColumn && ID_PATTERNS.some((p) => p.test(h))) idColumn = h;
    if (!nameColumn && NAME_PATTERNS.some((p) => p.test(h))) nameColumn = h;
    if (!targetColumn && TARGET_PATTERNS.some((p) => p.test(h))) {
      const parsed = sample
        .map((r) => parseBinaryChurn(r[h]))
        .filter((v) => v !== null);
      if (parsed.length >= Math.max(1, Math.floor(sample.length * 0.7))) {
        targetColumn = h;
      }
    }
    if (!revenueColumn && REVENUE_PATTERNS.some((p) => p.test(h))) {
      const nums = sample
        .map((r) => parseNumericValue(r[h]))
        .filter((v) => v !== null);
      if (nums.length >= Math.max(1, Math.floor(sample.length * 0.7))) {
        revenueColumn = h;
      }
    }
    if (!segmentColumn && SEGMENT_PATTERNS.some((p) => p.test(h))) {
      segmentColumn = h;
    }
  }

  const excluded = new Set(
    [idColumn, nameColumn, targetColumn].filter((v): v is string => Boolean(v)),
  );

  const numericFeatures: string[] = [];
  const categoricalFeatures: string[] = [];
  const ignoredColumns: string[] = [];

  for (const h of headers) {
    if (excluded.has(h)) continue;
    const nonEmpty = sample.map((r) => (r[h] ?? "").trim()).filter(Boolean);
    if (nonEmpty.length === 0) {
      ignoredColumns.push(h);
      continue;
    }

    const numericHits = nonEmpty.filter((v) => parseNumericValue(v) !== null).length;
    if (numericHits / nonEmpty.length >= 0.85) {
      numericFeatures.push(h);
    } else {
      const uniqueVals = new Set(nonEmpty.map((v) => v.toLowerCase()));
      if (uniqueVals.size >= 2 && uniqueVals.size <= 12) {
        categoricalFeatures.push(h);
      } else {
        ignoredColumns.push(h);
      }
    }
  }

  return {
    allColumns: headers,
    idColumn,
    nameColumn,
    targetColumn,
    revenueColumn,
    segmentColumn,
    numericFeatures,
    categoricalFeatures,
    candidateFeatures: [...numericFeatures, ...categoricalFeatures],
    ignoredColumns,
  };
}

export function applySchemaOverride(
  inferred: InferredSchema,
  override?: SchemaOverride,
): InferredSchema {
  if (!override) return inferred;

  const targetColumn =
    override.targetColumn !== undefined ? override.targetColumn : inferred.targetColumn;
  const revenueColumn =
    override.revenueColumn !== undefined ? override.revenueColumn : inferred.revenueColumn;

  const allFeatureCandidates = new Set(inferred.candidateFeatures);

  let numericFeatures = inferred.numericFeatures.filter((c) => c !== targetColumn);
  let categoricalFeatures = inferred.categoricalFeatures.filter((c) => c !== targetColumn);

  if (override.selectedFeatures && override.selectedFeatures.length > 0) {
    const selected = new Set(override.selectedFeatures);
    numericFeatures = numericFeatures.filter((c) => selected.has(c));
    categoricalFeatures = categoricalFeatures.filter((c) => selected.has(c));
  }

  const activeSet = new Set([...numericFeatures, ...categoricalFeatures]);
  const ignoredColumns = [...inferred.ignoredColumns];
  for (const cand of allFeatureCandidates) {
    if (cand !== targetColumn && !activeSet.has(cand) && !ignoredColumns.includes(cand)) {
      ignoredColumns.push(cand);
    }
  }

  return {
    ...inferred,
    targetColumn,
    revenueColumn,
    numericFeatures,
    categoricalFeatures,
    candidateFeatures: inferred.candidateFeatures.filter((c) => c !== targetColumn),
    ignoredColumns,
  };
}
