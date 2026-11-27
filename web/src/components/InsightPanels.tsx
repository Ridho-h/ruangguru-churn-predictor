"use client";

import { useMemo } from "react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import type { ChurnAnalysisReport, RiskSegment } from "@/lib/types";
import { formatIdrCompact } from "./formatters";

interface InsightPanelsProps {
  report: ChurnAnalysisReport;
  onJumpToSegment: (seg: RiskSegment) => void;
}

export function InsightPanels({
  report,
  onJumpToSegment,
}: InsightPanelsProps) {
  const triggerDrivers = useMemo(
    () =>
      report.featureImportance
        .filter((f) => f.direction === "increase")
        .slice(0, 3),
    [report.featureImportance],
  );

  const retentionDrivers = useMemo(
    () =>
      report.featureImportance
        .filter((f) => f.direction === "decrease")
        .slice(0, 3),
    [report.featureImportance],
  );

  const maxTrigger = Math.max(
    1,
    ...triggerDrivers.map((f) => f.importancePct),
  );
  const maxRetention = Math.max(
    1,
    ...retentionDrivers.map((f) => f.importancePct),
  );

  const packageBreakdown = useMemo(() => {
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
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        highRate: item.total > 0 ? (item.high / item.total) * 100 : 0,
      }))
      .sort((a, b) => b.highRate - a.highRate)
      .slice(0, 3);
  }, [report.customers]);

  const total = Math.max(1, report.totalCustomers);
  const radius = 60;
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
    hoverBg: string;
  }> = [
    {
      key: "High",
      label: "Risiko Tinggi",
      range: "≥ 70%",
      count: report.segments.highCount,
      pct: highFrac * 100,
      dotClass: "bg-rose-600",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      hoverBg: "hover:bg-rose-50/50",
    },
    {
      key: "Medium",
      label: "Risiko Sedang",
      range: "40–69%",
      count: report.segments.mediumCount,
      pct: medFrac * 100,
      dotClass: "bg-amber-500",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      hoverBg: "hover:bg-amber-50/50",
    },
    {
      key: "Low",
      label: "Risiko Rendah",
      range: "< 40%",
      count: report.segments.lowCount,
      pct: lowFrac * 100,
      dotClass: "bg-emerald-600",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      hoverBg: "hover:bg-emerald-50/50",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Left (7 cols): Equal Top 3 Pemicu vs Top 3 Penahan Churn */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)] lg:col-span-7">
        <div className="border-b border-zinc-100 bg-zinc-50/70 px-5 py-3">
          <h2 className="text-[14px] font-semibold tracking-tight text-zinc-950">
            Faktor Utama Penyebab Churn
          </h2>
          <p className="text-[11.5px] text-zinc-500">
            3 faktor terbesar pemicu pelanggan berhenti dibandingkan 3 faktor
            penahan pelanggan tetap aktif.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {/* Sub-column 1: Top 3 Pemicu Churn */}
          <div className="flex flex-col p-5">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-rose-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Top 3 Pemicu Churn</span>
            </div>
            <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
              {triggerDrivers.map((feat, idx) => {
                const width = Math.max(
                  16,
                  (feat.importancePct / maxTrigger) * 100,
                );
                return (
                  <div key={feat.feature}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-zinc-900">
                        {idx + 1}. {feat.label}
                      </span>
                      <span className="shrink-0 text-[12.5px] font-bold text-rose-700 tabular-nums">
                        {feat.importancePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-rose-50">
                      <div
                        className="h-full rounded-full bg-rose-600"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-snug text-zinc-500">
                      {feat.insightText ??
                        "Makin tinggi nilainya, makin besar risiko berhenti"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-column 2: Top 3 Penahan Churn */}
          <div className="flex flex-col p-5">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Top 3 Penahan Churn</span>
            </div>
            <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
              {retentionDrivers.map((feat, idx) => {
                const width = Math.max(
                  16,
                  (feat.importancePct / maxRetention) * 100,
                );
                return (
                  <div key={feat.feature}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-zinc-900">
                        {idx + 1}. {feat.label}
                      </span>
                      <span className="shrink-0 text-[12.5px] font-bold text-emerald-700 tabular-nums">
                        {feat.importancePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-50">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-snug text-zinc-500">
                      {feat.insightText ??
                        "Makin tinggi nilainya, makin kecil risiko berhenti"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right (5 cols): Top = Sebaran Risiko (Donut), Bottom = Risiko Churn per Paket (Compact Strip) */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        {/* Card A (Top): Sebaran Risiko Pelanggan with Donut */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
          <div className="border-b border-zinc-100 bg-zinc-50/70 px-5 py-3">
            <h2 className="text-[14px] font-semibold tracking-tight text-zinc-950">
              Sebaran Risiko Pelanggan
            </h2>
            <p className="text-[11.5px] text-zinc-500">
              Klik salah satu segmen untuk langsung membuka daftar pelanggannya.
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-4 sm:flex-row">
            <div className="relative h-36 w-36 shrink-0">
              <svg
                viewBox="0 0 160 160"
                className="h-full w-full -rotate-90"
                role="img"
                aria-label="Diagram donat sebaran risiko pelanggan"
              >
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#f4f4f5"
                  strokeWidth="18"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="18"
                  strokeDasharray={`${lowLen} ${circumference}`}
                  strokeDashoffset={0}
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="18"
                  strokeDasharray={`${medLen} ${circumference}`}
                  strokeDashoffset={-lowLen}
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="18"
                  strokeDasharray={`${highLen} ${circumference}`}
                  strokeDashoffset={-(lowLen + medLen)}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="tabular-nums text-[24px] font-bold leading-none tracking-tight text-zinc-950">
                  {(highFrac * 100).toFixed(1)}%
                </span>
                <span className="mt-1 text-[10.5px] font-semibold text-rose-700">
                  Risiko Tinggi
                </span>
              </div>
            </div>

            <div className="w-full flex-1 divide-y divide-zinc-100">
              {segRows.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onJumpToSegment(s.key)}
                  className={`group -mx-2 flex w-[calc(100%+16px)] items-center justify-between rounded-lg px-2.5 py-2.5 text-left transition-colors ${s.hoverBg}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${s.dotClass}`}
                    />
                    <div>
                      <div className="text-[12.5px] font-semibold text-zinc-900">
                        {s.label}
                      </div>
                      <div className="text-[11px] text-zinc-400 tabular-nums">
                        Skor {s.range}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <span className="text-[13.5px] font-bold text-zinc-950">
                      {s.count.toLocaleString("id-ID")}
                    </span>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold ${s.badgeClass}`}
                    >
                      {s.pct.toFixed(1)}%
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card B (Bottom): Compact Risiko Churn per Paket with 3-color stacked bar */}
        <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[13.5px] font-semibold tracking-tight text-zinc-950">
              Risiko Churn per Paket
            </h2>
            <span className="text-[11px] text-zinc-400">
              Proporsi pelanggan risiko tinggi
            </span>
          </div>

          {(() => {
            const totalHighInPkgs = Math.max(
              1,
              packageBreakdown.reduce((acc, p) => acc + p.high, 0),
            );
            const barColors = ["bg-rose-600", "bg-amber-500", "bg-emerald-600"];
            const dotColors = ["bg-rose-600", "bg-amber-500", "bg-emerald-600"];
            return (
              <>
                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  {packageBreakdown.map((pkg, idx) => {
                    const share = (pkg.high / totalHighInPkgs) * 100;
                    return (
                      <div
                        key={pkg.label}
                        className={`h-full ${barColors[idx] ?? "bg-zinc-400"}`}
                        style={{ width: `${share}%` }}
                        title={`${pkg.label}: ${pkg.high} risiko tinggi (${pkg.highRate.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {packageBreakdown.map((pkg, idx) => (
                    <div
                      key={pkg.label}
                      className="rounded-lg border border-zinc-200/90 bg-zinc-50/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${dotColors[idx] ?? "bg-zinc-400"}`}
                        />
                        <span className="truncate text-[11.5px] font-semibold text-zinc-800">
                          {pkg.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                        <span className="text-[15px] font-bold text-zinc-950">
                          {pkg.highRate.toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          ({pkg.high}/{pkg.total})
                        </span>
                      </div>
                      {report.schema.revenueColumn ? (
                        <div className="mt-0.5 truncate text-[10.5px] text-zinc-500 tabular-nums">
                          {formatIdrCompact(pkg.highRev)}/bln
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
