"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { InferredSchema, SchemaOverride } from "@/lib/types";

interface SchemaModalProps {
  open: boolean;
  schema: InferredSchema;
  onClose: () => void;
  onApply: (override: SchemaOverride) => void;
}

export function SchemaModal({
  open,
  schema,
  onClose,
  onApply,
}: SchemaModalProps) {
  const [targetCol, setTargetCol] = useState<string>(schema.targetColumn ?? "");
  const [revenueCol, setRevenueCol] = useState<string>(
    schema.revenueColumn ?? "",
  );
  const allCandidates = Array.from(
    new Set([
      ...(schema.candidateFeatures ?? []),
      ...schema.numericFeatures,
      ...schema.categoricalFeatures,
    ]),
  );
  const activeFeatures = [
    ...schema.numericFeatures,
    ...schema.categoricalFeatures,
  ];
  const [selectedFeatures, setSelectedFeatures] =
    useState<string[]>(activeFeatures);

  useEffect(() => {
    if (!open) return;
    setTargetCol(schema.targetColumn ?? "");
    setRevenueCol(schema.revenueColumn ?? "");
    setSelectedFeatures([
      ...schema.numericFeatures,
      ...schema.categoricalFeatures,
    ]);
  }, [open, schema]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const toggleFeature = (col: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pengaturan Pemetaan Kolom CSV"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Pengaturan Pemetaan Kolom (Auto-Schema Mapper)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-xs">
          <div>
            <label
              htmlFor="schema-target-col"
              className="block font-medium text-slate-700"
            >
              Kolom Target Churn (opsional — kosongkan untuk mode tanpa label)
            </label>
            <select
              id="schema-target-col"
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="">
                -- Tidak ada (Mode Prediksi Tanpa Label) --
              </option>
              {schema.allColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="schema-revenue-col"
              className="block font-medium text-slate-700"
            >
              Kolom Pendapatan Bulanan / MRR (opsional)
            </label>
            <select
              id="schema-revenue-col"
              value={revenueCol}
              onChange={(e) => setRevenueCol(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="">-- Tidak ada --</option>
              {schema.allColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="font-medium text-slate-700">
              Fitur Aktif untuk Model ML ({selectedFeatures.length} dipilih)
            </div>
            <div className="mt-2 grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded border border-slate-200 p-2.5">
              {allCandidates.map((col) => (
                <label
                  key={col}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(col)}
                    onChange={() => toggleFeature(col)}
                    className="rounded border-slate-300 text-teal-700"
                  />
                  <span className="truncate text-slate-800">{col}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={selectedFeatures.length === 0}
            onClick={() => {
              onApply({
                targetColumn: targetCol || null,
                revenueColumn: revenueCol || null,
                selectedFeatures,
              });
              onClose();
            }}
            className="rounded-md bg-teal-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            Jalankan Ulang Analisis
          </button>
        </div>
      </div>
    </div>
  );
}
