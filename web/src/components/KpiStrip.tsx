"use client";

import { useMemo } from "react";
import type { ChurnAnalysisReport } from "@/lib/types";
import { formatIdr, formatIdrCompact } from "./formatters";

interface KpiStripProps {
  report: ChurnAnalysisReport;
}

export function KpiStrip({ report }: KpiStripProps) {
  const avgRiskPct = useMemo(() => {
    if (report.customers.length === 0) return 0;
    const sum = report.customers.reduce((acc, c) => acc + c.churnProbability, 0);
    return sum / report.customers.length;
  }, [report.customers]);

  const revRiskPct =
    report.segments.totalMonthlyRevenueIdr > 0
      ? (report.segments.highRevenueAtRiskIdr /
          report.segments.totalMonthlyRevenueIdr) *
        100
      : 0;

  const topRiskPackage = useMemo(() => {
    const map = new Map<
      string,
      { label: string; total: number; high: number; highRev: number }
    >();
    for (const c of report.customers) {
      const key = (c.segmentLabel || "Lainnya").trim() || "Lainnya";
      const cur = map.get(key) ?? { label: key, total: 0, high: 0, highRev: 0 };
      cur.total += 1;
      if (c.riskSegment === "High") {
        cur.high += 1;
        cur.highRev += c.monthlyRevenueIdr || 0;
      }
      map.set(key, cur);
    }
    const list = Array.from(map.values())
      .filter((item) => item.total >= 5)
      .sort((a, b) => b.high / b.total - a.high / a.total);
    return list[0] ?? Array.from(map.values())[0] ?? null;
  }, [report.customers]);

  const topPkgRate =
    topRiskPackage && topRiskPackage.total > 0
      ? (topRiskPackage.high / topRiskPackage.total) * 100
      : 0;

  return (
    <section
      aria-label="Ringkasan Metrik Utama"
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {/* 1. Total Pelanggan */}
      <div className="rounded-xl border border-zinc-200/90 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium text-zinc-500">
            Total Pelanggan Dianalisis
          </span>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 tabular-nums">
            {report.durationMs} ms
          </span>
        </div>
        <div className="mt-2 tabular-nums text-[28px] font-bold leading-none tracking-tight text-zinc-950">
          {report.totalCustomers.toLocaleString("id-ID")}
        </div>
        <div className="mt-2.5 text-[12px] text-zinc-500 tabular-nums">
          Rata-rata skor risiko:{" "}
          <span className="font-semibold text-zinc-800">
            {avgRiskPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 2. Pendapatan Berisiko */}
      <div className="rounded-xl border border-zinc-200/90 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium text-zinc-500">
            Pendapatan Berisiko / Bulan
          </span>
          {report.schema.revenueColumn ? (
            <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 tabular-nums">
              {revRiskPct.toFixed(1)}% MRR
            </span>
          ) : null}
        </div>
        <div
          className="mt-2 tabular-nums text-[28px] font-bold leading-none tracking-tight text-rose-700"
          title={formatIdr(report.segments.highRevenueAtRiskIdr)}
        >
          {report.schema.revenueColumn
            ? formatIdrCompact(report.segments.highRevenueAtRiskIdr)
            : "—"}
        </div>
        <div className="mt-2.5 text-[12px] text-zinc-500 tabular-nums">
          {report.schema.revenueColumn
            ? `Dari total ${formatIdrCompact(report.segments.totalMonthlyRevenueIdr)} / bulan`
            : "Kolom tagihan bulanan tidak ditemukan"}
        </div>
      </div>

      {/* 3. Paket Paling Rentan */}
      <div className="rounded-xl border border-zinc-200/90 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium text-zinc-500">
            Paket Paling Rentan Churn
          </span>
          {topRiskPackage ? (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200/80 tabular-nums">
              {topPkgRate.toFixed(1)}% tinggi
            </span>
          ) : null}
        </div>
        <div className="mt-2 truncate text-[24px] font-bold leading-none tracking-tight text-zinc-950">
          {topRiskPackage ? topRiskPackage.label : "—"}
        </div>
        <div className="mt-2.5 text-[12px] text-zinc-500 tabular-nums">
          {topRiskPackage
            ? `${topRiskPackage.high.toLocaleString("id-ID")} dari ${topRiskPackage.total.toLocaleString("id-ID")} pelanggan berisiko tinggi`
            : "Data paket tidak tersedia"}
        </div>
      </div>
    </section>
  );
}
