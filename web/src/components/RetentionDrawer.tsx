"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Sparkles, X } from "lucide-react";
import { formatFeatureLabel } from "@/lib/schema-mapper";
import type { CustomerRetentionPlan, ScoredCustomer } from "@/lib/types";
import { formatIdr } from "./formatters";

interface RetentionDrawerProps {
  customer: ScoredCustomer | null;
  plan: CustomerRetentionPlan | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onGeneratePlan: (customer: ScoredCustomer) => void;
}

export function RetentionDrawer({
  customer,
  plan,
  loading,
  error,
  onClose,
  onGeneratePlan,
}: RetentionDrawerProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [customer?.rowKey]);

  useEffect(() => {
    if (!customer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [customer, onClose]);

  if (!customer) return null;

  const badgeClass =
    customer.riskSegment === "High"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : customer.riskSegment === "Medium"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-emerald-50 text-emerald-800 border-emerald-200";

  const maxContrib = Math.max(
    0.1,
    ...customer.topDrivers.map((d) => Math.abs(d.contribution)),
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/35"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detail Pelanggan dan Rencana Retensi"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                {customer.name}
              </h2>
              <span
                className={`rounded border px-2 py-0.5 text-xs font-semibold tabular-nums ${badgeClass}`}
              >
                {customer.churnProbability}% Risiko
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
              <span className="font-mono">{customer.id}</span> ·{" "}
              {customer.segmentLabel} · {formatIdr(customer.monthlyRevenueIdr)}
              /bln
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Local Attribution Drivers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              3 Faktor Pendorong Risiko Lokal
            </h3>
            <div className="mt-2.5 space-y-2.5">
              {customer.topDrivers.map((d) => {
                const isInc = d.direction === "increase";
                const pct = Math.max(
                  10,
                  (Math.abs(d.contribution) / maxContrib) * 100,
                );
                return (
                  <div
                    key={d.feature}
                    className="rounded-md border border-slate-200 bg-slate-50/70 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800">
                        {d.label}:{" "}
                        <span className="font-semibold text-slate-900">
                          {d.value}
                        </span>
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          isInc ? "text-rose-700" : "text-teal-700"
                        }`}
                      >
                        {isInc ? "Mendorong Churn" : "Menahan Churn"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          isInc ? "bg-rose-600" : "bg-teal-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gemini 1-on-1 Retention Planner */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Rencana Retensi Personal 1-on-1 (AI)
              </h3>
              <button
                type="button"
                disabled={loading}
                onClick={() => onGeneratePlan(customer)}
                className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {loading
                  ? "Menyusun..."
                  : plan
                    ? "Buat Ulang"
                    : "Susun Rencana AI"}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
              >
                {error}
              </div>
            )}

            {!plan && !loading && !error && (
              <p className="mt-2.5 text-xs text-slate-600">
                Klik <strong>Susun Rencana AI</strong> untuk menghasilkan
                diagnosis risiko, rekomendasi tawaran, dan draf pesan outreach
                WhatsApp/Email siap kirim.
              </p>
            )}

            {plan && (
              <div className="mt-3 space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">
                    Diagnosis Risiko
                  </div>
                  <p className="mt-0.5 leading-relaxed text-slate-700">
                    {plan.riskDiagnosis}
                  </p>
                </div>

                <div>
                  <div className="font-semibold text-slate-900">
                    Langkah Aksi 48 Jam
                  </div>
                  <p className="mt-0.5 leading-relaxed text-slate-700">
                    {plan.recommendedAction}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                    <div className="text-[11px] font-medium text-slate-500">
                      Rekomendasi Penawaran
                    </div>
                    <div className="mt-0.5 font-medium text-slate-900">
                      {plan.recommendedOffer}
                    </div>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                    <div className="text-[11px] font-medium text-slate-500">
                      Kanal Outreach
                    </div>
                    <div className="mt-0.5 font-medium text-teal-800">
                      {plan.channel}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-teal-200 bg-teal-50/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      Draf Pesan Siap Kirim
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(plan.outreachMessage)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Salin Pesan
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-800">
                    {plan.outreachMessage}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* All Customer Feature Values */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Profil Data Fitur Pelanggan
            </h3>
            <dl className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
              {Object.entries(customer.rawFeatures).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                >
                  <dt className="text-slate-600">{formatFeatureLabel(key)}</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">
                    {val}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </aside>
    </div>
  );
}
