import { NextResponse } from "next/server";
import { PRESET_DATASETS } from "@/lib/presets";

export async function GET() {
  return NextResponse.json({ presets: PRESET_DATASETS });
}
