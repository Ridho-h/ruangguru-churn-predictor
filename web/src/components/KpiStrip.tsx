"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import type { ChurnAnalysisReport } from "@/lib/types";
import { formatIdr, formatIdrCompact, formatPct } from "./formatters";

interface KpiStripProps {
  report: ChurnAnalysisReport;
}

export function KpiStrip({ report }: KpiStripProps) {
  const [showMatrix, setShowMatrix] = useState(false);
  const highPct =
    report.totalCustomers > 0
      ? (report.segments.highCount / report.totalCustomers) * 100
      : 0;
  const revRiskPct =
    report.segments.totalMonthlyRevenueIdr > 0
      ? (report.segments.highRevenueAtRiskIdr /
          report.segments.totalMonthlyRevenueIdr) *
        100
      : 0;

  return (
    <section aria-label="Ringkasan Metrik Utama" className="space-y-3">
      {/* High-contrast Dark Executive Metrics Band */}
      <div className="executive-band overflow-hidden rounded-2xl text-white">
        <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {/* Total Pelanggan */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-300">
                Total Pelanggan
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-stone-200">
                <Users className="h-3.5 w-3.5" strokeWidth={1.85} />
              </span>
            </div>
            <div className="mt-3 tabular-nums text-[28px] font-bold tracking-tight text-white">
              {report.totalCustomers.toLocaleString("id-ID")}
            </div>
            <div className="mt-1.5 text-xs text-stone-400 tabular-nums">
              Rendah {report.segments.lowCount.toLocaleString("id-ID")} · Sedang{" "}
              {report.segments.mediumCount.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Risiko Tinggi */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-300">
                Risiko Tinggi (&ge; 70%)
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.85} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="tabular-nums text-[28px] font-bold tracking-tight text-rose-300">
                {report.segments.highCount.toLocaleString("id-ID")}
              </span>
              <span className="tabular-nums rounded-md border border-rose-400/30 bg-rose-500/20 px-1.5 py-0.5 text-xs font-semibold text-rose-200">
                {highPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-rose-400"
                style={{ width: `${Math.min(100, Math.max(4, highPct))}%` }}
              />
            </div>
          </div>

          {/* Pendapatan Berisiko */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-300">
                Pendapatan Berisiko / Bln
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
                <Banknote className="h-3.5 w-3.5" strokeWidth={1.85} />
              </span>
            </div>
            <div
              className="mt-3 tabular-nums text-[28px] font-bold tracking-tight text-white"
              title={formatIdr(report.segments.highRevenueAtRiskIdr)}
            >
              {report.schema.revenueColumn
                ? formatIdrCompact(report.segments.highRevenueAtRiskIdr)
                : "Tidak terdeteksi"}
            </div>
            {report.schema.revenueColumn ? (
              <div className="mt-1.5 text-xs text-stone-400 tabular-nums">
                {revRiskPct.toFixed(1)}% dari total{" "}
                {formatIdrCompact(report.segments.totalMonthlyRevenueIdr)}/bln
              </div>
            ) : (
              <div className="mt-1.5 text-xs text-stone-400">
                Kolom tagihan bulanan tidak ditemukan di CSV
              </div>
            )}
          </div>

          {/* Akurasi Model */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-stone-300">
                Akurasi Model
              </span>
              {report.metrics ? (
                <button
                  type="button"
                  aria-expanded={showMatrix}
                  onClick={() => setShowMatrix((v) => !v)}
                  className="inline-flex items-center gap-0.5 rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-white/15"
                >
                  Detail
                  {showMatrix ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-300">
                  <Activity className="h-3.5 w-3.5" strokeWidth={1.85} />
                </span>
              )}
            </div>
            {report.metrics ? (
              <>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="tabular-nums text-[28px] font-bold tracking-tight text-emerald-300">
                    {report.metrics.rocAuc.toFixed(3)}
                  </span>
                  <span className="text-xs font-semibold text-stone-400">
                    ROC-AUC
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-stone-400 tabular-nums">
                  F1 {formatPct(report.metrics.f1Score)} · Precision{" "}
                  {formatPct(report.metrics.precision)} · Recall{" "}
                  {formatPct(report.metrics.recall)}
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 text-base font-bold text-amber-300">
                  Tanpa Label Historis
                </div>
                <div className="mt-1.5 text-xs text-stone-400">
                  Skor dihitung dari pola perilaku pelanggan
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showMatrix && report.metrics && (
        <div className="surface-card rounded-xl px-5 py-3.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-stone-600">
              <span className="font-semibold text-zinc-900">
                Uji validasi ({report.metrics.testSize} data uji,{" "}
                {report.metrics.trainSize} data latih):
              </span>{" "}
              Akurasi {formatPct(report.metrics.accuracy)}
            </div>
            <div className="flex flex-wrap gap-2 tabular-nums">
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                Churn Tepat: {report.metrics.confusionMatrix.tp}
              </span>
              <span className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 font-semibold text-stone-700">
                Aktif Tepat: {report.metrics.confusionMatrix.tn}
              </span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                False Positive: {report.metrics.confusionMatrix.fp}
              </span>
              <span className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-800">
                Terlewat: {report.metrics.confusionMatrix.fn}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
