"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ListFilter,
  Search,
} from "lucide-react";
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

const SEGMENT_OPTIONS: Array<{ value: RiskSegment | "All"; label: string }> = [
  { value: "All", label: "Semua" },
  { value: "High", label: "Risiko Tinggi" },
  { value: "Medium", label: "Risiko Sedang" },
  { value: "Low", label: "Risiko Rendah" },
];

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
  const [filterOpen, setFilterOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPage(1);
  }, [segmentFilter]);

  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filterOpen]);

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

  const activeFilterCount = segmentFilter !== "All" ? 1 : 0;

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-950">
            Data Pelanggan
          </h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[12px] font-semibold text-zinc-700 tabular-nums">
            {filtered.length.toLocaleString("id-ID")}
          </span>
          {segmentFilter !== "All" && (
            <button
              type="button"
              onClick={() => onSelectSegmentFilter("All")}
              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              {segmentFilter === "High"
                ? "Risiko Tinggi"
                : segmentFilter === "Medium"
                  ? "Risiko Sedang"
                  : "Risiko Rendah"}{" "}
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="search"
              aria-label="Cari pelanggan berdasarkan nama, ID, atau paket"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama, ID, atau paket..."
              className="h-8.5 w-56 rounded-lg border border-zinc-200 bg-zinc-50 pl-8.5 pr-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-emerald-700 focus:bg-white focus:outline-none"
            />
          </div>

          <div ref={filterMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              aria-label="Filter segmen risiko"
              aria-expanded={filterOpen}
              aria-haspopup="dialog"
              title="Filter segmen risiko"
              className={`relative inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border shadow-2xs transition-all active:scale-[0.97] ${
                activeFilterCount > 0 || filterOpen
                  ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
              }`}
            >
              <ListFilter className="h-4 w-4" strokeWidth={1.85} />
              {activeFilterCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-bold text-white tabular-nums">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            {filterOpen ? (
              <div
                role="dialog"
                aria-label="Filter segmen risiko"
                className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-zinc-900">
                    Segmen Risiko
                  </span>
                  {activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSegmentFilter("All");
                        setPage(1);
                      }}
                      className="text-[12px] font-medium text-emerald-800 hover:underline"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {SEGMENT_OPTIONS.map((opt) => {
                    const active = segmentFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onSelectSegmentFilter(opt.value);
                          setPage(1);
                          setFilterOpen(false);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-left text-[12.5px] font-medium transition-colors ${
                          active
                            ? "bg-emerald-800 text-white"
                            : "text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onExportCsv}
            aria-label="Unduh CSV"
            title="Unduh CSV"
            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.97]"
          >
            <Download className="h-4 w-4" strokeWidth={1.85} />
          </button>
        </div>
      </div>

      {/* Single-scrollbar Table */}
      <div className="thin-scroll max-h-[calc(100vh-260px)] overflow-x-auto overflow-y-auto overscroll-contain">
        <table className="w-full min-w-[780px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/95 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-xs">
            <tr>
              <th className="py-3 pl-5 pr-4">Pelanggan</th>
              <th className="px-4 py-3">Paket / Segmen</th>
              {hasRevenue && (
                <th className="px-4 py-3 text-right">Tagihan / Bln</th>
              )}
              <th className="px-4 py-3 text-right">Risiko Churn</th>
              <th className="px-4 py-3">Faktor Utama</th>
              <th className="py-3 pl-4 pr-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={hasRevenue ? 6 : 5}
                  className="px-5 py-12 text-center text-[13px] text-zinc-500"
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
                const barClass =
                  c.riskSegment === "High"
                    ? "bg-rose-600"
                    : c.riskSegment === "Medium"
                      ? "bg-amber-500"
                      : "bg-emerald-600";
                const topDriver = c.topDrivers[0];

                return (
                  <tr
                    key={c.rowKey}
                    onClick={() => onSelectCustomer(c)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-emerald-50/40" : "hover:bg-zinc-50/90"
                    }`}
                  >
                    <td className="py-3 pl-5 pr-4">
                      <div className="font-semibold text-zinc-950">
                        {c.name}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-400">
                        {c.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {c.segmentLabel}
                    </td>
                    {hasRevenue && (
                      <td className="px-4 py-3 text-right font-medium text-zinc-900 tabular-nums">
                        {formatIdr(c.monthlyRevenueIdr)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="inline-flex items-center justify-end gap-2.5">
                        <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-zinc-100 sm:block">
                          <div
                            className={`h-full rounded-full ${barClass}`}
                            style={{ width: `${c.churnProbability}%` }}
                          />
                        </div>
                        <span
                          className={`inline-flex min-w-[46px] items-center justify-center rounded-md border px-2 py-0.5 text-[12px] font-semibold ${badgeClass}`}
                        >
                          {c.churnProbability}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {topDriver ? (
                        <span>
                          {topDriver.label}:{" "}
                          <span className="font-medium text-zinc-900">
                            {topDriver.value}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pl-4 pr-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(c);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 shadow-2xs transition-all hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 active:scale-[0.97]"
                      >
                        <span>Detail</span>
                        <ChevronRight
                          className="h-3.5 w-3.5 text-zinc-400"
                          strokeWidth={1.75}
                        />
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
      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/70 px-5 py-3 text-[12px] text-zinc-500">
        <div className="tabular-nums">
          Halaman <span className="font-semibold text-zinc-900">{safePage}</span>{" "}
          dari {totalPages} · diurutkan dari risiko tertinggi
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 font-medium text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 font-medium text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Berikutnya
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
