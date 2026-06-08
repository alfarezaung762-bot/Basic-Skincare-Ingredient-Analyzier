// src/lib/openRouterKeyManager.ts
// ========================================================
// OPENROUTER MULTI-KEY MANAGER dengan COOLDOWN PINTAR
// - Otomatis rotasi ke key berikutnya jika limit/saldo habis
// - Cooldown PENDEK (2 menit) untuk 429 rate limit (server sibuk sementara)
// - Cooldown PANJANG (3 jam) untuk 402 saldo habis (perlu top-up)
// ========================================================
import OpenAI from "openai";

// Durasi cooldown berbeda tergantung jenis error
const COOLDOWN_SHORT_MS = 2 * 60 * 1000;      // 2 menit — untuk 429 (server sibuk, coba lagi sebentar)
const COOLDOWN_LONG_MS  = 3 * 60 * 60 * 1000;  // 3 jam   — untuk 402 (saldo habis, perlu top-up)

type CooldownType = "short" | "long" | "none";

// In-memory cooldown tracker (bertahan selama server hidup)
// Map<keyIndex, { cooldownUntil: timestamp, reason: string }>
const keyCooldowns = new Map<number, { cooldownUntil: number; reason: string }>();

/**
 * Ambil semua OpenRouter API keys dari environment.
 * Prioritas: OPENROUTER_API_KEYS (comma-separated) > OPENROUTER_API_KEY (legacy)
 */
export function getOpenRouterKeys(): string[] {
  const multiKeys = process.env.OPENROUTER_API_KEYS || "";
  if (multiKeys.trim()) {
    return multiKeys.split(",").map(k => k.trim()).filter(k => k.length > 0);
  }
  const singleKey = process.env.OPENROUTER_API_KEY || "";
  return singleKey ? [singleKey] : [];
}

/**
 * Cek apakah error termasuk "key harus di-rotate"
 * cooldownType:
 *   - "short" = 2 menit (429 rate limit — server sibuk sementara, bukan token habis)
 *   - "long"  = 3 jam (402 saldo/kredit benar-benar habis, perlu top-up)
 *   - "none"  = langsung rotate tanpa cooldown (server overloaded sesaat)
 */
function isRotatableError(error: any): { shouldRotate: boolean; reason: string; cooldownType: CooldownType } {
  const status = error.status || error.statusCode || 0;
  const errMsg = (error.message || "").toLowerCase();
  const errBody = JSON.stringify(error.error || error.body || "").toLowerCase();
  const combined = `${errMsg} ${errBody}`;

  // 402 = Payment Required (saldo/kredit HABIS) — cooldown PANJANG 3 jam
  if (status === 402 || combined.includes("payment") || combined.includes("insufficient")) {
    return { shouldRotate: true, reason: "Saldo habis (402)", cooldownType: "long" };
  }

  // Token/credit/quota HABIS (bukan rate limit, tapi kuota harian free tier) — cooldown PANJANG
  if (combined.includes("exhausted") || (combined.includes("limit") && (combined.includes("credit") || combined.includes("quota")))) {
    return { shouldRotate: true, reason: "Kredit/kuota habis", cooldownType: "long" };
  }

  // 429 = Too Many Requests (server SIBUK sementara) — cooldown PENDEK 2 menit
  if (status === 429 || combined.includes("429") || combined.includes("rate limit") || combined.includes("rate_limit") || combined.includes("too many")) {
    return { shouldRotate: true, reason: "Rate limit (429) — server sibuk", cooldownType: "short" };
  }

  // "exceeded" tanpa konteks kredit — anggap sementara, cooldown PENDEK
  if (combined.includes("exceeded") && !combined.includes("credit") && !combined.includes("quota")) {
    return { shouldRotate: true, reason: "Limit terlampaui sementara", cooldownType: "short" };
  }

  // 503 = Server overloaded — rotate langsung TANPA cooldown (bisa langsung coba lagi)
  if (status === 503 && (combined.includes("capacity") || combined.includes("overloaded"))) {
    return { shouldRotate: true, reason: "Server overloaded (503)", cooldownType: "none" };
  }

  return { shouldRotate: false, reason: "", cooldownType: "none" };
}

/**
 * Cek apakah key sedang cooldown
 */
function isKeyCoolingDown(keyIndex: number): { cooling: boolean; reason: string; remainingMs: number } {
  const cd = keyCooldowns.get(keyIndex);
  if (!cd) return { cooling: false, reason: "", remainingMs: 0 };

  const now = Date.now();
  if (now < cd.cooldownUntil) {
    return { cooling: true, reason: cd.reason, remainingMs: cd.cooldownUntil - now };
  }

  // Cooldown sudah selesai — hapus
  keyCooldowns.delete(keyIndex);
  return { cooling: false, reason: "", remainingMs: 0 };
}

/**
 * Set cooldown untuk key tertentu berdasarkan jenis error
 */
function setCooldown(keyIndex: number, reason: string, type: CooldownType) {
  if (type === "none") return; // Tidak perlu cooldown

  const durationMs = type === "short" ? COOLDOWN_SHORT_MS : COOLDOWN_LONG_MS;
  keyCooldowns.set(keyIndex, {
    cooldownUntil: Date.now() + durationMs,
    reason,
  });

  const durationLabel = type === "short"
    ? `${COOLDOWN_SHORT_MS / 60000} menit`
    : `${COOLDOWN_LONG_MS / (60 * 60 * 1000)} jam`;
  console.log(`[OpenRouter] 🧊 Key #${keyIndex + 1} di-cooldown ${durationLabel}. Alasan: ${reason}`);
}

