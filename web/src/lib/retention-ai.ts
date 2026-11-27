import {
  CustomerRetentionPlanSchema,
  SegmentRetentionPlanSchema,
  type CustomerRetentionPlan,
  type FeatureImportanceItem,
  type ScoredCustomer,
  type SegmentRetentionPlan,
} from "./types";

export const PRIMARY_RETENTION_MODEL = "gemini-3.5-flash-lite";
export const FALLBACK_RETENTION_MODELS = ["gemini-3.1-flash-lite"] as const;
export const RETENTION_TOTAL_TIMEOUT_MS = 30_000;
export const PRIMARY_ATTEMPT_TIMEOUT_MS = 16_000;

export interface InteractionOutputLike {
  output_text?: string;
  outputs?: Array<{ type?: string; text?: string }>;
  steps?: Array<{
    outputs?: Array<{ type?: string; text?: string }>;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

export interface RetentionGenAIClient {
  interactions: {
    create(
      params: {
        model: string;
        input: string;
        system_instruction?: string;
        response_format?: {
          type: "text";
          mime_type: "application/json";
          schema: Record<string, unknown>;
        };
        generation_config?: {
          temperature?: number;
        };
      },
      options?: {
        timeout_ms?: number;
        retries?: { strategy: "none" };
        fetch_options?: { signal?: AbortSignal };
      },
    ): Promise<InteractionOutputLike>;
  };
}

const SEGMENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary",
    "estimatedSaveableRevenueIdr",
    "assumptionNote",
    "playbooks",
  ],
  properties: {
    executiveSummary: { type: "string" },
    estimatedSaveableRevenueIdr: { type: "number" },
    assumptionNote: { type: "string" },
    playbooks: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "targetCondition",
          "tactic",
          "channel",
          "successMetric",
        ],
        properties: {
          title: { type: "string" },
          targetCondition: { type: "string" },
          tactic: { type: "string" },
          channel: { type: "string" },
          successMetric: { type: "string" },
        },
      },
    },
  },
};

const CUSTOMER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "riskDiagnosis",
    "recommendedAction",
    "recommendedOffer",
    "channel",
    "outreachMessage",
  ],
  properties: {
    riskDiagnosis: { type: "string" },
    recommendedAction: { type: "string" },
    recommendedOffer: { type: "string" },
    channel: { type: "string" },
    outreachMessage: { type: "string" },
  },
};

const SYSTEM_INSTRUCTION =
  "Anda adalah Head of Growth & Customer Retention di perusahaan teknologi Indonesia. " +
  "Susun strategi retensi yang konkret, terukur, realistis, dan berbasis data penyebab churn. " +
  "Gunakan Bahasa Indonesia operasional bisnis yang lugas tanpa emoji dan tanpa bahasa promosi berlebihan.";

function extractText(response: InteractionOutputLike): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }
  if (Array.isArray(response.outputs)) {
    const joined = response.outputs
      .filter((p) => typeof p?.text === "string")
      .map((p) => p.text as string)
      .join("\n")
      .trim();
    if (joined) return joined;
  }
  if (Array.isArray(response.steps)) {
    const parts: string[] = [];
    for (const step of response.steps) {
      for (const item of [...(step.outputs ?? []), ...(step.content ?? [])]) {
        if (typeof item?.text === "string") parts.push(item.text);
      }
    }
    const joined = parts.join("\n").trim();
    if (joined) return joined;
  }
  throw new Error("Respons AI tidak berisi teks JSON.");
}

function stripFence(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return t;
}

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; status?: number; statusCode?: number; message?: string };
  const status = e.status ?? e.statusCode;
  const msg = (e.message ?? "").toLowerCase();
  const name = (e.name ?? "").toLowerCase();
  if (status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  if (name.includes("timeout") || name.includes("abort")) return true;
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("timeout")
  );
}

function formatErrorId(err: unknown): string {
  if (!err || typeof err !== "object") {
    return "Gagal menyusun strategi retensi dari Gemini AI.";
  }
  const e = err as { status?: number; statusCode?: number; message?: string };
  const status = e.status ?? e.statusCode;
  const msg = (e.message ?? "").toLowerCase();
  if (status === 401 || status === 403 || msg.includes("api key")) {
    return "Autentikasi GEMINI_API_KEY ditolak. Periksa konfigurasi API key server.";
  }
  if (status === 429 || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("rate limit")) {
    return "Batas kuota Gemini API sedang tercapai. Coba lagi beberapa saat.";
  }
  if (status === 503 || msg.includes("503") || msg.includes("overloaded")) {
    return "Layanan Gemini AI sedang padat. Silakan ulangi beberapa saat lagi.";
  }
  return "Gagal menyusun strategi retensi. Silakan coba lagi.";
}

