// src/app/api/kanban/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_TASKS = [
  {
    title: "Jadwal Timer Stop Kontak 1 & 2 di Web",
    description: "Mengatur jadwal stop kontak 1 dan 2 dengan timer di web",
    status: "backlog",
    priority: "high",
    assignee: "alfareza"
  },
  {
    title: "Monitoring Suhu, MQ2 Gas & DS3231 RTC",
    description: "Monitoring Suhu dan Gas Pada ruangan dengan sensor MQ2 dan RTC ds3231, serta alarm asap via DFPlayer",
    status: "backlog",
    priority: "high",
    assignee: "arif"
  },
  {
    title: "Sistem Deteksi Suara - Wake Word Halo_Aero",
    description: "Wake word atau pemanggilan suara sebelum menginisialisasi perintah dengan label Halo_Aero",
    status: "backlog",
    priority: "medium",
    assignee: "aksal"
  },
  {
    title: "Suara Stop Kontak 1: 1_tepukan & Port_satu_on/off",
    description: "Mematikan dan menyalakan Stop kontak 1 lewat perintah suara dengan label 1_tepukan, Port_satu_on, dan port_satu_off",
    status: "backlog",
    priority: "medium",
    assignee: "fadli"
  },
  {
    title: "Suara Stop Kontak 2: 1_tepukan x2 & Port_dua_on/off",
    description: "Mematikan dan menyalakan Stop kontak 2 lewat perintah suara dengan label 1_tepukan x2, Port_dua_on, dan port_dua_off",
    status: "backlog",
    priority: "medium",
    assignee: "fadli"
  },
  {
    title: "Kontrol Modul Bluetooth (Tombol Putih & Suara)",
    description: "Mematikan/menyalakan Bluetooth dengan tombol putih dan perintah suara dengan label bluetooth_mode dan bluetooth_off",
    status: "backlog",
    priority: "low",
    assignee: "aksal"
  },
  {
    title: "Kalibrasi Otomatis (Tombol Merah / calibration)",
    description: "Kalibrasi atau perkenal otomatis dengan menekan tombol merah atau perintah suara dengan label calibration",
    status: "backlog",
    priority: "low",
    assignee: "arif"
  },
  {
    title: "Greeting Voice DFPlayer & Motion Sensor PIR",
    description: "Greeting voice lewat DFPlayer dan PIR motion sensor ketika ada orang lewat dengan jeda 1-2 menit di jam tertentu misal jam 7 pagi dan 12 siang",
    status: "backlog",
    priority: "low",
    assignee: "audy"
  },
  {
    title: "Tanya Jawab AI TTS (Tombol Hitam & Mic)",
    description: "Tanya jawab AI dengan TTS saat menekan/menahan tombol Hitam menggunakan IC PT8211 dan mic INMP441, dikontrol lewat perintah ai_mode dan ai_mode_off",
    status: "backlog",
    priority: "high",
    assignee: "audy"
  }
];

// GET: Fetch all tasks from database (auto-seeding if empty)
export async function GET() {
  try {
    let tasks = await prisma.kanbanTask.findMany({
      orderBy: { createdAt: "asc" }
    });

    if (tasks.length === 0) {
      // Auto-seed
      await prisma.kanbanTask.createMany({
        data: DEFAULT_TASKS
      });
      tasks = await prisma.kanbanTask.findMany({
        orderBy: { createdAt: "asc" }
      });
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Gagal memuat tugas dari database:", error);
    return NextResponse.json({ message: "Gagal memuat tugas" }, { status: 500 });
  }
}

// POST: Create a new task in database
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, status, priority, assignee } = body;

    if (!title || !status || !priority || !assignee) {
      return NextResponse.json({ message: "Semua kolom wajib diisi" }, { status: 400 });
    }

    const newTask = await prisma.kanbanTask.create({
      data: {
        title,
        description: description || "",
        status,
        priority,
        assignee
      }
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Gagal membuat tugas:", error);
    return NextResponse.json({ message: "Gagal membuat tugas" }, { status: 500 });
  }
}

// PATCH: Update an existing task status or details in database
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, title, description, status, priority, assignee } = body;

    if (!id) {
      return NextResponse.json({ message: "ID tugas diperlukan" }, { status: 400 });
    }

    const updatedTask = await prisma.kanbanTask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(assignee !== undefined && { assignee })
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Gagal memperbarui tugas:", error);
    return NextResponse.json({ message: "Gagal memperbarui tugas" }, { status: 500 });
  }
}

// DELETE: Delete a task from database
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID tugas diperlukan" }, { status: 400 });
    }

    await prisma.kanbanTask.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Tugas berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus tugas:", error);
    return NextResponse.json({ message: "Gagal menghapus tugas" }, { status: 500 });
  }
}
