import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateCustomerRetentionPlan,
  generateSegmentRetentionPlan,
  type InteractionOutputLike,
  type RetentionGenAIClient,
} from "@/lib/retention-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const FeatureImportanceReqSchema = z.object({
  feature: z.string().max(80),
  label: z.string().max(100),
  importancePct: z.number().min(0).max(100),
  direction: z.enum(["increase", "decrease"]),
  directionLabel: z.string().max(60),
});

const CustomerDriverReqSchema = z.object({
  feature: z.string().max(80),
  label: z.string().max(100),
  value: z.string().max(120),
  contribution: z.number().finite(),
  direction: z.enum(["increase", "decrease"]),
});

const RetentionRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("segment"),
    datasetName: z.string().min(1).max(120),
    highRiskCount: z.number().int().min(0).max(100_000),
    totalCustomers: z.number().int().min(1).max(100_000),
    highRevenueAtRiskIdr: z.number().finite().min(0),
    topFeatures: z.array(FeatureImportanceReqSchema).max(10),
  }),
  z.object({
    mode: z.literal("customer"),
    datasetName: z.string().min(1).max(120),
    customer: z.object({
      rowKey: z.string().max(120).optional().default(""),
      id: z.string().min(1).max(80),
      name: z.string().min(1).max(120),
      segmentLabel: z.string().max(80),
      monthlyRevenueIdr: z.number().finite().min(0),
      churnProbability: z.number().min(0).max(100),
      riskSegment: z.enum(["High", "Medium", "Low"]),
      actualChurn: z.number().nullable().optional().default(null),
      topDrivers: z.array(CustomerDriverReqSchema).max(5),
      rawFeatures: z.record(z.string().max(80), z.string().max(120)).optional().default({}),
    }),
  }),
]);

function createServerRetentionClient(apiKey: string): RetentionGenAIClient {
  const ai = new GoogleGenAI({ apiKey });
  return {
    interactions: {
      create: async (params, options) => {
        const res = await ai.interactions.create(
          {
            model: params.model,
            input: params.input,
            system_instruction: params.system_instruction,
            response_format: params.response_format,
          },
          {
            timeout_ms: options?.timeout_ms,
            retries: options?.retries ?? { strategy: "none" },
            fetch_options: options?.fetch_options,
          },
        );
        return res as unknown as InteractionOutputLike;
      },
    },
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY belum dikonfigurasi di server. Tambahkan variabel lingkungan GEMINI_API_KEY terlebih dahulu.",
      },
      { status: 500 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Payload JSON tidak valid." },
      { status: 400 },
    );
  }

  const parsed = RetentionRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter permintaan rencana retensi tidak valid atau melebihi batas." },
      { status: 400 },
    );
  }

  try {
    const client = createServerRetentionClient(apiKey);
    const data = parsed.data;

    if (data.mode === "segment") {
      const plan = await generateSegmentRetentionPlan(client, {
        datasetName: data.datasetName,
        highRiskCount: data.highRiskCount,
        totalCustomers: data.totalCustomers,
        highRevenueAtRiskIdr: data.highRevenueAtRiskIdr,
        topFeatures: data.topFeatures,
      });
      return NextResponse.json({ mode: "segment", plan });
    }

    const plan = await generateCustomerRetentionPlan(client, {
      datasetName: data.datasetName,
      customer: {
        ...data.customer,
        rowKey: data.customer.rowKey || data.customer.id,
        actualChurn: data.customer.actualChurn ?? null,
        rawFeatures: data.customer.rawFeatures ?? {},
      },
    });
    return NextResponse.json({ mode: "customer", plan });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal menyusun strategi retensi AI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