async function runWithTimeout<T>(
  op: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      op(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          const err = new Error("Permintaan Gemini AI melebihi batas waktu (30 detik).");
          err.name = "TimeoutError";
          reject(err);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callStructuredGemini<T>(
  client: RetentionGenAIClient,
  prompt: string,
  jsonSchema: Record<string, unknown>,
  parseFn: (data: unknown) => T,
): Promise<{ result: T; modelUsed: string }> {
  const models = [PRIMARY_RETENTION_MODEL, ...FALLBACK_RETENTION_MODELS];
  const deadline = Date.now() + RETENTION_TOTAL_TIMEOUT_MS;
  let lastError: unknown;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 1_000) break;
    const attemptTimeoutMs =
      i === 0 ? Math.min(PRIMARY_ATTEMPT_TIMEOUT_MS, remainingMs) : remainingMs;

    try {
      const response = await runWithTimeout(
        (signal) =>
          client.interactions.create(
            {
              model,
              input: prompt,
              system_instruction: SYSTEM_INSTRUCTION,
              response_format: {
                type: "text",
                mime_type: "application/json",
                schema: jsonSchema,
              },
            },
            {
              timeout_ms: attemptTimeoutMs,
              retries: { strategy: "none" },
              fetch_options: { signal },
            },
          ),
        attemptTimeoutMs,
      );

      const raw = stripFence(extractText(response));
      const parsed = parseFn(JSON.parse(raw));
      return { result: parsed, modelUsed: model };
    } catch (err) {
      lastError = err;
      if (i < models.length - 1 && isTransientError(err)) {
        continue;
      }
      break;
    }
  }

  throw new Error(formatErrorId(lastError));
}

export interface SegmentPlanInput {
  datasetName: string;
  highRiskCount: number;
  totalCustomers: number;
  highRevenueAtRiskIdr: number;
  topFeatures: FeatureImportanceItem[];
}

export async function generateSegmentRetentionPlan(
  client: RetentionGenAIClient,
  input: SegmentPlanInput,
): Promise<SegmentRetentionPlan> {
  const driversText = input.topFeatures
    .slice(0, 6)
    .map(
      (f, idx) =>
        `${idx + 1}. ${f.label} (${f.importancePct}% — ${f.directionLabel})`,
    )
    .join("\n");

  const prompt = [
    `Dataset: ${input.datasetName}`,
    `Total Pelanggan: ${input.totalCustomers}`,
    `Pelanggan Risiko Tinggi (>= 70%): ${input.highRiskCount} (${((input.highRiskCount / Math.max(1, input.totalCustomers)) * 100).toFixed(1)}%)`,
    `Total Pendapatan Bulanan Berisiko (MRR at Risk): Rp ${input.highRevenueAtRiskIdr.toLocaleString("id-ID")}`,
    "",
    "Faktor Utama Penyebab Churn (Global Feature Importance):",
    driversText || "-",
    "",
    "Tugas: Susun 3 playbook retensi prioritas untuk menyelamatkan segmen risiko tinggi dalam 30 hari ke depan.",
    "Aturan keringkasan: tulis jelas, operasional, dan nyaman dibaca — executiveSummary 1-2 kalimat (20-35 kata), title maks. 6 kata, targetCondition 15-22 kata, tactic 25-35 kata yang konkret, successMetric 10-16 kata.",
    "Hitung estimatedSaveableRevenueIdr secara realistis (sekitar 25%-40% dari total MRR at Risk) dan tulis assumptionNote singkat (maks. 8 kata).",
    "Kembalikan HANYA 1 objek JSON valid sesuai skema.",
  ].join("\n");

  const { result, modelUsed } = await callStructuredGemini(
    client,
    prompt,
    SEGMENT_JSON_SCHEMA,
    (data) => SegmentRetentionPlanSchema.parse(data),
  );
  return { ...result, modelUsed };
}

export interface CustomerPlanInput {
  datasetName: string;
  customer: ScoredCustomer;
}

export async function generateCustomerRetentionPlan(
  client: RetentionGenAIClient,
  input: CustomerPlanInput,
): Promise<CustomerRetentionPlan> {
  const c = input.customer;
  const driversText = c.topDrivers
    .map(
      (d) =>
        `- ${d.label}: nilai="${d.value}" (${d.direction === "increase" ? "mendorong churn" : "menahan churn"}, bobot ${d.contribution})`,
    )
    .join("\n");

  const prompt = [
    `Dataset: ${input.datasetName}`,
    `Pelanggan: ${c.name} (${c.id})`,
    `Paket/Segmen: ${c.segmentLabel}`,
    `Tagihan Bulanan (MRR): Rp ${c.monthlyRevenueIdr.toLocaleString("id-ID")}`,
    `Skor Risiko Churn: ${c.churnProbability}% (${c.riskSegment})`,
    "",
    "3 Faktor Pendorong Lokal Terkuat:",
    driversText || "-",
    "",
    "Tugas: Buat rencana retensi personal 1-on-1 untuk tim Customer Success / Account Manager.",
    "Sertakan outreachMessage berbahasa Indonesia yang sopan, menyebut nama pelanggan, menyentuh akar masalah spesifiknya, dan langsung siap kirim via WhatsApp/Email.",
    "Kembalikan HANYA 1 objek JSON valid sesuai skema.",
  ].join("\n");

  const { result, modelUsed } = await callStructuredGemini(
    client,
    prompt,
    CUSTOMER_JSON_SCHEMA,
    (data) => CustomerRetentionPlanSchema.parse(data),
  );
  return { ...result, modelUsed };
}
