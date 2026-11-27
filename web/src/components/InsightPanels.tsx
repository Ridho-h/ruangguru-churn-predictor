"use client";

import { ClipboardList, Loader2 } from "lucide-react";
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
    pctClass: string;
    activeRing: string;
  }> = [
    {
      key: "High",
      label: "Risiko Tinggi",
      range: "Skor ≥ 70%",
      count: report.segments.highCount,
      pct: highFrac * 100,
      dotClass: "bg-rose-600",
      pctClass: "text-rose-700 bg-rose-50 border-rose-200",
      activeRing: "bg-rose-50/50 ring-1 ring-rose-300",
    },
    {
      key: "Medium",
      label: "Risiko Sedang",
      range: "Skor 40–69%",
      count: report.segments.mediumCount,
      pct: medFrac * 100,
      dotClass: "bg-amber-500",
      pctClass: "text-amber-800 bg-amber-50 border-amber-200",
      activeRing: "bg-amber-50/50 ring-1 ring-amber-300",
    },
    {
      key: "Low",
      label: "Risiko Rendah",
      range: "Skor < 40%",
      count: report.segments.lowCount,
      pct: lowFrac * 100,
      dotClass: "bg-emerald-600",
      pctClass: "text-emerald-800 bg-emerald-50 border-emerald-200",
      activeRing: "bg-emerald-50/50 ring-1 ring-emerald-300",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left: Diverging Tornado Chart */}
      <div className="surface-card overflow-hidden rounded-2xl lg:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 bg-[#FAF9F6] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-zinc-950">
              Faktor Penyebab Churn
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Kiri menahan pelanggan tetap aktif; kanan mendorong risiko
              berhenti.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
              Menahan
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700">
              <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" />
              Memicu
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-12 items-center border-b border-stone-200 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            <div className="col-span-5">Faktor</div>
            <div className="col-span-3 pr-2 text-right text-emerald-700">
              ← Menahan
            </div>
            <div className="col-span-3 pl-2 text-left text-rose-700">
              Memicu →
            </div>
            <div className="col-span-1 text-right">Bobot</div>
          </div>

          <div className="mt-1 divide-y divide-stone-100">
            {topFeatures.map((feat) => {
              const barWidth = Math.max(
                10,
                (feat.importancePct / maxImp) * 100,
              );
              const isIncrease = feat.direction === "increase";
              const insight =
                feat.insightText ??
                (isIncrease
                  ? "Makin tinggi nilainya, makin besar risiko berhenti"
                  : "Makin tinggi nilainya, makin kecil risiko berhenti");

              return (
                <div
                  key={feat.feature}
                  className="-mx-2 grid grid-cols-12 items-center gap-1 rounded-lg px-2 py-2.5 transition-colors hover:bg-stone-50"
                >
                  <div className="col-span-5 pr-2">
                    <div className="text-xs font-semibold text-zinc-900">
                      {feat.label}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-stone-500">
                      {insight}
                    </div>
                  </div>

                  <div className="col-span-3 flex items-center justify-end border-r border-stone-300 pr-2">
                    {!isIncrease ? (
                      <div
                        className="h-3.5 rounded-l-sm bg-emerald-600 transition-all"
                        style={{ width: `${barWidth}%` }}
                        title={`${feat.label}: ${feat.importancePct}% (Menahan Churn)`}
                      />
                    ) : (
                      <div className="h-3.5 w-full" />
                    )}
                  </div>

                  <div className="col-span-3 flex items-center justify-start pl-2">
                    {isIncrease ? (
                      <div
                        className="h-3.5 rounded-r-sm bg-rose-600 transition-all"
                        style={{ width: `${barWidth}%` }}
                        title={`${feat.label}: ${feat.importancePct}% (Memicu Churn)`}
                      />
                    ) : (
                      <div className="h-3.5 w-full" />
                    )}
                  </div>

                  <div className="col-span-1 text-right text-xs font-semibold text-zinc-900 tabular-nums">
                    {feat.importancePct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Donut Chart + Interactive Segment List + Playbook Bar */}
      <div className="surface-card flex flex-col justify-between overflow-hidden rounded-2xl lg:col-span-6">
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 bg-[#FAF9F6] px-5 py-4">
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-zinc-950">
                Sebaran Risiko Pelanggan
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Klik segmen untuk menyaring daftar pelanggan di bawah.
              </p>
            </div>
            {activeSegmentFilter !== "All" && (
              <button
                type="button"
                onClick={() => onSelectSegmentFilter("All")}
                className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 transition-colors hover:bg-stone-100"
              >
                Tampilkan semua
              </button>
            )}
          </div>

          <div className="my-auto grid grid-cols-1 items-center gap-6 px-5 py-6 sm:grid-cols-12">
            <div className="flex items-center justify-center sm:col-span-5">
              <div className="relative h-48 w-48 sm:h-52 sm:w-52">
                <svg
                  viewBox="0 0 180 180"
                  className="h-full w-full -rotate-90 drop-shadow-[0_2px_6px_rgba(24,24,27,0.06)]"
                  role="img"
                  aria-label="Diagram donat sebaran risiko pelanggan"
                >
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="#f5f5f4"
                    strokeWidth="22"
                  />
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
                  <span className="tabular-nums text-[30px] font-bold tracking-tight text-zinc-950">
                    {(highFrac * 100).toFixed(1)}%
                  </span>
                  <span className="mt-0.5 text-xs font-semibold text-rose-700">
                    Risiko Tinggi
                  </span>
                  <span className="mt-0.5 text-[11px] text-stone-500 tabular-nums">
                    {report.segments.highCount.toLocaleString("id-ID")} orang
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-7">
              {segRows.map((s) => {
                const isSelected = activeSegmentFilter === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() =>
                      onSelectSegmentFilter(isSelected ? "All" : s.key)
                    }
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-all ${
                      isSelected ? s.activeRing : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-3 w-3 rounded-full ${s.dotClass}`}
                      />
                      <div>
                        <div className="text-[13.5px] font-semibold text-zinc-900">
                          {s.label}
                        </div>
                        <div className="text-xs text-stone-500 tabular-nums">
                          {s.range}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 tabular-nums">
                      <span className="text-[16px] font-bold text-zinc-950">
                        {s.count.toLocaleString("id-ID")}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${s.pctClass}`}
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

        {/* Distinct Emerald-tinted Playbook Action Strip */}
        <div className="border-t border-emerald-200/70 bg-emerald-50/45 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-stone-700">
              Susun 3 langkah retensi untuk{" "}
              <span className="font-bold text-zinc-950 tabular-nums">
                {report.segments.highCount.toLocaleString("id-ID")} pelanggan
                risiko tinggi
              </span>
              .
            </div>
            <button
              type="button"
              disabled={segmentPlanLoading}
              onClick={onGenerateSegmentPlan}
              className="btn-emerald inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition-all disabled:opacity-60"
            >
              {segmentPlanLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ClipboardList className="h-3.5 w-3.5" />
              )}
              {segmentPlanLoading
                ? "Menyusun rencana..."
                : "Buat Rencana Retensi"}
            </button>
          </div>

          {segmentPlanError && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              {segmentPlanError}
            </div>
          )}
        </div>
      </div>

      {/* Rendered Segment Playbook */}
      {segmentPlan && (
        <div className="surface-card overflow-hidden rounded-2xl lg:col-span-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-stone-200/80 bg-[#FAF9F6] px-6 py-4">
            <div>
              <h3 className="text-[15px] font-bold text-zinc-950">
                Rencana Retensi — Segmen Risiko Tinggi
              </h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-stone-600">
                {segmentPlan.executiveSummary}
              </p>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-[11px] font-semibold text-stone-500">
                Potensi Pendapatan Diselamatkan
              </div>
              <div
                className="text-xl font-bold text-emerald-700"
                title={formatIdr(segmentPlan.estimatedSaveableRevenueIdr)}
              >
                {formatIdrCompact(segmentPlan.estimatedSaveableRevenueIdr)} /
                bln
              </div>
              <div className="text-[11px] text-stone-500">
                {segmentPlan.assumptionNote}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-stone-200/80 p-6 md:grid-cols-3 md:divide-x md:divide-y-0">
            {segmentPlan.playbooks.map((pb, idx) => (
              <div
                key={`${pb.title}-${idx}`}
                className="py-3 md:px-5 md:py-1 first:md:pl-0 last:md:pr-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[13px] font-bold text-zinc-950">
                    {pb.title}
                  </h4>
                  <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    {pb.channel}
                  </span>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-stone-600">
                  <span className="font-semibold text-zinc-800">Sasaran:</span>{" "}
                  {pb.targetCondition}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  <span className="font-semibold text-zinc-800">Langkah:</span>{" "}
                  {pb.tactic}
                </p>
                <p className="mt-2.5 border-t border-stone-100 pt-2 text-[11px] text-stone-500">
                  <span className="font-semibold text-stone-700">
                    Indikator:
                  </span>{" "}
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
