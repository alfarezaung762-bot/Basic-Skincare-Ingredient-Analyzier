// src/app/api/eleven/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

// GET: Ambil semua daftar model suara yang tersimpan di database ATAU fetch langsung dari ElevenLabs
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const fetchDefault = searchParams.get("fetchDefault") === "true";
    const customApiKey = searchParams.get("apiKey");

    if (action === "select-directory") {
      if (process.platform !== "win32") {
        return NextResponse.json(
          { message: "Fitur pemilih folder otomatis hanya didukung pada sistem operasi Windows." },
          { status: 400 }
        );
      }

      try {
        const psCommand = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowNewFolderButton = $true; $f.Description = 'Pilih Folder Penyimpanan'; if($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }"`;
        
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync(psCommand);
        const selectedPath = stdout.trim();
        
        if (!selectedPath) {
          return NextResponse.json({ cancelled: true });
        }
        
        return NextResponse.json({ selectedPath });
      } catch (err) {
        console.error("Gagal membuka dialog folder picker:", err);
        return NextResponse.json(
          { message: "Gagal membuka jendela Folder Picker. Silakan ketik manual." },
          { status: 500 }
        );
      }
    }

    if (fetchDefault) {
      const apiKey = customApiKey || process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { message: "API Key ElevenLabs tidak ditemukan. Harap masukkan di .env atau UI." },
          { status: 400 }
        );
      }

      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { message: `Gagal memanggil ElevenLabs API: ${errText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data.voices || []);
    }

    const voices = await prisma.elevenLabsVoice.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(voices);
  } catch (error) {
    console.error("Gagal mengambil daftar suara:", error);
    return NextResponse.json(
      { message: "Gagal memproses data suara" },
      { status: 500 }
    );
  }
}

// POST: Tambah atau update model suara baru di database
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { voiceId, name, note } = body;

    if (!voiceId || !name) {
      return NextResponse.json(
        { message: "Voice ID dan Nama wajib diisi" },
        { status: 400 }
      );
    }

    const existingVoice = await prisma.elevenLabsVoice.findUnique({
      where: { voiceId },
    });

    if (existingVoice) {
      return NextResponse.json(
        { message: `Voice ID ini sudah terdaftar di database dengan nama "${existingVoice.name}".` },
        { status: 400 }
      );
    }

    const voice = await prisma.elevenLabsVoice.create({
      data: {
        voiceId,
        name,
        note: note || "",
      },
    });

    return NextResponse.json(voice, { status: 201 });
  } catch (error) {
    console.error("Gagal menambahkan suara:", error);
    return NextResponse.json(
      { message: "Gagal menyimpan suara ke database" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus suara dari database
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID suara diperlukan" },
        { status: 400 }
      );
    }

    await prisma.elevenLabsVoice.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Suara berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus suara:", error);
    return NextResponse.json(
      { message: "Gagal menghapus suara dari database" },
      { status: 500 }
    );
  }
}

// PUT: Jalankan proses Bulk Text-To-Speech (Simpan ke server dan/atau kirim sebagai ZIP ke browser)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { 
      text, 
      voices, 
      modelId, 
      outputFormat, 
      outputPath, 
      apiKey: customApiKey,
      saveLocally = true,
      downloadAsZip = true,
      languageCode,
      voiceSettings,
      generationsPerVoice = 1
    } = body;

    const apiKey = customApiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "API Key ElevenLabs tidak ditemukan. Masukkan di file .env atau langsung di UI." },
        { status: 400 }
      );
    }

    if (!text || !voices || !Array.isArray(voices) || voices.length === 0) {
      return NextResponse.json(
        { message: "Parameter text dan daftar voices wajib diisi." },
        { status: 400 }
      );
    }

    let targetDir = outputPath || "./elevenlabs_outputs";
    
    if (saveLocally) {
      // Konversi relative path menjadi absolute path berdasarkan root project
      if (!path.isAbsolute(targetDir)) {
        targetDir = path.resolve(process.cwd(), targetDir);
      }

      // Pastikan folder penyimpanan ada, jika belum buat foldernya secara rekursif
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
      } catch (fsErr) {
        console.error("Gagal membuat folder:", fsErr);
        return NextResponse.json(
          { message: `Gagal membuat folder tujuan: ${targetDir}. Pastikan path benar.` },
          { status: 500 }
        );
      }
    }

    const results = [];
    const ext = outputFormat.startsWith("wav") ? "wav" : "mp3";

    // Inisialisasi ADM-ZIP jika downloadAsZip bernilai true
    const zip = downloadAsZip ? new AdmZip() : null;

    for (const voice of voices) {
      const { voiceId, name } = voice;
      console.log(`[API ElevenLabs] Mulai memproses ${name} (${voiceId})`);

      for (let take = 1; take <= generationsPerVoice; take++) {
        try {
          const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`;
          
          const reqPayload: {
            text: string;
            model_id: string;
            language_code?: string;
            voice_settings?: {
              stability: number;
              similarity_boost: number;
              style: number;
              use_speaker_boost: boolean;
              speed?: number;
            };
          } = {
            text,
            model_id: modelId,
          };

          if (languageCode && languageCode !== "auto") {
            reqPayload.language_code = languageCode;
          }

          if (voiceSettings) {
            reqPayload.voice_settings = {
              stability: voiceSettings.stability,
              similarity_boost: voiceSettings.similarityBoost,
              style: voiceSettings.style,
              use_speaker_boost: voiceSettings.useSpeakerBoost,
            };
            if (typeof voiceSettings.speed === "number") {
              reqPayload.voice_settings.speed = voiceSettings.speed;
            }
          }

          const response = await fetch(url, {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(reqPayload),
          });

          const nameWithTake = generationsPerVoice > 1 ? `${name} (Take ${take})` : name;

          if (!response.ok) {
            const errText = await response.text();
            let parsedError = errText;
            try {
              const errJson = JSON.parse(errText);
              parsedError = errJson.detail?.message || errText;
            } catch {
              // Abaikan error parsing JSON jika response bukan JSON
            }
            
            results.push({
              voiceId,
              name: nameWithTake,
              success: false,
              error: `ElevenLabs API Error (${response.status}): ${parsedError}`,
            });
            continue;
          }

          // Ambil arrayBuffer dari response
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Buat nama file aman dari karakter aneh
          const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
          const takeSuffix = generationsPerVoice > 1 ? `_take${take}` : "";
          const filename = `${safeName}${takeSuffix}.${ext}`;

          let savedPath = undefined;
          if (saveLocally) {
            const finalPath = path.join(targetDir, filename);
            fs.writeFileSync(finalPath, buffer);
            savedPath = finalPath;
          }

          // Tambahkan file ke ZIP
          if (zip) {
            zip.addFile(filename, buffer);
          }

          results.push({
            voiceId,
            name: nameWithTake,
            success: true,
            savedPath,
          });

          // Berikan jeda singkat (200ms) untuk menghindari rate limiting
          await new Promise((r) => setTimeout(r, 200));

        } catch (err) {
          console.error(`Gagal memproses suara ${name} (Take ${take}):`, err);
          const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
          const nameWithTake = generationsPerVoice > 1 ? `${name} (Take ${take})` : name;
          results.push({
            voiceId,
            name: nameWithTake,
            success: false,
            error: errorMessage,
          });
        }
      }
    }

    // Jika zip aktif dan ada file yang berhasil di-generate, buat base64 string
    let zipBase64 = null;
    if (zip && results.some(r => r.success)) {
      try {
        const zipBuffer = zip.toBuffer();
        zipBase64 = zipBuffer.toString("base64");
      } catch (zipErr) {
        console.error("Gagal membuat file ZIP:", zipErr);
      }
    }

    return NextResponse.json({
      message: "Proses bulk generate selesai.",
      results,
      zipBase64,
    });

  } catch (error) {
    console.error("Gagal menjalankan bulk TTS:", error);
    const errorMessage = error instanceof Error ? error.message : "Gagal memproses bulk TTS";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
