"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { CustomerTable } from "@/components/CustomerTable";
import { InsightPanels } from "@/components/InsightPanels";
import { KpiStrip } from "@/components/KpiStrip";
import { RetentionDrawer } from "@/components/RetentionDrawer";
import { SchemaModal } from "@/components/SchemaModal";
import { TopBar } from "@/components/TopBar";
import { toSafeCsv } from "@/lib/csv";
import { PRESET_DATASETS } from "@/lib/presets-client";
import type {
  ChurnAnalysisReport,
  CustomerRetentionPlan,
  RiskSegment,
  SchemaOverride,
  ScoredCustomer,
  SegmentRetentionPlan,
} from "@/lib/types";

export default function HomePage() {
  const [activeSource, setActiveSource] = useState<string>("edtech");
  const [reportVersion, setReportVersion] = useState<number>(0);
  const [customCsv, setCustomCsv] = useState<{
    csvText: string;
    datasetName: string;
  } | null>(null);

  const [report, setReport] = useState<ChurnAnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const commitNewReport = useCallback(
    (data: ChurnAnalysisReport, source: string, customPayload: { csvText: string; datasetName: string } | null) => {
      cancelPendingAiRequests();
      setReport(data);
      setReportVersion((v) => v + 1);
      setActiveSource(source);
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

  const runPresetAnalysis = useCallback(
    async (presetId: "edtech" | "telco", schemaOverride?: SchemaOverride) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presetId, schemaOverride }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menganalisis dataset.");
        commitNewReport(data as ChurnAnalysisReport, presetId, null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat analisis churn.",
        );
      } finally {
        setLoading(false);
      }
    },
    [commitNewReport],
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
        commitNewReport(data as ChurnAnalysisReport, "custom", {
          csvText,
          datasetName,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memproses CSV kustom.",
        );
      } finally {
        setLoading(false);
      }
    },
    [commitNewReport],
  );

  useEffect(() => {
    void runPresetAnalysis("edtech");
    return () => cancelPendingAiRequests();
  }, [runPresetAnalysis, cancelPendingAiRequests]);

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
    if (activeSource === "custom" && customCsv) {
      void runCustomAnalysis(
        customCsv.csvText,
        customCsv.datasetName,
        override,
      );
    } else if (activeSource === "edtech" || activeSource === "telco") {
      void runPresetAnalysis(activeSource, override);
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
        presets={PRESET_DATASETS}
        activeSource={activeSource}
        loading={loading}
        canConfigureSchema={Boolean(report)}
        canExport={Boolean(report)}
        onSelectPreset={(id) => void runPresetAnalysis(id)}
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
        <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
          Melatih model Machine Learning &amp; menghitung skor risiko churn...
        </div>
      ) : (
        report && (
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
        )
      )}
    </div>
  );
}
