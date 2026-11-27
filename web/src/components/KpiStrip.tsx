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
      className="overflow-hidden rounded-xl border border-stone-200 bg-white"
    >
      <div className="grid grid-cols-1 divide-y divide-stone-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-stone-500">
            Total Pelanggan
          </div>
          <div className="mt-1.5 tabular-nums text-2xl font-semibold tracking-tight text-stone-950">
            {report.totalCustomers.toLocaleString("id-ID")}
          </div>
          <div className="mt-1 text-xs text-stone-500 tabular-nums">
            Diproses dalam {report.durationMs} ms
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-xs font-medium text-stone-500">
            Risiko Tinggi (&ge; 70%)
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="tabular-nums text-2xl font-semibold tracking-tight text-rose-700">
              {report.segments.highCount.toLocaleString("id-ID")}
            </span>
            <span className="tabular-nums rounded bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700">
              {highPct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 text-xs text-stone-500 tabular-nums">
            Sedang {report.segments.mediumCount.toLocaleString("id-ID")} ·
            Rendah {report.segments.lowCount.toLocaleString("id-ID")}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-xs font-medium text-stone-500">
            Pendapatan Berisiko / Bln
          </div>
          <div
            className="mt-1.5 tabular-nums text-2xl font-semibold tracking-tight text-stone-950"
            title={formatIdr(report.segments.highRevenueAtRiskIdr)}
          >
            {report.schema.revenueColumn
              ? formatIdrCompact(report.segments.highRevenueAtRiskIdr)
              : "Tidak terdeteksi"}
          </div>
          <div className="mt-1 text-xs text-stone-500 tabular-nums">
            {report.schema.revenueColumn
              ? `Dari ${formatIdrCompact(report.segments.totalMonthlyRevenueIdr)}/bln`
              : "Atur kolom pendapatan di Ubah Kolom"}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-stone-500">
              Akurasi Model
            </span>
            {report.metrics && (
              <button
                type="button"
                aria-expanded={showMatrix}
                onClick={() => setShowMatrix((v) => !v)}
                className="inline-flex items-center gap-0.5 text-xs font-medium text-stone-600 hover:text-stone-950"
              >
                Detail
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
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="tabular-nums text-2xl font-semibold tracking-tight text-stone-950">
                  {report.metrics.rocAuc.toFixed(3)}
                </span>
                <span className="text-xs font-medium text-stone-500">
                  ROC-AUC
                </span>
              </div>
              <div className="mt-1 text-xs text-stone-500 tabular-nums">
                F1 {formatPct(report.metrics.f1Score)} · Precision{" "}
                {formatPct(report.metrics.precision)} · Recall{" "}
                {formatPct(report.metrics.recall)}
              </div>
            </>
          ) : (
            <>
              <div className="mt-1.5 text-base font-semibold text-amber-800">
                Tanpa Label Historis
              </div>
              <div className="mt-1 text-xs text-stone-500">
                Skor dihitung dari pola perilaku pelanggan
              </div>
            </>
          )}
        </div>
      </div>

      {showMatrix && report.metrics && (
        <div className="border-t border-stone-200 bg-stone-50/80 px-5 py-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-stone-600">
              <span className="font-medium text-stone-900">
                Uji validasi ({report.metrics.testSize} data uji,{" "}
                {report.metrics.trainSize} data latih):
              </span>{" "}
              Akurasi {formatPct(report.metrics.accuracy)}
            </div>
            <div className="flex flex-wrap gap-2 tabular-nums">
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                Churn Tepat: {report.metrics.confusionMatrix.tp}
              </span>
              <span className="rounded border border-stone-200 bg-white px-2 py-0.5 font-medium text-stone-700">
                Aktif Tepat: {report.metrics.confusionMatrix.tn}
              </span>
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                False Positive: {report.metrics.confusionMatrix.fp}
              </span>
              <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-800">
                Terlewat: {report.metrics.confusionMatrix.fn}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
