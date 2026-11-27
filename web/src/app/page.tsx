"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  Users,
} from "lucide-react";
import { CustomerTable } from "@/components/CustomerTable";
import { InsightPanels } from "@/components/InsightPanels";
import { KpiStrip } from "@/components/KpiStrip";
import { RetentionDrawer } from "@/components/RetentionDrawer";
import { toSafeCsv } from "@/lib/csv";
import type {
  ChurnAnalysisReport,
  CustomerRetentionPlan,
  RiskSegment,
  ScoredCustomer,
  SegmentRetentionPlan,
} from "@/lib/types";

export default function HomePage() {
  const [reportVersion, setReportVersion] = useState<number>(0);
  const [report, setReport] = useState<ChurnAnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [segmentFilter, setSegmentFilter] = useState<RiskSegment | "All">("All");

  const [segmentPlan, setSegmentPlan] = useState<SegmentRetentionPlan | null>(
    null,
  );
  const [segmentPlanLoading, setSegmentPlanLoading] = useState(false);
  const [segmentPlanError, setSegmentPlanError] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<ScoredCustomer | null>(null);
  const [customerPlans, setCustomerPlans] = useState<
    Record<string, CustomerRetentionPlan>
  >({});
  const [customerPlanLoading, setCustomerPlanLoading] = useState(false);
  const [customerPlanError, setCustomerPlanError] = useState<string | null>(
    null,
  );

  const dropInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const segmentAbortRef = useRef<AbortController | null>(null);
  const customerAbortRef = useRef<AbortController | null>(null);

  const cancelPendingAiRequests = useCallback(() => {
    segmentAbortRef.current?.abort();
    segmentAbortRef.current = null;
    customerAbortRef.current?.abort();
    customerAbortRef.current = null;
    setSegmentPlanLoading(false);
    setCustomerPlanLoading(false);
  }, []);

  useEffect(() => {
    return () => cancelPendingAiRequests();
  }, [cancelPendingAiRequests]);

  const commitNewReport = useCallback(
    (data: ChurnAnalysisReport) => {
      cancelPendingAiRequests();
      setReport(data);
      setReportVersion((v) => v + 1);
      setSegmentPlan(null);
      setSegmentPlanError(null);
      setSelectedCustomer(null);
      setCustomerPlans({});
      setCustomerPlanError(null);
      setSegmentFilter("All");
    },
    [cancelPendingAiRequests],
  );

  const runCustomAnalysis = useCallback(
    async (csvText: string, datasetName: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvText, datasetName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menganalisis CSV.");
        commitNewReport(data as ChurnAnalysisReport);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memproses file CSV.",
        );
      } finally {
        setLoading(false);
      }
    },
    [commitNewReport],
  );

  const handleUploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Format file harus .csv (UTF-8).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file melebihi batas maksimum 5 MB.");
      return;
    }
    const text = await file.text();
    await runCustomAnalysis(text, file.name);
  };

  const handleGenerateSegmentPlan = async () => {
    if (!report) return;
    segmentAbortRef.current?.abort();
    const controller = new AbortController();
    segmentAbortRef.current = controller;

    setSegmentPlanLoading(true);
    setSegmentPlanError(null);
    try {
      const res = await fetch("/api/retention-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode: "segment",
          datasetName: report.datasetName,
          highRiskCount: report.segments.highCount,
          totalCustomers: report.totalCustomers,
          highRevenueAtRiskIdr: report.segments.highRevenueAtRiskIdr,
          topFeatures: report.featureImportance.slice(0, 6),
        }),
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok)
        throw new Error(data.error || "Gagal menyusun rencana retensi.");
      setSegmentPlan(data.plan as SegmentRetentionPlan);
    } catch (err) {
      if (controller.signal.aborted) return;
      setSegmentPlanError(
        err instanceof Error
          ? err.message
          : "Gagal menyusun rencana retensi.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setSegmentPlanLoading(false);
      }
    }
  };

  const handleGenerateCustomerPlan = async (customer: ScoredCustomer) => {
    if (!report) return;
    customerAbortRef.current?.abort();
    const controller = new AbortController();
    customerAbortRef.current = controller;

    setCustomerPlanLoading(true);
    setCustomerPlanError(null);
    try {
      const res = await fetch("/api/retention-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode: "customer",
          datasetName: report.datasetName,
          customer,
        }),
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok)
        throw new Error(data.error || "Gagal menyusun saran tindak lanjut.");
      setCustomerPlans((prev) => ({
        ...prev,
        [customer.rowKey]: data.plan as CustomerRetentionPlan,
      }));
    } catch (err) {
      if (controller.signal.aborted) return;
      setCustomerPlanError(
        err instanceof Error
          ? err.message
          : "Gagal menyusun saran tindak lanjut.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setCustomerPlanLoading(false);
      }
    }
  };

  const handleExportCsv = () => {
    if (!report) return;
    const headers = [
      "Customer_ID",
      "Nama",
      "Paket_Segmen",
      "Tagihan_Bulanan_IDR",
      "Skor_Churn_Pct",
      "Segmen_Risiko",
      "Faktor_Utama_1",
      "Faktor_Utama_2",
      "Faktor_Utama_3",
    ];
    const rows = report.customers.map((c) => [
      c.id,
      c.name,
      c.segmentLabel,
      c.monthlyRevenueIdr,
      c.churnProbability,
      c.riskSegment,
      c.topDrivers[0]
        ? `${c.topDrivers[0].label}: ${c.topDrivers[0].value}`
        : "-",
      c.topDrivers[1]
        ? `${c.topDrivers[1].label}: ${c.topDrivers[1].value}`
        : "-",
      c.topDrivers[2]
        ? `${c.topDrivers[2].label}: ${c.topDrivers[2].value}`
        : "-",
    ]);
    const csv = toSafeCsv(headers, rows);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `churn_predictions_${report.datasetName.replace(/\.csv$/i, "")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-zinc-900">
      {error && (
        <div className="mx-auto max-w-[1360px] px-4 pt-5 sm:px-6">
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 shadow-2xs"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && !report ? (
        <div className="flex min-h-screen items-center justify-center gap-2.5 text-sm font-medium text-stone-600">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
          Menganalisis data pelanggan...
        </div>
      ) : !report ? (
        <main className="mx-auto flex min-h-screen max-w-[820px] flex-col justify-center px-4 py-12 sm:px-6">
          {/* Centered Editorial Header */}
          <div className="text-center">
            <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-[0_2px_10px_rgba(6,95,70,0.28)]">
              <Activity className="h-5 w-5" strokeWidth={1.85} />
            </div>
            <h1 className="mt-4 text-[26px] font-bold tracking-tight text-zinc-950">
              Prediksi Churn Pelanggan
            </h1>
            <p className="mx-auto mt-1.5 max-w-lg text-[14px] leading-relaxed text-stone-600">
              Unggah file CSV data pelanggan untuk melihat tingkat risiko
              berhenti berlangganan, faktor pendorong utama, dan nilai
              pendapatan berisiko.
            </p>
          </div>

          {/* Full-Width Centered Upload Surface */}
          <div className="surface-card mt-7 overflow-hidden rounded-2xl p-6">
            <input
              ref={dropInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadFile(file);
                e.target.value = "";
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleUploadFile(file);
              }}
              onClick={() => dropInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  dropInputRef.current?.click();
                }
              }}
              className={`rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-150 ${
                isDragging
                  ? "border-emerald-700 bg-emerald-50/50"
                  : "border-stone-300/90 bg-[#FAF9F6] hover:border-emerald-600/70 hover:bg-emerald-50/25"
              }`}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-white text-emerald-800 shadow-xs">
                <FileSpreadsheet className="h-5 w-5" strokeWidth={1.85} />
              </div>

              <p className="mt-4 text-[15px] font-semibold text-zinc-900">
                Tarik &amp; lepas file CSV ke sini
              </p>
              <p className="mt-1 text-[13px] text-stone-500">
                Maksimal 5 MB · Pemisah koma (<code>,</code>) atau titik koma
                Excel (<code>;</code>)
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dropInputRef.current?.click();
                  }}
                  className="btn-emerald inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold transition-all"
                >
                  <Upload className="h-4 w-4" strokeWidth={2} />
                  Pilih File CSV
                </button>
              </div>
            </div>
          </div>

          {/* Equal 3-Column Symmetric Strip */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="surface-card flex h-full items-start gap-3 rounded-xl p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <Users className="h-4 w-4" strokeWidth={1.85} />
              </span>
              <div>
                <div className="text-[13px] font-semibold text-zinc-900">
                  Profil &amp; Paket
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-stone-500">
                  ID, nama, kontrak, dan lama berlangganan.
                </p>
              </div>
            </div>

            <div className="surface-card flex h-full items-start gap-3 rounded-xl p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <Banknote className="h-4 w-4" strokeWidth={1.85} />
              </span>
              <div>
                <div className="text-[13px] font-semibold text-zinc-900">
                  Tagihan Bulanan
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-stone-500">
                  Menghitung estimasi pendapatan berisiko.
                </p>
              </div>
            </div>

            <div className="surface-card flex h-full items-start gap-3 rounded-xl p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.85} />
              </span>
              <div>
                <div className="text-[13px] font-semibold text-zinc-900">
                  Riwayat &amp; Keluhan
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-stone-500">
                  Komplain, telat bayar, atau status churn.
                </p>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          <main className="mx-auto max-w-[1360px] space-y-6 px-4 py-7 sm:px-6 sm:py-8">
            {/* Compact contextual document title row (no sticky header bar) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-[22px] font-bold tracking-tight text-zinc-950">
                    Analisis Risiko Churn
                  </h1>
                  <span className="inline-flex items-center rounded-md border border-stone-200 bg-white px-2.5 py-0.5 text-[12px] font-medium text-stone-600 shadow-2xs tabular-nums">
                    {report.datasetName}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-stone-500 tabular-nums">
                  {report.totalCustomers.toLocaleString("id-ID")} pelanggan ·{" "}
                  {report.schema.numericFeatures.length +
                    report.schema.categoricalFeatures.length}{" "}
                  kolom dianalisis dalam {report.durationMs} ms
                </p>
              </div>

              <div>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadFile(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => replaceInputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 text-xs font-semibold text-zinc-800 shadow-2xs transition-all hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98] disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5 text-stone-500" />
                  Ganti CSV
                </button>
              </div>
            </div>

            {report.modeNotice && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-2xs">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>{report.modeNotice}</span>
              </div>
            )}

            <KpiStrip key={`kpi-${reportVersion}`} report={report} />

            <InsightPanels
              report={report}
              activeSegmentFilter={segmentFilter}
              onSelectSegmentFilter={setSegmentFilter}
              segmentPlan={segmentPlan}
              segmentPlanLoading={segmentPlanLoading}
              segmentPlanError={segmentPlanError}
              onGenerateSegmentPlan={() => void handleGenerateSegmentPlan()}
            />

            <CustomerTable
              key={`table-${reportVersion}`}
              customers={report.customers}
              hasRevenue={Boolean(report.schema.revenueColumn)}
              segmentFilter={segmentFilter}
              selectedCustomerId={selectedCustomer?.rowKey ?? null}
              onSelectSegmentFilter={setSegmentFilter}
              onSelectCustomer={(c) => {
                customerAbortRef.current?.abort();
                setCustomerPlanLoading(false);
                setSelectedCustomer(c);
                setCustomerPlanError(null);
              }}
              onExportCsv={handleExportCsv}
            />
          </main>

          <RetentionDrawer
            customer={selectedCustomer}
            plan={
              selectedCustomer
                ? (customerPlans[selectedCustomer.rowKey] ?? null)
                : null
            }
            loading={customerPlanLoading}
            error={customerPlanError}
            onClose={() => {
              customerAbortRef.current?.abort();
              setCustomerPlanLoading(false);
              setSelectedCustomer(null);
            }}
            onGeneratePlan={(c) => void handleGenerateCustomerPlan(c)}
          />
        </>
      )}
    </div>
  );
}
