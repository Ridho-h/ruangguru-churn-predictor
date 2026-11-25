import { parseNumericValue } from "../csv";
import type { InferredSchema } from "../types";

export interface NumericStats {
  column: string;
  median: number;
  mean: number;
  std: number;
}

export interface CategoricalSpec {
  column: string;
  categories: string[];
}

export interface EncodedFeatureMeta {
  sourceColumn: string;
  kind: "numeric" | "categorical";
  categoryValue?: string;
}

export interface FittedPreprocessor {
  numericStats: NumericStats[];
  categoricalSpecs: CategoricalSpec[];
  featureMeta: EncodedFeatureMeta[];
}

const MAX_CATEGORIES_PER_COL = 8;

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function fitPreprocessor(
  rows: Record<string, string>[],
  schema: InferredSchema,
): FittedPreprocessor {
  const numericStats: NumericStats[] = [];
  const categoricalSpecs: CategoricalSpec[] = [];
  const featureMeta: EncodedFeatureMeta[] = [];

  for (const col of schema.numericFeatures) {
    const valid: number[] = [];
    for (const r of rows) {
      const n = parseNumericValue(r[col]);
      if (n !== null) valid.push(n);
    }
    const median = computeMedian(valid);
    const imputed = rows.map((r) => parseNumericValue(r[col]) ?? median);
    const mean =
      imputed.reduce((acc, v) => acc + v, 0) / Math.max(1, imputed.length);
    const variance =
      imputed.reduce((acc, v) => acc + (v - mean) ** 2, 0) /
      Math.max(1, imputed.length);
    const std = Math.sqrt(variance);

    numericStats.push({ column: col, median, mean, std });
    featureMeta.push({ sourceColumn: col, kind: "numeric" });
  }

  for (const col of schema.categoricalFeatures) {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const val = (r[col] ?? "").trim() || "Tidak Tercantum";
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    const sortedCats = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_CATEGORIES_PER_COL)
      .map(([cat]) => cat);

    categoricalSpecs.push({ column: col, categories: sortedCats });
    for (const cat of sortedCats) {
      featureMeta.push({
        sourceColumn: col,
        kind: "categorical",
        categoryValue: cat,
      });
    }
  }

  return { numericStats, categoricalSpecs, featureMeta };
}

export function transformRows(
  rows: Record<string, string>[],
  prep: FittedPreprocessor,
): number[][] {
  return rows.map((row) => {
    const vec: number[] = [];

    for (const stat of prep.numericStats) {
      const raw = parseNumericValue(row[stat.column]) ?? stat.median;
      const z = stat.std > 1e-12 ? (raw - stat.mean) / stat.std : 0;
      vec.push(Number.isFinite(z) ? z : 0);
    }

    for (const spec of prep.categoricalSpecs) {
      const val = (row[spec.column] ?? "").trim() || "Tidak Tercantum";
      for (const cat of spec.categories) {
        vec.push(val === cat ? 1 : 0);
      }
    }

    return vec;
  });
}
