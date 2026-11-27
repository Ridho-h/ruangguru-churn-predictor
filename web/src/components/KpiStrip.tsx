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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pelanggan */}
        <div className="surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              Total Pelanggan
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
              <Users className="h-3.5 w-3.5" strokeWidth={1.85} />
            </span>
          </div>
          <div className="mt-2.5 tabular-nums text-[26px] font-bold tracking-tight text-zinc-950">
            {report.totalCustomers.toLocaleString("id-ID")}
          </div>
          <div className="mt-1.5 text-xs text-stone-500 tabular-nums">
            Rendah {report.segments.lowCount.toLocaleString("id-ID")} · Sedang{" "}
            {report.segments.mediumCount.toLocaleString("id-ID")}
          </div>
        </div>

        {/* Risiko Tinggi */}
        <div className="surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              Risiko Tinggi (&ge; 70%)
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.85} />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="tabular-nums text-[26px] font-bold tracking-tight text-rose-700">
              {report.segments.highCount.toLocaleString("id-ID")}
            </span>
            <span className="tabular-nums rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700">
              {highPct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-rose-600"
              style={{ width: `${Math.min(100, Math.max(4, highPct))}%` }}
            />
          </div>
        </div>

        {/* Pendapatan Berisiko */}
        <div className="surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              Pendapatan Berisiko / Bln
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Banknote className="h-3.5 w-3.5" strokeWidth={1.85} />
            </span>
          </div>
          <div
            className="mt-2.5 tabular-nums text-[26px] font-bold tracking-tight text-zinc-950"
            title={formatIdr(report.segments.highRevenueAtRiskIdr)}
          >
            {report.schema.revenueColumn
              ? formatIdrCompact(report.segments.highRevenueAtRiskIdr)
              : "Tidak terdeteksi"}
          </div>
          {report.schema.revenueColumn ? (
            <div className="mt-1.5 text-xs text-stone-500 tabular-nums">
              {revRiskPct.toFixed(1)}% dari total{" "}
              {formatIdrCompact(report.segments.totalMonthlyRevenueIdr)}/bln
            </div>
          ) : (
            <div className="mt-1.5 text-xs text-stone-500">
              Kolom tagihan bulanan tidak ditemukan di CSV
            </div>
          )}
        </div>

        {/* Akurasi Model */}
        <div className="surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-stone-500">
              Akurasi Model
            </span>
            {report.metrics ? (
              <button
                type="button"
                aria-expanded={showMatrix}
                onClick={() => setShowMatrix((v) => !v)}
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
              >
                Detail
                {showMatrix ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Activity className="h-3.5 w-3.5" strokeWidth={1.85} />
              </span>
            )}
          </div>
          {report.metrics ? (
            <>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="tabular-nums text-[26px] font-bold tracking-tight text-emerald-800">
                  {report.metrics.rocAuc.toFixed(3)}
                </span>
                <span className="text-xs font-semibold text-stone-500">
                  ROC-AUC
                </span>
              </div>
              <div className="mt-1.5 text-xs text-stone-500 tabular-nums">
                F1 {formatPct(report.metrics.f1Score)} · Precision{" "}
                {formatPct(report.metrics.precision)} · Recall{" "}
                {formatPct(report.metrics.recall)}
              </div>
            </>
          ) : (
            <>
              <div className="mt-2.5 text-base font-bold text-amber-800">
                Tanpa Label Historis
              </div>
              <div className="mt-1.5 text-xs text-stone-500">
                Skor dihitung dari pola perilaku pelanggan
              </div>
            </>
          )}
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
