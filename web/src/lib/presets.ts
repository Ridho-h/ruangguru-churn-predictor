import fs from "node:fs";
import path from "node:path";
import { PRESET_DATASETS } from "./presets-client";
import type { PresetDatasetInfo } from "./types";

export { PRESET_DATASETS };

export function loadPresetCsv(presetId: string): {
  preset: PresetDatasetInfo;
  csvText: string;
} {
  const preset = PRESET_DATASETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new Error(`Preset dataset "${presetId}" tidak ditemukan.`);
  }
  const filePath = path.join(
    process.cwd(),
    "public",
    "datasets",
    preset.filename,
  );
  const csvText = fs.readFileSync(filePath, "utf-8");
  return { preset, csvText };
}
