import type { PresetDatasetInfo } from "./types";

export const PRESET_DATASETS: PresetDatasetInfo[] = [
  {
    id: "edtech",
    label: "Dataset Contoh Pelanggan (dummy.csv — 1.000 Baris)",
    shortLabel: "dummy.csv (1.000)",
    filename: "dummy.csv",
    description:
      "Dataset contoh 1.000 pelanggan langganan (paket Starter/Pro/Enterprise, sesi aktif mingguan, hari terakhir login, tiket support, keterlambatan bayar, NPS).",
    rows: 1000,
  },
];
