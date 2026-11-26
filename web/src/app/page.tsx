"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
} from "lucide-react";
import { CustomerTable } from "@/components/CustomerTable";
import { InsightPanels } from "@/components/InsightPanels";
import { KpiStrip } from "@/components/KpiStrip";
import { RetentionDrawer } from "@/components/RetentionDrawer";
import { SchemaModal } from "@/components/SchemaModal";
import { TopBar } from "@/components/TopBar";
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

  const [segmentPlan, setSegmentPlan] = useState<SegmentRetentionPlan | null>(null);
  const [segmentPlanLoading, setSegmentPlanLoading] = useState(false);
  const [segmentPlanError, setSegmentPlanError] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<ScoredCustomer | null>(
    null,
  );
  const [customerPlans, setCustomerPlans] = useState<
    Record<string, CustomerRetentionPlan>
  >({});
  const [customerPlanLoading, setCustomerPlanLoading] = useState(false);
  const [customerPlanError, setCustomerPlanError] = useState<string | null>(null);

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
      if (!res.ok) throw new Error(data.error || "Gagal menyusun strategi AI.");
      setSegmentPlan(data.plan as SegmentRetentionPlan);
    } catch (err) {
      if (controller.signal.aborted) return;
      setSegmentPlanError(
        err instanceof Error ? err.message : "Gagal menyusun strategi AI.",
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
        throw new Error(data.error || "Gagal menyusun rencana retensi.");
      setCustomerPlans((prev) => ({
        ...prev,
        [customer.rowKey]: data.plan as CustomerRetentionPlan,
      }));
    } catch (err) {
      if (controller.signal.aborted) return;
      setCustomerPlanError(
        err instanceof Error
          ? err.message
          : "Gagal menyusun rencana retensi personal.",
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <TopBar
        activeDatasetName={report?.datasetName ?? null}
        loading={loading}
        canConfigureSchema={Boolean(report)}
        canExport={Boolean(report)}
        onUploadFile={(f) => void handleUploadFile(f)}
        onOpenSchema={() => setSchemaModalOpen(true)}
        onExportCsv={handleExportCsv}
      />

      {error && (
        <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6">
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && !report ? (
        <div className="flex min-h-[65vh] items-center justify-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
          Melatih model Machine Learning &amp; menghitung skor risiko churn...
        </div>
      ) : !report ? (
        <main className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-16 sm:px-6">
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
            className={`w-full rounded-xl border-2 border-dashed bg-white px-6 py-12 text-center transition-colors ${
              isDragging
                ? "border-teal-700 bg-teal-50/40"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-teal-700">
              <FileSpreadsheet className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Unggah File CSV Pelanggan untuk Memulai
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-600">
              Tarik dan lepas file <code className="font-mono text-slate-800">.csv</code>{" "}
              (500–5.000 baris, maks. 5 MB) ke area ini. Sistem akan memetakan
              kolom otomatis, melatih model <strong>L2 Logistic Regression</strong>{" "}
              deterministik, dan menyiapkan strategi retensi AI.
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

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => dropInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-xs font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <Upload className="h-4 w-4" />
                Pilih File CSV dari Komputer
              </button>

              <a
                href="/datasets/dummy.csv"
                download="dummy.csv"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
              >
                <Download className="h-4 w-4 text-slate-600" />
                Unduh dummy.csv (1.000 Pelanggan)
              </a>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
              Mendukung delimiter koma (<code>,</code>) maupun titik koma Excel (<code>;</code>),
              format Rupiah, serta mode prediksi tanpa kolom label <code>churn</code>.
            </div>
          </div>
        </main>
      ) : (
        <>
          <KpiStrip key={`kpi-${reportVersion}`} report={report} />

          <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
            {report.modeNotice && (
              <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>{report.modeNotice}</span>
              </div>
            )}

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
