"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  FileSpreadsheet,
  Info,
  Loader2,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { CustomerTable } from "@/components/CustomerTable";
import { InsightPanels } from "@/components/InsightPanels";
import { KpiStrip } from "@/components/KpiStrip";
import { RetentionDrawer } from "@/components/RetentionDrawer";
import { SchemaModal } from "@/components/SchemaModal";
import { toSafeCsv } from "@/lib/csv";
import type {
  ChurnAnalysisReport,
  CustomerRetentionPlan,
  RiskSegment,
  SchemaOverride,
  ScoredCustomer,
  SegmentRetentionPlan,
} from "@/lib/types";

export default function HomePage() {
  const [reportVersion, setReportVersion] = useState<number>(0);
  const [customCsv, setCustomCsv] = useState<{
    csvText: string;
    datasetName: string;
  } | null>(null);

  const [report, setReport] = useState<ChurnAnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [segmentFilter, setSegmentFilter] = useState<RiskSegment | "All">("All");
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

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
    (
      data: ChurnAnalysisReport,
      customPayload: { csvText: string; datasetName: string },
    ) => {
      cancelPendingAiRequests();
      setReport(data);
      setReportVersion((v) => v + 1);
      setCustomCsv(customPayload);
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
    async (
      csvText: string,
      datasetName: string,
      schemaOverride?: SchemaOverride,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvText, datasetName, schemaOverride }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menganalisis CSV.");
        commitNewReport(data as ChurnAnalysisReport, {
          csvText,
          datasetName,
        });
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

  const handleApplySchema = (override: SchemaOverride) => {
    if (customCsv) {
      void runCustomAnalysis(
        customCsv.csvText,
        customCsv.datasetName,
        override,
      );
    }
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
    <div className="min-h-screen bg-[#FAF9F7] text-[#1C1917]">
      {error && (
        <div className="mx-auto max-w-[1360px] px-4 pt-5 sm:px-6">
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && !report ? (
        <div className="flex min-h-[75vh] items-center justify-center gap-2.5 text-sm text-stone-600">
          <Loader2 className="h-4 w-4 animate-spin text-stone-800" />
          Menganalisis data pelanggan...
        </div>
      ) : !report ? (
        <main className="mx-auto flex min-h-[85vh] max-w-xl flex-col justify-center px-4 py-16 sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
              Prediksi Churn Pelanggan
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Unggah data pelanggan dalam format CSV untuk melihat siapa yang
              berisiko berhenti berlangganan dan faktor pendorong utamanya.
            </p>
          </div>

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
            className={`mt-6 w-full rounded-xl border border-dashed bg-white px-6 py-12 text-center transition-colors ${
              isDragging
                ? "border-stone-900 bg-stone-50"
                : "border-stone-300 hover:border-stone-400"
            }`}
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700">
              <FileSpreadsheet className="h-5 w-5" strokeWidth={1.75} />
            </div>

            <p className="mt-4 text-sm font-medium text-stone-900">
              Tarik dan lepas file CSV di sini
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Maksimal 5 MB · Mendukung pemisah koma (<code>,</code>) atau titik
              koma (<code>;</code>)
            </p>

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

            <div className="mt-6">
              <button
                type="button"
                onClick={() => dropInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
              >
                <Upload className="h-3.5 w-3.5" />
                Pilih File CSV
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          <main className="mx-auto max-w-[1360px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
            {/* Compact contextual document title row (no sticky top header) */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-stone-950">
                  Analisis Risiko Churn
                </h1>
                <p className="mt-0.5 text-xs text-stone-500 tabular-nums">
                  {report.datasetName} ·{" "}
                  {report.totalCustomers.toLocaleString("id-ID")} pelanggan ·{" "}
                  {report.schema.numericFeatures.length +
                    report.schema.categoricalFeatures.length}{" "}
                  kolom dianalisis
                </p>
              </div>

              <div className="flex items-center gap-2">
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
                  onClick={() => setSchemaModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-stone-500" />
                  Ubah Kolom
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => replaceInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5 text-stone-500" />
                  Ganti CSV
                </button>
              </div>
            </div>

            {report.modeNotice && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
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

          <SchemaModal
            key={`schema-${reportVersion}`}
            open={schemaModalOpen}
            schema={report.schema}
            onClose={() => setSchemaModalOpen(false)}
            onApply={handleApplySchema}
          />
        </>
      )}
    </div>
  );
}
