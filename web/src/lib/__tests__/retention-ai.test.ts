import { describe, expect, it } from "vitest";
import {
  generateCustomerRetentionPlan,
  generateSegmentRetentionPlan,
  type RetentionGenAIClient,
} from "../retention-ai";

describe("Gemini AI Retention Planner (Review Focus #5)", () => {
  it("strips markdown fences, validates Zod schema, and falls back from 3.5-flash-lite to 3.1-flash-lite on 503", async () => {
    const modelsCalled: string[] = [];
    const mockClient: RetentionGenAIClient = {
      interactions: {
        async create(params) {
          modelsCalled.push(params.model);
          if (modelsCalled.length === 1) {
            const err = new Error("503 service unavailable");
            (err as { status?: number }).status = 503;
            throw err;
          }
          return {
            output_text:
              '```json\n{"executiveSummary":"Segmen risiko tinggi terkonsentrasi pada kontrak bulanan dengan keterlambatan bayar.","estimatedSaveableRevenueIdr":45000000,"assumptionNote":"Asumsi konservatif 35% pelanggan risiko tinggi berhasil dipertahankan.","playbooks":[{"title":"Konversi Kontrak Tahunan","targetCondition":"Kontrak bulanan dengan skor churn >= 70%","tactic":"Diskon 15% untuk migrasi kontrak tahunan + onboarding ulang.","channel":"WhatsApp & Telepon CS","successMetric":"Konversi >= 25% dalam 30 hari"},{"title":"Proactive Support Rescue","targetCondition":"Tiket support >= 3 dalam 30 hari","tactic":"Prioritas SLA 4 jam dan sesi troubleshooting 1-on-1.","channel":"Telepon CS","successMetric":"CSAT >= 4.5 dan penurunan churn 30%"}]}\n```',
          };
        },
      },
    };

    const plan = await generateSegmentRetentionPlan(mockClient, {
      datasetName: "edtech_saas_indonesia_1000.csv",
      highRiskCount: 180,
      totalCustomers: 1000,
      highRevenueAtRiskIdr: 120_000_000,
      topFeatures: [
        {
          feature: "last_login_days_ago",
          label: "Hari Sejak Login Terakhir",
          importancePct: 22.4,
          direction: "increase",
          directionLabel: "Meningkatkan Risiko",
        },
      ],
    });

    expect(modelsCalled).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]);
    expect(plan.modelUsed).toBe("gemini-3.1-flash-lite");
    expect(plan.playbooks).toHaveLength(2);
    expect(plan.estimatedSaveableRevenueIdr).toBe(45_000_000);
  });

  it("generates a validated 1-on-1 customer retention plan with outreach copy", async () => {
    const mockClient: RetentionGenAIClient = {
      interactions: {
        async create() {
          return {
            output_text: JSON.stringify({
              riskDiagnosis:
                "Pelanggan tidak login selama 24 hari dan memiliki 3 tiket support terbuka.",
              recommendedAction:
                "Hubungi dalam 24 jam untuk menyelesaikan tiket aktif dan jadwalkan sesi pendampingan.",
              recommendedOffer:
                "Gratis perpanjangan 14 hari + sesi onboarding khusus tim.",
              channel: "WhatsApp",
              outreachMessage:
                "Halo Budi, kami melihat ada kendala pada akun Pro Anda bulan ini. Tim kami siap membantu langsung hari ini.",
            }),
          };
        },
      },
    };

    const plan = await generateCustomerRetentionPlan(mockClient, {
      datasetName: "edtech_saas_indonesia_1000.csv",
      customer: {
        rowKey: "EDT-0012#0",
        id: "EDT-0012",
        name: "Budi Santoso",
        segmentLabel: "Pro",
        monthlyRevenueIdr: 499_000,
        churnProbability: 88,
        riskSegment: "High",
        actualChurn: 1,
        topDrivers: [
          {
            feature: "last_login_days_ago",
            label: "Hari Sejak Login Terakhir",
            value: "24",
            contribution: 1.42,
            direction: "increase",
          },
        ],
        rawFeatures: { last_login_days_ago: "24", support_tickets_30d: "3" },
      },
    });

    expect(plan.channel).toBe("WhatsApp");
    expect(plan.outreachMessage).toContain("Budi");
    expect(plan.modelUsed).toBe("gemini-3.5-flash-lite");
  });

  it("throws a clean Indonesian error when all models fail", async () => {
    const failingClient: RetentionGenAIClient = {
      interactions: {
        async create() {
          const err = new Error("429 resource_exhausted");
          (err as { status?: number }).status = 429;
          throw err;
        },
      },
    };

    await expect(
      generateSegmentRetentionPlan(failingClient, {
        datasetName: "test.csv",
        highRiskCount: 10,
        totalCustomers: 100,
        highRevenueAtRiskIdr: 5_000_000,
        topFeatures: [],
      }),
    ).rejects.toThrow(/kuota|Gemini API/i);
  });
});
