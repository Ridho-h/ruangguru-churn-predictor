"use client";

import { Loader2, Sparkles } from "lucide-react";
import type {
  ChurnAnalysisReport,
  RiskSegment,
  SegmentRetentionPlan,
} from "@/lib/types";
import { formatIdr, formatIdrCompact } from "./formatters";

interface InsightPanelsProps {
  report: ChurnAnalysisReport;
  activeSegmentFilter: RiskSegment | "All";
  onSelectSegmentFilter: (seg: RiskSegment | "All") => void;
  segmentPlan: SegmentRetentionPlan | null;
  segmentPlanLoading: boolean;
  segmentPlanError: string | null;
  onGenerateSegmentPlan: () => void;
}

export function InsightPanels({
  report,
  activeSegmentFilter,
  onSelectSegmentFilter,
  segmentPlan,
  segmentPlanLoading,
  segmentPlanError,
  onGenerateSegmentPlan,
}: InsightPanelsProps) {
  const topFeatures = report.featureImportance.slice(0, 6);
  const maxImp = Math.max(1, ...topFeatures.map((f) => f.importancePct));
  const total = Math.max(1, report.totalCustomers);

  const segRows: Array<{
    key: RiskSegment;
    label: string;
    range: string;
    count: number;
    barClass: string;
    badgeClass: string;
  }> = [
    {
      key: "High",
      label: "Risiko Tinggi",
      range: ">= 70%",
      count: report.segments.highCount,
      barClass: "bg-rose-600",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    },
    {
      key: "Medium",
      label: "Risiko Sedang",
      range: "40% - 69%",
      count: report.segments.mediumCount,
      barClass: "bg-amber-500",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    },
    {
      key: "Low",
      label: "Risiko Rendah",
      range: "< 40%",
      count: report.segments.lowCount,
      barClass: "bg-emerald-600",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Global Feature Importance */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Faktor Utama Penyebab Churn (Feature Importance)
          </h2>
          <span className="text-xs text-slate-500">
            Bobot terstandardisasi
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {topFeatures.map((feat) => {
            const widthPct = Math.max(4, (feat.importancePct / maxImp) * 100);
            const isIncrease = feat.direction === "increase";
            return (
              <div key={feat.feature}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800">
                    {feat.label}
                  </span>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span
                      className={
                        isIncrease ? "text-rose-700" : "text-teal-700"
                      }
                    >
                      {feat.directionLabel}
                    </span>
                    <span className="w-11 text-right font-semibold text-slate-900">
                      {feat.importancePct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      isIncrease ? "bg-rose-600" : "bg-teal-600"
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Segment Distribution & AI Segment Strategy */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 lg:col-span-6">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Distribusi Segmen Risiko &amp; Rencana Retensi AI
            </h2>
            {activeSegmentFilter !== "All" && (
              <button
                type="button"
                onClick={() => onSelectSegmentFilter("All")}
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                Reset filter
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Klik segmen di bawah untuk memfilter daftar prioritas pelanggan.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {segRows.map((s) => {
              const pct = (s.count / total) * 100;
              const isSelected = activeSegmentFilter === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    onSelectSegmentFilter(isSelected ? "All" : s.key)
                  }
                  className={`rounded-md border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 ${
                    isSelected
                      ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-700">
                      {s.label}
                    </span>
                    <span className="tabular-nums text-[11px] text-slate-500">
                      {s.range}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between tabular-nums">
                    <span className="text-xl font-semibold text-slate-900">
                      {s.count.toLocaleString("id-ID")}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${s.badgeClass}`}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${s.barClass}`}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Susun 3 playbook retensi prioritas untuk menyelamatkan{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {report.segments.highCount.toLocaleString("id-ID")} pelanggan
                risiko tinggi
              </span>
              .
            </div>
            <button
              type="button"
              disabled={segmentPlanLoading}
              onClick={onGenerateSegmentPlan}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:opacity-60"
            >
              {segmentPlanLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {segmentPlanLoading
                ? "Menyusun Strategi AI..."
                : "Susun Strategi Retensi Segmen (AI)"}
            </button>
          </div>

          {segmentPlanError && (
            <div
              role="alert"
              className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              {segmentPlanError}
            </div>
          )}
        </div>
      </div>

      {/* Rendered Segment AI Playbook */}
      {segmentPlan && (
        <div className="rounded-lg border border-teal-200 bg-white p-5 lg:col-span-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Rencana Retensi Segmen Risiko Tinggi (Gemini AI)
              </h3>
              <p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-700">
                {segmentPlan.executiveSummary}
              </p>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-[11px] font-medium text-slate-500">
                Estimasi Pendapatan Terselamatkan
              </div>
              <div
                className="text-lg font-semibold text-teal-800"
                title={formatIdr(segmentPlan.estimatedSaveableRevenueIdr)}
              >
                {formatIdrCompact(segmentPlan.estimatedSaveableRevenueIdr)} / bln
              </div>
              <div className="text-[11px] text-slate-500">
                {segmentPlan.assumptionNote}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {segmentPlan.playbooks.map((pb, idx) => (
              <div
                key={`${pb.title}-${idx}`}
                className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-900">
                    {pb.title}
                  </h4>
                  <span className="shrink-0 rounded bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                    {pb.channel}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-800">Target:</span>{" "}
                  {pb.targetCondition}
                </p>
                <p className="mt-1.5 text-xs text-slate-700">
                  <span className="font-medium text-slate-900">Taktik:</span>{" "}
                  {pb.tactic}
                </p>
                <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
                  <span className="font-medium text-slate-800">Target KPI:</span>{" "}
                  {pb.successMetric}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
