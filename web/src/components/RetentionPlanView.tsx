"use client";

import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Target,
  Zap,
} from "lucide-react";
import type { ChurnAnalysisReport, SegmentRetentionPlan } from "@/lib/types";
import { formatIdr, formatIdrCompact } from "./formatters";

interface RetentionPlanViewProps {
  report: ChurnAnalysisReport;
  segmentPlan: SegmentRetentionPlan | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function RetentionPlanView({
  report,
  segmentPlan,
  loading,
  error,
  onGenerate,
}: RetentionPlanViewProps) {
  if (!segmentPlan) {
    return (
      <section className="flex min-h-[calc(100vh-140px)] items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-200/90 bg-white p-8 text-center shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
          <h2 className="text-[20px] font-bold tracking-tight text-zinc-950">
            Strategi Retensi — Risiko Tinggi
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-600">
            Susun 3 aksi prioritas untuk menyelamatkan{" "}
            <strong className="font-semibold text-zinc-950 tabular-nums">
              {report.segments.highCount.toLocaleString("id-ID")} pelanggan
              risiko tinggi
            </strong>
            {report.schema.revenueColumn ? (
              <>
                {" "}
                (
                <strong className="font-semibold text-rose-700 tabular-nums">
                  {formatIdrCompact(report.segments.highRevenueAtRiskIdr)}/bln
                </strong>
                )
              </>
            ) : null}
            .
          </p>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-left text-xs text-rose-800"
            >
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              disabled={loading}
              onClick={onGenerate}
              className="btn-emerald inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold transition-all disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
              {loading ? "Menyusun Rencana..." : "Buat Rencana Retensi"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 lg:min-h-[calc(100vh-116px)]">
      {/* Row 1: Executive Impact Banner */}
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-zinc-200/90 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
        <div className="flex flex-wrap items-center gap-6">
          <div className="tabular-nums">
            <div className="text-[12px] font-medium text-zinc-500">
              Potensi Pendapatan Diselamatkan
            </div>
            <div
              className="mt-1 text-[28px] font-bold leading-none tracking-tight text-emerald-700"
              title={formatIdr(segmentPlan.estimatedSaveableRevenueIdr)}
            >
              {formatIdrCompact(segmentPlan.estimatedSaveableRevenueIdr)} / bln
            </div>
          </div>

          <span
            className="hidden h-11 w-px bg-zinc-200 sm:inline-block"
            aria-hidden="true"
          />

          <div className="max-w-2xl">
            <div className="text-[11.5px] font-semibold uppercase tracking-wider text-zinc-400">
              Fokus Utama · {segmentPlan.assumptionNote}
            </div>
            <p className="mt-1 text-[14px] leading-relaxed text-zinc-700">
              {segmentPlan.executiveSummary}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={onGenerate}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 text-[12.5px] font-medium text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
          )}
          {loading ? "Menyusun..." : "Susun Ulang"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Row 2: 3 Large, Spacious Playbook Cards filling remaining viewport cleanly */}
      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-3">
        {segmentPlan.playbooks.map((pb, idx) => (
          <div
            key={`${pb.title}-${idx}`}
            className="flex h-full flex-col justify-between overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-[12px] font-bold text-white tabular-nums">
                  0{idx + 1}
                </span>
                <h3 className="text-[15.5px] font-bold leading-snug text-zinc-950">
                  {pb.title}
                </h3>
              </div>
              <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-800">
                {pb.channel}
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-between gap-5 p-6 text-[13.5px]">
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Sasaran Pelanggan
                  </div>
                  <p className="mt-1.5 leading-relaxed text-zinc-700">
                    {pb.targetCondition}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 items-start gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-4">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                    Langkah Aksi Utama
                  </div>
                  <p className="mt-1.5 leading-relaxed font-medium text-zinc-900">
                    {pb.tactic}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 text-[13px] text-zinc-600">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-semibold text-zinc-800">
                {pb.successMetric}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
