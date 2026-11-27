"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileText, Loader2, X } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCopied(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [customer?.rowKey]);

  useEffect(() => {
    if (!customer) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
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
      className="fixed inset-0 z-40 flex justify-end bg-zinc-950/30 backdrop-blur-[1px]"
      onClick={onClose}
      onWheel={(e) => {
        if (
          scrollRef.current &&
          !scrollRef.current.contains(e.target as Node)
        ) {
          scrollRef.current.scrollTop += e.deltaY;
        }
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detail Pelanggan dan Saran Tindak Lanjut"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col border-l border-stone-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#FAF9F6] px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold tracking-tight text-zinc-950">
                {customer.name}
              </h2>
              <span
                className={`rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums ${badgeClass}`}
              >
                {customer.churnProbability}% Risiko
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500 tabular-nums">
              <span className="font-mono">{customer.id}</span> ·{" "}
              {customer.segmentLabel} · {formatIdr(customer.monthlyRevenueIdr)}
              /bln
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-200/70 hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 divide-y divide-stone-100 overflow-y-auto overscroll-contain px-6"
        >
          {/* Drivers */}
          <section className="py-5">
            <h3 className="text-[13px] font-bold text-zinc-900">
              Penyebab Risiko Pelanggan Ini
            </h3>
            <div className="mt-3.5 space-y-3.5">
              {customer.topDrivers.map((d) => {
                const isInc = d.direction === "increase";
                const pct = Math.max(
                  10,
                  (Math.abs(d.contribution) / maxContrib) * 100,
                );
                return (
                  <div key={d.feature}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-stone-600">
                        {d.label}:{" "}
                        <span className="font-semibold text-zinc-950">
                          {d.value}
                        </span>
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          isInc ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {isInc ? "Mendorong churn" : "Menahan churn"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full ${
                          isInc ? "bg-rose-600" : "bg-emerald-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Retention Follow-up */}
          <section className="py-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-bold text-zinc-900">
                Saran Tindak Lanjut
              </h3>
              <button
                type="button"
                disabled={loading}
                onClick={() => onGeneratePlan(customer)}
                className="btn-emerald inline-flex h-8.5 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                {loading
                  ? "Menyusun..."
                  : plan
                    ? "Buat Ulang"
                    : "Buat Saran & Draf"}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
              >
                {error}
              </div>
            )}

            {!plan && !loading && !error && (
              <p className="mt-2.5 text-xs leading-relaxed text-stone-500">
                Buat rekomendasi penawaran dan draf pesan WhatsApp atau email
                yang siap dikirim ke pelanggan ini.
              </p>
            )}

            {plan && (
              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <div className="font-semibold text-zinc-900">Ringkasan</div>
                  <p className="mt-1 leading-relaxed text-stone-600">
                    {plan.riskDiagnosis}
                  </p>
                </div>

                <div>
                  <div className="font-semibold text-zinc-900">
                    Langkah 48 Jam ke Depan
                  </div>
                  <p className="mt-1 leading-relaxed text-stone-600">
                    {plan.recommendedAction}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200/80 bg-[#FAF9F6] p-3.5 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-medium text-stone-500">
                      Saran Penawaran
                    </div>
                    <div className="mt-0.5 font-semibold text-zinc-900">
                      {plan.recommendedOffer}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-stone-500">
                      Kanal
                    </div>
                    <div className="mt-0.5 font-semibold text-emerald-800">
                      {plan.channel}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900">
                      Draf Pesan
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(plan.outreachMessage)}
                      className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-2xs transition-colors hover:bg-stone-50"
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
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-zinc-800">
                    {plan.outreachMessage}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* All Customer Data */}
          <section className="py-5">
            <h3 className="text-[13px] font-bold text-zinc-900">
              Data Pelanggan
            </h3>
            <dl className="mt-2.5 divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-[#FAF9F6]/60 px-3.5">
              {Object.entries(customer.rawFeatures).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 py-2.5 text-xs"
                >
                  <dt className="text-stone-500">{formatFeatureLabel(key)}</dt>
                  <dd className="font-semibold text-zinc-900 tabular-nums">
                    {val}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}
