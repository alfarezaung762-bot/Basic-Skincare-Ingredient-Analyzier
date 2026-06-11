import { NextResponse } from "next/server";
import { resetAllCooldowns } from "@/lib/openRouterKeyManager";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    resetAllCooldowns();
    return NextResponse.json({ success: true, message: "Semua cooldown OpenRouter API key berhasil di-reset." });
  } catch (error: any) {
    console.error("Gagal mereset cooldown OpenRouter:", error);
    return NextResponse.json({ success: false, message: "Gagal mereset cooldown." }, { status: 500 });
  }
}
