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
import { RetentionPlanView } from "@/components/RetentionPlanView";
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "customers" | "retention"
  >("overview");

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

  const handleBackToUpload = useCallback(() => {
    cancelPendingAiRequests();
    setReport(null);
    setSelectedCustomer(null);
    setSegmentPlan(null);
    setSegmentPlanError(null);
    setCustomerPlans({});
    setCustomerPlanError(null);
    setError(null);
  }, [cancelPendingAiRequests]);

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
      setActiveTab("overview");
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
    <div
      className={`min-h-screen text-zinc-900 ${
        report && !loading ? "bg-[#F6F6F4]" : "bg-[#ECEBE5]"
      }`}
    >
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
          {/* Clean Production App Shell Bar: Title + Tabs on left, Upload CSV utility on far right */}
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
            <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
              <div className="flex h-full min-w-0 items-center gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="truncate text-[14.5px] font-bold tracking-tight text-zinc-950 transition-colors hover:text-emerald-800"
                >
                  Analisis Churn Pelanggan
                </button>

                <span
                  className="hidden h-4 w-px bg-zinc-200 sm:inline-block"
                  aria-hidden="true"
                />

                <nav
                  aria-label="Navigasi laporan churn"
                  className="flex h-full items-stretch gap-5"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`relative inline-flex items-center px-1 text-[13px] font-semibold transition-colors ${
                      activeTab === "overview"
                        ? "text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Dashboard
                    {activeTab === "overview" && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-700" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("customers")}
                    className={`relative inline-flex items-center px-1 text-[13px] font-semibold transition-colors ${
                      activeTab === "customers"
                        ? "text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Data Pelanggan
                    {activeTab === "customers" && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-700" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("retention")}
                    className={`relative inline-flex items-center px-1 text-[13px] font-semibold transition-colors ${
                      activeTab === "retention"
                        ? "text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Strategi Retensi
                    {activeTab === "retention" && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-700" />
                    )}
                  </button>
                </nav>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleBackToUpload}
                className="group inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[12.5px] font-medium text-zinc-700 shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.98] disabled:opacity-50"
              >
                <Upload
                  className="h-3.5 w-3.5 text-zinc-500 transition-colors group-hover:text-rose-600"
                  strokeWidth={1.75}
                />
                <span className="hidden sm:inline">Unggah CSV Baru</span>
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] space-y-3.5 px-4 py-4 sm:px-8">
            {report.modeNotice && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>{report.modeNotice}</span>
              </div>
            )}

            {activeTab === "overview" ? (
              <>
                <KpiStrip key={`kpi-${reportVersion}`} report={report} />

                <InsightPanels
                  report={report}
                  onJumpToSegment={(seg) => {
                    setSegmentFilter(seg);
                    setActiveTab("customers");
                  }}
                />
              </>
            ) : activeTab === "customers" ? (
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
            ) : (
              <RetentionPlanView
                report={report}
                segmentPlan={segmentPlan}
                loading={segmentPlanLoading}
                error={segmentPlanError}
                onGenerate={() => void handleGenerateSegmentPlan()}
              />
            )}
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