/**
 * Buat OpenRouter client dengan API key tertentu
 */
function createClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "Skincare Analyzer",
    }
  });
}

/**
 * Format waktu tersisa cooldown ke string yang mudah dibaca
 */
function formatRemaining(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}j ${mins}m`;
  }
  return `${minutes}m`;
}

/**
 * Dapatkan status semua key (untuk debugging/monitoring)
 */
export function getKeyStatus(): { index: number; status: string; cooldownRemaining?: string }[] {
  const keys = getOpenRouterKeys();
  return keys.map((_, idx) => {
    const cd = isKeyCoolingDown(idx);
    return {
      index: idx + 1,
      status: cd.cooling ? `🧊 Cooldown (${cd.reason})` : "✅ Aktif",
      cooldownRemaining: cd.cooling ? formatRemaining(cd.remainingMs) : undefined,
    };
  });
}

// ========================================================
// FUNGSI UTAMA: OpenRouter request dengan multi-key rotation + cooldown
// ========================================================
export async function openRouterWithKeyRotation(
  payload: any,
  useReasoning: boolean = false,
  logPrefix: string = "[OpenRouter]"
): Promise<{ responseText: string; keyUsed: number; totalKeys: number }> {
  const keys = getOpenRouterKeys();
  if (keys.length === 0) {
    throw new Error("Tidak ada OpenRouter API Key yang dikonfigurasi. Tambahkan OPENROUTER_API_KEYS di .env");
  }

  const totalKeys = keys.length;
  const skippedKeys: string[] = [];
  const failedKeys: string[] = [];

  for (let ki = 0; ki < keys.length; ki++) {
    const keyLabel = `Key #${ki + 1}/${totalKeys}`;

    // 1. CEK COOLDOWN — skip key yang masih cooldown
    const cd = isKeyCoolingDown(ki);
    if (cd.cooling) {
      const remaining = formatRemaining(cd.remainingMs);
      console.log(`${logPrefix} ⏭️ Skip ${keyLabel} — masih cooldown (${cd.reason}, sisa ${remaining})`);
      skippedKeys.push(`${keyLabel}: cooldown ${remaining}`);
      continue;
    }

    // 2. COBA REQUEST
    const client = createClient(keys[ki]);

    try {
      const requestPayload = { ...payload };
      if (useReasoning) {
        requestPayload.reasoning = { enabled: true };
      }

      const response = await client.chat.completions.create(requestPayload);
      const responseText = response.choices[0].message.content || "{}";
      console.log(`${logPrefix} ✅ ${keyLabel} berhasil.`);
      return { responseText, keyUsed: ki + 1, totalKeys };

    } catch (error: any) {
      const rotateCheck = isRotatableError(error);

      // 3. JIKA REASONING GAGAL (bukan rate limit), coba tanpa reasoning dulu
      if (useReasoning && !rotateCheck.shouldRotate) {
        try {
          console.log(`${logPrefix} ${keyLabel} reasoning gagal, coba tanpa reasoning...`);
          const fallbackPayload = { ...payload };
          const response = await client.chat.completions.create(fallbackPayload);
          const responseText = response.choices[0].message.content || "{}";
          return { responseText, keyUsed: ki + 1, totalKeys };
        } catch (retryErr: any) {
          const retryRotate = isRotatableError(retryErr);
          if (retryRotate.shouldRotate) {
            setCooldown(ki, retryRotate.reason, retryRotate.cooldownType);
            console.warn(`${logPrefix} ⚠️ ${keyLabel} ${retryRotate.reason}. Pindah ke key berikutnya...`);
            failedKeys.push(`${keyLabel}: ${retryRotate.reason}`);
            continue;
          }
          throw retryErr;
        }
      }

      // 4. CEK APAKAH ERROR BISA DI-ROTATE
      if (rotateCheck.shouldRotate) {
        setCooldown(ki, rotateCheck.reason, rotateCheck.cooldownType);
        console.warn(`${logPrefix} ⚠️ ${keyLabel} ${rotateCheck.reason}. Pindah ke key berikutnya...`);
        failedKeys.push(`${keyLabel}: ${rotateCheck.reason}`);
        continue;
      }

      // 5. ERROR LAIN (bukan rate limit) — lempar langsung
      throw error;
    }
  }

  // SEMUA KEY GAGAL — buat pesan error yang informatif
  const cooldownInfo = skippedKeys.length > 0 ? `\n- Key yang masih cooldown: ${skippedKeys.join(", ")}` : "";
  const failedInfo = failedKeys.length > 0 ? `\n- Key yang baru gagal: ${failedKeys.join(", ")}` : "";
  const activeCount = totalKeys - skippedKeys.length;

  throw new Error(
    `Semua ${totalKeys} OpenRouter API Key tidak tersedia!${cooldownInfo}${failedInfo}\n` +
    `${activeCount === 0 ? "Semua key sedang cooldown — tunggu hingga cooldown selesai atau tambahkan key baru di .env (OPENROUTER_API_KEYS)." : "Tambahkan key baru di .env (OPENROUTER_API_KEYS)."}`
  );
}
