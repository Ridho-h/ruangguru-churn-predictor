import type { PresetDatasetInfo } from "./types";

export const PRESET_DATASETS: PresetDatasetInfo[] = [
  {
    id: "edtech",
    label: "Langganan EdTech / SaaS Indonesia (1.000 Pelanggan)",
    shortLabel: "EdTech / SaaS (1.000)",
    filename: "edtech_saas_indonesia_1000.csv",
    description:
      "Data pelanggan platform belajar & SaaS berlangganan (Starter/Pro/Enterprise).",
    rows: 1000,
  },
  {
    id: "telco",
    label: "Telco / ISP Fiber Indonesia (1.000 Pelanggan)",
    shortLabel: "Telco / ISP (1.000)",
    filename: "telco_isp_indonesia_1000.csv",
    description:
      "Data pelanggan internet fiber & korporat Indonesia.",
    rows: 1000,
  },
];
