import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv, toSafeCsv } from "../csv";
import { analyzeChurnDataset } from "../ml/pipeline";
import { inferSchema } from "../schema-mapper";

const DATASETS_DIR = path.resolve(process.cwd(), "public/datasets");

describe("CSV parser & safe formula-injection export (Review Focus #2)", () => {
  it("handles UTF-8 BOM, semicolon delimiter, and quoted commas cleanly", () => {
    const raw =
      '\uFEFFcustomer_id;customer_name;monthly_revenue_idr;churn\r\nC-1;"Budi, S.Kom";Rp 450.000;1\r\nC-2;Siti;Rp 200.000;0\r\n\r\n';
    const parsed = parseCsv(raw);
    expect(parsed.delimiter).toBe(";");
    expect(parsed.headers).toEqual([
      "customer_id",
      "customer_name",
      "monthly_revenue_idr",
      "churn",
    ]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].customer_name).toBe("Budi, S.Kom");
  });

  it("prefixes formula characters (=, +, -, @) on CSV export", () => {
    const csv = toSafeCsv(
      ["Customer", "Notes"],
      [
        ["=CMD|' /C calc'!A0", "+1234"],
        ["-negative", "@handle"],
        ["Normal, Name", 85],
      ],
    );
    expect(csv).toContain("'=CMD");
    expect(csv).toContain("'+1234");
    expect(csv).toContain("'-negative");
    expect(csv).toContain("'@handle");
    expect(csv).toContain('"Normal, Name",85');
  });
});

describe("Auto-Schema Mapper (Review Focus #3)", () => {
  it("detects ID, name, target churn, revenue, and excludes high-cardinality text columns", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      customer_id: `ID-${i + 1}`,
      customer_name: `Pelanggan ${i + 1}`,
      free_notes: `Catatan unik nomor ${i + 1} sangat panjang`,
      plan_tier: i % 2 === 0 ? "Pro" : "Starter",
      monthly_revenue_idr: String(250000 + i * 10000),
      support_tickets: String(i % 5),
      churn: i % 3 === 0 ? "1" : "0",
    }));
    const schema = inferSchema(Object.keys(rows[0]), rows);
    expect(schema.idColumn).toBe("customer_id");
    expect(schema.nameColumn).toBe("customer_name");
    expect(schema.targetColumn).toBe("churn");
    expect(schema.revenueColumn).toBe("monthly_revenue_idr");
    expect(schema.numericFeatures).toContain("support_tickets");
    expect(schema.categoricalFeatures).toContain("plan_tier");
    expect(schema.categoricalFeatures).not.toContain("free_notes");
    expect(schema.ignoredColumns).toContain("free_notes");
  });
});

