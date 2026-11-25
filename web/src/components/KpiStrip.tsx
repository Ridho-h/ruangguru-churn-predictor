"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

  return (
    <section
      aria-label="Ringkasan Metrik Utama"
      className="border-b border-slate-200 bg-white"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <div className="px-4 py-4 sm:px-6">
          <div className="text-xs font-medium text-slate-600">
            Total Pelanggan Dianalisis
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tabular-nums text-2xl font-semibold text-slate-900">
              {report.totalCustomers.toLocaleString("id-ID")}
            </span>
            <span className="truncate text-xs text-slate-500">
              {report.datasetName}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Selesai dalam {report.durationMs} ms ·{" "}
            {report.schema.numericFeatures.length +
              report.schema.categoricalFeatures.length}{" "}
            fitur aktif
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <div className="text-xs font-medium text-slate-600">
            Pelanggan Risiko Tinggi (&ge; 70%)
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tabular-nums text-2xl font-semibold text-rose-700">
              {report.segments.highCount.toLocaleString("id-ID")}
            </span>
            <span className="tabular-nums rounded bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700">
              {highPct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Sedang: {report.segments.mediumCount.toLocaleString("id-ID")} ·
            Rendah: {report.segments.lowCount.toLocaleString("id-ID")}
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <div className="text-xs font-medium text-slate-600">
            Pendapatan Berisiko / Bulan
          </div>
          <div
            className="mt-1 tabular-nums text-2xl font-semibold text-slate-900"
            title={formatIdr(report.segments.highRevenueAtRiskIdr)}
          >
            {report.schema.revenueColumn
              ? formatIdrCompact(report.segments.highRevenueAtRiskIdr)
              : "Tidak terdeteksi"}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {report.schema.revenueColumn
              ? `Dari total ${formatIdrCompact(report.segments.totalMonthlyRevenueIdr)}/bln`
              : "Pilih kolom pendapatan di Pemetaan Kolom"}
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">
              Performa Model (Split 80/20)
            </span>
            {report.metrics && (
              <button
                type="button"
                aria-expanded={showMatrix}
                onClick={() => setShowMatrix((v) => !v)}
                className="inline-flex items-center gap-0.5 text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                Matrix
                {showMatrix ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
          {report.metrics ? (
            <>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="tabular-nums text-2xl font-semibold text-teal-800">
                  {report.metrics.rocAuc.toFixed(3)}
                </span>
                <span className="text-xs font-medium text-slate-600">
                  ROC-AUC
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                F1: {formatPct(report.metrics.f1Score)} · Precision:{" "}
                {formatPct(report.metrics.precision)} · Recall:{" "}
                {formatPct(report.metrics.recall)}
              </div>
            </>
          ) : (
            <>
              <div className="mt-1 text-base font-semibold text-amber-800">
                Mode Tanpa Label
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Skoring heuristik perilaku (tanpa kolom target churn)
              </div>
            </>
          )}
        </div>
      </div>

      {showMatrix && report.metrics && (
        <div className="border-t border-slate-200 bg-slate-50/80">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 text-xs sm:px-6">
            <div className="text-slate-700">
              <span className="font-semibold text-slate-900">
                Confusion Matrix Data Uji ({report.metrics.testSize} baris,
                threshold 50%):
              </span>{" "}
              Akurasi {formatPct(report.metrics.accuracy)} · Train{" "}
              {report.metrics.trainSize} baris
            </div>
            <div className="flex flex-wrap gap-2 tabular-nums">
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
                True Positive (Churn Tepat): {report.metrics.confusionMatrix.tp}
              </span>
              <span className="rounded border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                True Negative (Aktif Tepat): {report.metrics.confusionMatrix.tn}
              </span>
              <span className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
                False Positive: {report.metrics.confusionMatrix.fp}
              </span>
              <span className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1 font-medium text-rose-800">
                False Negative (Terlewat): {report.metrics.confusionMatrix.fn}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
