"use client";

import { useRef } from "react";
import { Download, SlidersHorizontal, Upload } from "lucide-react";
import type { PresetDatasetInfo } from "@/lib/types";

interface TopBarProps {
  presets: PresetDatasetInfo[];
  activeSource: string;
  loading: boolean;
  canConfigureSchema: boolean;
  canExport: boolean;
  onSelectPreset: (presetId: "edtech" | "telco") => void;
  onUploadFile: (file: File) => void;
  onOpenSchema: () => void;
  onExportCsv: () => void;
}

export function TopBar({
  presets,
  activeSource,
  loading,
  canConfigureSchema,
  canExport,
  onSelectPreset,
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
            Prediksi risiko churn deterministik (L2 Logistic Regression) &amp; rencana retensi AI
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            {presets.map((p) => {
              const isActive = activeSource === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={loading}
                  onClick={() => onSelectPreset(p.id)}
                  className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:opacity-50 ${
                    isActive
                      ? "bg-teal-700 text-white"
                      : "text-slate-700 hover:bg-slate-200/70"
                  }`}
                >
                  {p.shortLabel}
                </button>
              );
            })}
          </div>

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
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5 text-slate-600" />
            Unggah CSV
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
