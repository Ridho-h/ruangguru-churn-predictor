"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import type { RiskSegment, ScoredCustomer } from "@/lib/types";
import { formatIdr } from "./formatters";

interface CustomerTableProps {
  customers: ScoredCustomer[];
  hasRevenue: boolean;
  segmentFilter: RiskSegment | "All";
  selectedCustomerId: string | null;
  onSelectSegmentFilter: (seg: RiskSegment | "All") => void;
  onSelectCustomer: (customer: ScoredCustomer) => void;
  onExportCsv: () => void;
}

const PAGE_SIZE = 25;

export function CustomerTable({
  customers,
  hasRevenue,
  segmentFilter,
  selectedCustomerId,
  onSelectSegmentFilter,
  onSelectCustomer,
  onExportCsv,
}: CustomerTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [segmentFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (segmentFilter !== "All" && c.riskSegment !== segmentFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.segmentLabel.toLowerCase().includes(q)
      );
    });
  }, [customers, query, segmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-stone-950">
            Daftar Pelanggan
          </h2>
          <p className="text-xs text-stone-500 tabular-nums">
            Menampilkan {filtered.length.toLocaleString("id-ID")} dari{" "}
            {customers.length.toLocaleString("id-ID")} pelanggan · urut dari
            risiko tertinggi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="search"
              aria-label="Cari pelanggan berdasarkan nama, ID, atau paket"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama, ID, atau paket..."
              className="w-52 rounded-md border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none"
            />
          </div>

          <div className="inline-flex rounded-md border border-stone-200 bg-stone-50 p-0.5 text-xs">
            {(["All", "High", "Medium", "Low"] as const).map((seg) => {
              const label =
                seg === "All"
                  ? "Semua"
                  : seg === "High"
                    ? "Tinggi"
                    : seg === "Medium"
                      ? "Sedang"
                      : "Rendah";
              const active = segmentFilter === seg;
              return (
                <button
                  key={seg}
                  type="button"
                  onClick={() => {
                    onSelectSegmentFilter(seg);
                    setPage(1);
                  }}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    active
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-950"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-50"
          >
            <Download className="h-3.5 w-3.5 text-stone-500" />
            Unduh CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-medium text-stone-500">
              <th className="px-4 py-2.5">Pelanggan</th>
              <th className="px-4 py-2.5">Paket / Segmen</th>
              {hasRevenue && (
                <th className="px-4 py-2.5 text-right">Tagihan / Bln</th>
              )}
              <th className="px-4 py-2.5 text-right">Risiko Churn</th>
              <th className="px-4 py-2.5">Faktor Utama</th>
              <th className="px-4 py-2.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={hasRevenue ? 6 : 5}
                  className="px-4 py-10 text-center text-xs text-stone-500"
                >
                  Tidak ada pelanggan yang cocok dengan filter pencarian saat
                  ini.
                </td>
              </tr>
            ) : (
              pageRows.map((c) => {
                const isSelected = c.rowKey === selectedCustomerId;
                const badgeClass =
                  c.riskSegment === "High"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : c.riskSegment === "Medium"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200";
                const topDriver = c.topDrivers[0];

                return (
                  <tr
                    key={c.rowKey}
                    onClick={() => onSelectCustomer(c)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-stone-100/80" : "hover:bg-stone-50"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-stone-950">{c.name}</div>
                      <div className="font-mono text-[11px] text-stone-500">
                        {c.id}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-stone-700">
                      {c.segmentLabel}
                    </td>
                    {hasRevenue && (
                      <td className="px-4 py-2.5 text-right font-medium text-stone-900 tabular-nums">
                        {formatIdr(c.monthlyRevenueIdr)}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 font-semibold ${badgeClass}`}
                      >
                        {c.churnProbability}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">
                      {topDriver ? (
                        <span>
                          {topDriver.label}:{" "}
                          <span className="font-medium text-stone-900">
                            {topDriver.value}
                          </span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(c);
                        }}
                        className="rounded border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-800 hover:border-stone-400 hover:bg-stone-50"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-xs text-stone-500 sm:px-5">
        <div className="tabular-nums">
          Halaman {safePage} dari {totalPages}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            Berikutnya
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
