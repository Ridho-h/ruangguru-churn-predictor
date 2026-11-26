"use client";

import { useRef } from "react";
import { Download, SlidersHorizontal, Upload } from "lucide-react";

interface TopBarProps {
  activeDatasetName: string | null;
  loading: boolean;
  canConfigureSchema: boolean;
  canExport: boolean;
  onUploadFile: (file: File) => void;
  onOpenSchema: () => void;
  onExportCsv: () => void;
}

export function TopBar({
  activeDatasetName,
  loading,
  canConfigureSchema,
  canExport,
  onUploadFile,
  onOpenSchema,
  onExportCsv,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            Customer Churn Predictor &amp; Retention Planner
          </h1>
          <p className="text-xs text-slate-600">
            {activeDatasetName
              ? `Dataset aktif: ${activeDatasetName} · L2 Logistic Regression & Gemini AI`
              : "Unggah CSV data pelanggan untuk prediksi risiko churn & rencana retensi AI"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {activeDatasetName ? "Unggah CSV Lain" : "Unggah CSV"}
          </button>

          <button
            type="button"
            disabled={loading || !canConfigureSchema}
            onClick={onOpenSchema}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:opacity-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
            Pemetaan Kolom
          </button>

          <button
            type="button"
            disabled={loading || !canExport}
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            Export CSV
          </button>
        </div>
      </div>
    </header>
  );
}
