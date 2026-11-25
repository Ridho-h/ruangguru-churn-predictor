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

  // Larger SVG Donut math (viewBox 180x180, radius = 66, circumference = 2 * PI * 66)
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const highFrac = report.segments.highCount / total;
  const medFrac = report.segments.mediumCount / total;
  const lowFrac = report.segments.lowCount / total;

  const highLen = highFrac * circumference;
  const medLen = medFrac * circumference;
  const lowLen = lowFrac * circumference;

  const segRows: Array<{
    key: RiskSegment;
    label: string;
    range: string;
    count: number;
    pct: number;
    dotClass: string;
    badgeClass: string;
  }> = [
    {
      key: "High",
      label: "Risiko Tinggi",
      range: "Skor ≥ 70%",
      count: report.segments.highCount,
      pct: highFrac * 100,
      dotClass: "bg-rose-600",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    },
    {
      key: "Medium",
      label: "Risiko Sedang",
      range: "Skor 40–69%",
      count: report.segments.mediumCount,
      pct: medFrac * 100,
      dotClass: "bg-amber-500",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    },
    {
      key: "Low",
      label: "Risiko Rendah",
      range: "Skor < 40%",
      count: report.segments.lowCount,
      pct: lowFrac * 100,
      dotClass: "bg-emerald-600",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Left: Diverging Tornado Chart (Plain-Indonesian Feature Drivers) */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Faktor Utama Penyebab Churn (Diagram Pengaruh)
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Batang ke kiri menahan pelanggan tetap aktif; batang ke kanan
              mendorong risiko berhenti.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1.5 text-teal-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />
              Penahan Churn
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-600" />
              Pemicu Churn
            </span>
          </div>
        </div>

        {/* Center Axis Header */}
        <div className="mt-4 grid grid-cols-12 items-center border-b border-slate-200 pb-1.5 text-[11px] font-medium text-slate-500">
          <div className="col-span-5">Faktor &amp; Penjelasan</div>
          <div className="col-span-3 pr-2 text-right text-teal-700">
            ← Menahan
          </div>
          <div className="col-span-3 pl-2 text-left text-rose-700">
            Memicu →
          </div>
          <div className="col-span-1 text-right">Bobot</div>
        </div>

        <div className="mt-2 divide-y divide-slate-100">
          {topFeatures.map((feat) => {
            const barWidth = Math.max(10, (feat.importancePct / maxImp) * 100);
            const isIncrease = feat.direction === "increase";
            const insight =
              feat.insightText ??
              (isIncrease
                ? "Makin tinggi nilainya, makin besar risiko churn"
                : "Makin tinggi nilainya, makin kecil risiko churn");

            return (
              <div
                key={feat.feature}
                className="grid grid-cols-12 items-center gap-1 py-2.5"
              >
                <div className="col-span-5 pr-2">
                  <div className="text-xs font-semibold text-slate-900">
                    {feat.label}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-600">
                    {insight}
                  </div>
                </div>

                {/* Left Half (Decrease Risk / Teal) */}
                <div className="col-span-3 flex items-center justify-end border-r border-slate-300 pr-1.5">
                  {!isIncrease ? (
                    <div
                      className="h-3.5 rounded-l bg-teal-600 transition-all"
                      style={{ width: `${barWidth}%` }}
                      title={`${feat.label}: ${feat.importancePct}% (Penahan Churn)`}
                    />
                  ) : (
                    <div className="h-3.5 w-full" />
                  )}
                </div>

                {/* Right Half (Increase Risk / Rose) */}
                <div className="col-span-3 flex items-center justify-start pl-1.5">
                  {isIncrease ? (
                    <div
                      className="h-3.5 rounded-r bg-rose-600 transition-all"
                      style={{ width: `${barWidth}%` }}
                      title={`${feat.label}: ${feat.importancePct}% (Pemicu Churn)`}
                    />
                  ) : (
                    <div className="h-3.5 w-full" />
                  )}
                </div>

                <div className="col-span-1 text-right text-xs font-semibold text-slate-900 tabular-nums">
                  {feat.importancePct.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Enlarged Donut Chart + Segment Breakdown + AI Segment Playbook */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 lg:col-span-6">
        <div className="flex flex-1 flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Distribusi Segmen Risiko Pelanggan
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Klik salah satu segmen untuk memfilter daftar prioritas pelanggan di bawah.
              </p>
            </div>
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

          {/* Enlarged Donut + Spacious Segment Cards */}
          <div className="my-auto grid grid-cols-1 items-center gap-6 py-5 sm:grid-cols-12">
            <div className="flex items-center justify-center sm:col-span-5">
              <div className="relative h-48 w-48 sm:h-52 sm:w-52">
                <svg
                  viewBox="0 0 180 180"
                  className="h-full w-full -rotate-90"
                  role="img"
                  aria-label="Diagram donat distribusi segmen risiko churn"
                >
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="22"
                  />
                  {/* Low Risk (Emerald) */}
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="22"
                    strokeDasharray={`${lowLen} ${circumference}`}
                    strokeDashoffset={0}
                  />
                  {/* Medium Risk (Amber) */}
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="22"
                    strokeDasharray={`${medLen} ${circumference}`}
                    strokeDashoffset={-lowLen}
                  />
                  {/* High Risk (Rose) */}
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="22"
                    strokeDasharray={`${highLen} ${circumference}`}
                    strokeDashoffset={-(lowLen + medLen)}
                  />
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="tabular-nums text-3xl font-bold tracking-tight text-slate-900">
                    {(highFrac * 100).toFixed(1)}%
                  </span>
                  <span className="mt-0.5 text-xs font-semibold text-rose-700">
                    Risiko Tinggi
                  </span>
                  <span className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                    {report.segments.highCount.toLocaleString("id-ID")} pelanggan
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:col-span-7">
              {segRows.map((s) => {
                const isSelected = activeSegmentFilter === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() =>
                      onSelectSegmentFilter(isSelected ? "All" : s.key)
                    }
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 ${
                      isSelected
                        ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-3.5 w-3.5 rounded-full ${s.dotClass}`} />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {s.label}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          {s.range}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 tabular-nums">
                      <span className="text-lg font-semibold text-slate-900">
                        {s.count.toLocaleString("id-ID")}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${s.badgeClass}`}
                      >
                        {s.pct.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Segment Playbook Trigger */}
        <div className="mt-2 border-t border-slate-200 pt-4">
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