describe("Deterministic ML Pipeline on 1,000-row Indonesian presets", () => {
  it("produces 100% deterministic scores and ROC-AUC >= 0.80 on both EdTech and Telco datasets", () => {
    for (const filename of [
      "edtech_saas_indonesia_1000.csv",
      "telco_isp_indonesia_1000.csv",
    ]) {
      const raw = fs.readFileSync(path.join(DATASETS_DIR, filename), "utf-8");
      const run1 = analyzeChurnDataset({ csvText: raw, datasetName: filename });
      const run2 = analyzeChurnDataset({ csvText: raw, datasetName: filename });

      expect(run1.mode).toBe("supervised");
      expect(run1.totalCustomers).toBe(1000);
      expect(run1.metrics).not.toBeNull();
      expect(run1.metrics!.rocAuc).toBeGreaterThanOrEqual(0.8);

      // 100% determinism across runs
      expect(run1.metrics).toEqual(run2.metrics);
      expect(run1.customers.slice(0, 20).map((c) => c.churnProbability)).toEqual(
        run2.customers.slice(0, 20).map((c) => c.churnProbability),
      );

      // Feature importance sums near 100% and customers carry 3 local drivers
      const totalImp = run1.featureImportance.reduce(
        (acc, f) => acc + f.importancePct,
        0,
      );
      expect(totalImp).toBeGreaterThanOrEqual(99);
      expect(totalImp).toBeLessThanOrEqual(101);
      expect(run1.customers[0].topDrivers).toHaveLength(3);
    }
  });

  it("handles unlabeled active-customer CSV gracefully in inference-only mode (Review Focus #1)", () => {
    const raw = fs.readFileSync(
      path.join(DATASETS_DIR, "edtech_saas_indonesia_1000.csv"),
      "utf-8",
    );
    const parsed = parseCsv(raw);
    const headersWithoutChurn = parsed.headers.filter((h) => h !== "churn");
    const unlabeledCsv = [
      headersWithoutChurn.join(","),
      ...parsed.rows
        .slice(0, 60)
        .map((r) => headersWithoutChurn.map((h) => r[h]).join(",")),
    ].join("\n");

    const report = analyzeChurnDataset({
      csvText: unlabeledCsv,
      datasetName: "active_customers.csv",
    });
    expect(report.mode).toBe("inference-only");
    expect(report.metrics).toBeNull();
    expect(report.totalCustomers).toBe(60);
    expect(report.customers[0].churnProbability).toBeGreaterThanOrEqual(0);
    expect(report.customers[0].churnProbability).toBeLessThanOrEqual(100);
  });

  it("handles constant feature columns (std === 0) without NaN and rejects single-class target cleanly (Review Focus #2 & #4)", () => {
    const singleClassRows = Array.from({ length: 40 }, (_, i) => [
      `C-${i}`,
      `User ${i}`,
      "100000",
      "5",
      "0",
    ]);
    const singleClassCsv = [
      "customer_id,customer_name,monthly_revenue_idr,constant_col,churn",
      ...singleClassRows.map((r) => r.join(",")),
    ].join("\n");

    expect(() =>
      analyzeChurnDataset({
        csvText: singleClassCsv,
        datasetName: "single_class.csv",
      }),
    ).toThrow(/satu kelas|semua baris/i);

    const mixedWithConstant = Array.from({ length: 50 }, (_, i) => [
      `C-${i}`,
      `User ${i}`,
      String(200000 + i * 5000),
      "5",
      String(i % 2 === 0 ? 15 : 1),
      String(i % 2 === 0 ? 1 : 0),
    ]);
    const constantCsv = [
      "customer_id,customer_name,monthly_revenue_idr,constant_col,last_login_days_ago,churn",
      ...mixedWithConstant.map((r) => r.join(",")),
    ].join("\n");

    const res = analyzeChurnDataset({
      csvText: constantCsv,
      datasetName: "constant_col.csv",
    });
    expect(Number.isFinite(res.metrics!.rocAuc)).toBe(true);
    expect(
      res.customers.every((c) => Number.isFinite(c.churnProbability)),
    ).toBe(true);
  });

  it("rejects extreme class imbalance (< 5 minority samples) and gives duplicate customer_ids unique rowKeys", () => {
    const imbalancedRows = Array.from({ length: 40 }, (_, i) => [
      "DUP-001",
      `User ${i}`,
      "200000",
      String(i < 2 ? 1 : 0),
    ]);
    const imbalancedCsv = [
      "customer_id,customer_name,monthly_revenue_idr,churn",
      ...imbalancedRows.map((r) => r.join(",")),
    ].join("\n");

    expect(() =>
      analyzeChurnDataset({
        csvText: imbalancedCsv,
        datasetName: "imbalanced.csv",
      }),
    ).toThrow(/terlalu tidak seimbang/i);

    const balancedDupIdRows = Array.from({ length: 40 }, (_, i) => [
      "DUP-001",
      `User ${i}`,
      "200000",
      String(i % 2 === 0 ? 10 : 1),
      String(i % 2 === 0 ? 1 : 0),
    ]);
    const dupIdCsv = [
      "customer_id,customer_name,monthly_revenue_idr,last_login_days_ago,churn",
      ...balancedDupIdRows.map((r) => r.join(",")),
    ].join("\n");
    const res = analyzeChurnDataset({
      csvText: dupIdCsv,
      datasetName: "dup_ids.csv",
    });
    const uniqueKeys = new Set(res.customers.map((c) => c.rowKey));
    expect(uniqueKeys.size).toBe(40);
  });
});
