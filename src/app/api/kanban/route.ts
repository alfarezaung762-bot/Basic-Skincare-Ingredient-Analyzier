// src/app/api/kanban/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "src/app/api/kanban/kanban-data.json");

// Helper function to read tasks
function readTasks() {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      return [];
    }
    const fileContent = fs.readFileSync(DATA_FILE_PATH, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading Kanban data:", error);
    return [];
  }
}

// Helper function to write tasks
function writeTasks(tasks: any[]) {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(tasks, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing Kanban data:", error);
    return false;
  }
}

// GET: Fetch all tasks
export async function GET() {
  const tasks = readTasks();
  return NextResponse.json(tasks);
}

// POST: Create a new task
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, status, priority, assignee } = body;

    if (!title || !status || !priority || !assignee) {
      return NextResponse.json({ message: "Semua kolom wajib diisi" }, { status: 400 });
    }

    const tasks = readTasks();
    const newTask = {
      id: `task-${Date.now()}`,
      title,
      description: description || "",
      status,
      priority,
      assignee,
      updatedAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    const success = writeTasks(tasks);

    if (!success) {
      return NextResponse.json({ message: "Gagal menyimpan data" }, { status: 500 });
    }

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Terjadi kesalahan internal" }, { status: 500 });
  }
}

// PATCH: Update an existing task (or move column)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, title, description, status, priority, assignee } = body;

    if (!id) {
      return NextResponse.json({ message: "ID tugas diperlukan" }, { status: 400 });
    }

    const tasks = readTasks();
    const taskIndex = tasks.findIndex((t: any) => t.id === id);

    if (taskIndex === -1) {
      return NextResponse.json({ message: "Tugas tidak ditemukan" }, { status: 404 });
    }

    // Update fields conditionally
    const updatedTask = {
      ...tasks[taskIndex],
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(assignee !== undefined && { assignee }),
      updatedAt: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;
    const success = writeTasks(tasks);

    if (!success) {
      return NextResponse.json({ message: "Gagal menyimpan perubahan" }, { status: 500 });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    return NextResponse.json({ message: "Terjadi kesalahan internal" }, { status: 500 });
  }
}

// DELETE: Delete a task
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID tugas diperlukan" }, { status: 400 });
    }

    const tasks = readTasks();
    const filteredTasks = tasks.filter((t: any) => t.id !== id);

    if (tasks.length === filteredTasks.length) {
      return NextResponse.json({ message: "Tugas tidak ditemukan" }, { status: 404 });
    }

    const success = writeTasks(filteredTasks);

    if (!success) {
      return NextResponse.json({ message: "Gagal menghapus data" }, { status: 500 });
    }

    return NextResponse.json({ message: "Tugas berhasil dihapus" });
  } catch (error) {
    return NextResponse.json({ message: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
