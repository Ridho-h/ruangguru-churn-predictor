import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCsv } from "@/lib/csv";
import { analyzeChurnDataset } from "@/lib/ml/pipeline";
import { loadPresetCsv, PRESET_DATASETS } from "@/lib/presets";
import type { SchemaOverride } from "@/lib/types";

export const runtime = "nodejs";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);

const SchemaOverrideZod = z
  .object({
    targetColumn: z.string().max(100).nullable().optional(),
    revenueColumn: z.string().max(100).nullable().optional(),
    selectedFeatures: z.array(z.string().max(100)).max(60).optional(),
  })
  .optional();

const AnalyzeJsonBodyZod = z.object({
  presetId: z.enum(["edtech", "telco"]).optional(),
  csvText: z.string().optional(),
  datasetName: z.string().max(120).optional(),
  schemaOverride: SchemaOverrideZod,
});

function findMatchingPresetReference(csvText: string): string | undefined {
  try {
    const incoming = parseCsv(csvText);
    const incomingCols = new Set(incoming.headers.map((h) => h.toLowerCase()));
    if (incomingCols.has("churn")) return undefined;

    for (const preset of PRESET_DATASETS) {
      const loaded = loadPresetCsv(preset.id);
      const refParsed = parseCsv(loaded.csvText);
      const refFeatures = refParsed.headers
        .map((h) => h.toLowerCase())
        .filter((h) => h !== "churn" && h !== "customer_id" && h !== "customer_name");
      const matched = refFeatures.filter((f) => incomingCols.has(f)).length;
      if (matched >= Math.ceil(refFeatures.length * 0.8)) {
        return loaded.csvText;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let csvText = "";
    let datasetName = "custom_customers.csv";
    let schemaOverride: SchemaOverride | undefined;
    let isCustomUpload = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const overrideRaw = formData.get("schemaOverride");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "File CSV tidak ditemukan dalam permintaan." },
          { status: 400 },
        );
      }
      if (!file.name.toLowerCase().endsWith(".csv")) {
        return NextResponse.json(
          { error: "Format file harus .csv (UTF-8)." },
          { status: 400 },
        );
      }
      if (!ALLOWED_MIME_TYPES.has((file.type || "").toLowerCase())) {
        return NextResponse.json(
          { error: `Tipe file tidak didukung (${file.type}). Unggah file CSV teks biasa.` },
          { status: 400 },
        );
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "Ukuran file melebihi batas maksimum 5 MB." },
          { status: 413 },
        );
      }

      csvText = await file.text();
      datasetName = file.name.slice(0, 120);
      isCustomUpload = true;
      if (typeof overrideRaw === "string" && overrideRaw.trim()) {
        const parsedOverride = SchemaOverrideZod.safeParse(JSON.parse(overrideRaw));
        if (!parsedOverride.success) {
          return NextResponse.json(
            { error: "Format schemaOverride tidak valid." },
            { status: 400 },
          );
        }
        schemaOverride = parsedOverride.data;
      }
    } else {
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Payload JSON tidak valid." },
          { status: 400 },
        );
      }

      const parsedBody = AnalyzeJsonBodyZod.safeParse(rawBody);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Parameter analisis tidak valid." },
          { status: 400 },
        );
      }

      const body = parsedBody.data;
      schemaOverride = body.schemaOverride;

      if (body.presetId) {
        const loaded = loadPresetCsv(body.presetId);
        csvText = loaded.csvText;
        datasetName = loaded.preset.filename;
      } else if (typeof body.csvText === "string" && body.csvText.trim()) {
        if (Buffer.byteLength(body.csvText, "utf-8") > MAX_UPLOAD_BYTES) {
          return NextResponse.json(
            { error: "Ukuran data CSV melebihi batas maksimum 5 MB." },
            { status: 413 },
          );
        }
        csvText = body.csvText;
        datasetName = body.datasetName?.trim() || "custom_customers.csv";
        isCustomUpload = true;
      } else {
        return NextResponse.json(
          { error: "Pilih preset dataset atau unggah file CSV terlebih dahulu." },
          { status: 400 },
        );
      }
    }

    const referenceCsvText = isCustomUpload
      ? findMatchingPresetReference(csvText)
      : undefined;

    const report = analyzeChurnDataset({
      csvText,
      datasetName,
      schemaOverride,
      referenceCsvText,
    });

    return NextResponse.json(report);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal memproses dataset CSV untuk prediksi churn.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
