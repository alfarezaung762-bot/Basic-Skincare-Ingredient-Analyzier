// src/app/kanban/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "backlog" | "todo" | "in_progress" | "testing" | "done";
  priority: "high" | "medium" | "low";
  assignee: string;
  updatedAt: string;
}

const COLUMNS = [
  { id: "backlog", name: "Backlog", color: "border-slate-350 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100 hover:border-slate-400" },
  { id: "todo", name: "To Do", color: "border-sky-350 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-900/60 dark:text-sky-105 hover:border-sky-400" },
  { id: "in_progress", name: "In Progress", color: "border-amber-350 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-900/60 dark:text-amber-105 hover:border-amber-400" },
  { id: "testing", name: "Testing", color: "border-purple-350 bg-purple-100 text-purple-900 dark:border-purple-800 dark:bg-purple-900/60 dark:text-purple-105 hover:border-purple-400" },
  { id: "done", name: "Implementasi", color: "border-emerald-350 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-105 hover:border-emerald-400" },
] as const;

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeTask, setActiveTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    status: "backlog",
    priority: "medium",
    assignee: "alfareza",
  });

  // Sync theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/kanban");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Gagal memuat tugas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    // Optimistic Update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
    );

    try {
      const res = await fetch("/api/kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Gagal mengubah status tugas:", error);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tugas ini?")) return;

    // Optimistic Update
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const res = await fetch(`/api/kanban?id=${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Gagal menghapus tugas:", error);
      fetchTasks();
    }
  };

  const handleOpenCreateModal = (status: Task["status"] = "backlog") => {
    setModalMode("create");
    setActiveTask({
      title: "",
      description: "",
      status,
      priority: "medium",
      assignee: "alfareza",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setModalMode("edit");
    setActiveTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask.title?.trim() || !activeTask.assignee || !activeTask.status || !activeTask.priority) {
      alert("Mohon lengkapi semua kolom wajib.");
      return;
    }

    try {
      if (modalMode === "create") {
        const res = await fetch("/api/kanban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activeTask),
        });
        if (res.ok) {
          const newTask = await res.json();
          setTasks(prev => [...prev, newTask]);
        }
      } else {
        const res = await fetch("/api/kanban", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activeTask),
        });
        if (res.ok) {
          const updatedTask = await res.json();
          setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Gagal menyimpan tugas:", error);
    }
  };

  const toggleTheme = () => {
    const nextTheme = !isDark ? "dark" : "light";
    setIsDark(!isDark);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    // Reset on drop or dragEnd
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Task["status"]) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDragOverColumn(null);
    if (!id) return;
    
    const taskToUpdate = tasks.find(t => t.id === id);
    if (taskToUpdate && taskToUpdate.status !== newStatus) {
      await handleStatusChange(id, newStatus);
    }
  };

  // Filter tasks based on search
  const filteredTasks = tasks.filter(
    t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen p-4 md:p-8 font-sans flex flex-col relative gradient-mesh-bg overflow-x-hidden">
      {/* Background Dot pattern overlay */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Kembali ke Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-slate-700 dark:text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📋</span> Papan Kanban Alur Kerja
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Simulasi alur pengembangan sistem AI Skincare Ingredient Analyzer
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-grow md:flex-none md:w-64">
            <input
              type="text"
              placeholder="Cari tugas atau orang..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
            </svg>
          </div>

          <button
            onClick={() => handleOpenCreateModal("backlog")}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-1.5 shadow-md shadow-teal-600/10 active:scale-95"
          >
            <span>➕</span> Tambah Tugas
          </button>
          
          <button
            onClick={toggleTheme}
            className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-xl transition-all"
            title="Ganti Tema"
          >
            {isDark ? "🌞" : "🌙"}
          </button>
        </div>
      </header>

      {/* Board Columns container */}
      <div className="relative z-10 flex-grow overflow-x-auto pb-6 -mx-4 px-4 scrollbar-thin">
        <div className="flex gap-4 md:gap-5 min-w-[1100px] h-full items-start">
          {COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex-1 min-w-[240px] max-w-[320px] flex flex-col max-h-[80vh]">
                {/* Column Header */}
                <div className={`p-4 border rounded-t-2xl flex items-center justify-between font-bold ${col.color}`}>
                  <span className="text-xs tracking-wider uppercase">{col.name}</span>
                  <span className="text-xs bg-white/60 dark:bg-slate-900/60 px-2.5 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-800/50">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards Area */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  onDragEnter={(e) => handleDragEnter(e, col.id)}
                  className={`flex-grow overflow-y-auto p-2 border-x border-b rounded-b-2xl min-h-[400px] flex flex-col gap-3 transition-all duration-200 ${
                    dragOverColumn === col.id
                      ? "bg-teal-550/10 dark:bg-teal-950/20 border-teal-500/50"
                      : "bg-slate-100/50 dark:bg-slate-950/20 border-slate-300 dark:border-slate-800"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <div className="skeleton w-8 h-8 rounded-full mb-3" />
                      <span className="text-xs font-semibold">Memuat tugas...</span>
                    </div>
                  ) : colTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                      <span className="text-2xl mb-1.5 opacity-60">📭</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide">Kolom Kosong</span>
                      <button
                        onClick={() => handleOpenCreateModal(col.id as Task["status"])}
                        className="mt-3 text-[10px] font-black text-teal-650 dark:text-teal-400 hover:underline"
                      >
                        Tambah Tugas Baru
                      </button>
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <div
                        key={task.id}
                        draggable={!isLoading}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className={`p-4 rounded-xl border relative group transition-all duration-300 hover:shadow-md cursor-grab active:cursor-grabbing ${
                          isDark 
                            ? "border-slate-700 bg-slate-900/95 text-white hover:border-slate-500" 
                            : "border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400"
                        }`}
                      >
                        {/* Header card: Priority & Delete button */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              task.priority === "high"
                                ? "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/30"
                                : task.priority === "medium"
                                ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30"
                                : "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/30"
                            }`}
                          >
                            {task.priority === "high" ? "🔴 Tinggi" : task.priority === "medium" ? "🟡 Sedang" : "🟢 Rendah"}
                          </span>

                          <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEditModal(task)}
                              className="text-slate-650 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 rounded transition-colors"
                              title="Edit Tugas"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-slate-650 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition-colors"
                              title="Hapus Tugas"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-xs font-black text-slate-950 dark:text-white mb-1.5 leading-snug">{task.title}</h4>
                        <p className="text-[10.5px] text-slate-700 dark:text-slate-250 leading-relaxed mb-3 font-semibold line-clamp-3">
                          {task.description}
                        </p>

                        {/* Footer Card: Assignee & Dropdown */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 gap-2">
                          {/* Assignee Badge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-5 h-5 rounded-full bg-teal-600/10 text-teal-750 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center text-[9px] font-black border border-teal-500/20">
                              {task.assignee.substring(0, 2).toUpperCase()}
                            </span>
                            <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200">{task.assignee}</span>
                          </div>

                          {/* Dropdown status changer */}
                          <select
                            value={task.status}
                            onChange={e => handleStatusChange(task.id, e.target.value as Task["status"])}
                            className="text-[9px] font-bold bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-750 rounded px-1.5 py-0.5 text-slate-850 dark:text-slate-150 focus:outline-none focus:border-teal-500"
                          >
                            <option value="backlog">Backlog</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="testing">Testing</option>
                            <option value="done">Implementasi</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Modal (Create & Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md glass-card rounded-[2rem] border overflow-hidden p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${
            isDark ? "border-slate-800" : "border-slate-200/80"
          }`}>
            <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-slate-50 mb-4 flex items-center gap-1.5">
              <span>{modalMode === "create" ? "📝 Tambah Tugas Baru" : "✏️ Edit Tugas"}</span>
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Judul Tugas <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Integrasi API AI Hybrid"
                  value={activeTask.title || ""}
                  onChange={e => setActiveTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Deskripsi</label>
                <textarea
                  rows={3}
                  placeholder="Detail tugas atau catatan pengerjaan..."
                  value={activeTask.description || ""}
                  onChange={e => setActiveTask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:border-slate-800 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Penanggung Jawab <span className="text-rose-500">*</span></label>
                  <select
                    value={activeTask.assignee || "alfareza"}
                    onChange={e => setActiveTask(prev => ({ ...prev, assignee: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-slate-800"
                  >
                    <option value="alfareza">alfareza</option>
                    <option value="fadli">fadli</option>
                    <option value="arif">arif</option>
                    <option value="aksal">aksal</option>
                    <option value="audy">audy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Prioritas <span className="text-rose-500">*</span></label>
                  <select
                    value={activeTask.priority || "medium"}
                    onChange={e => setActiveTask(prev => ({ ...prev, priority: e.target.value as Task["priority"] }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-slate-800"
                  >
                    <option value="high">High (Tinggi)</option>
                    <option value="medium">Medium (Sedang)</option>
                    <option value="low">Low (Rendah)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Kolom Status <span className="text-rose-500">*</span></label>
                <select
                  value={activeTask.status || "backlog"}
                  onChange={e => setActiveTask(prev => ({ ...prev, status: e.target.value as Task["status"] }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-slate-800"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="testing">Testing</option>
                  <option value="done">Implementasi (Done)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-600/10"
                >
                  {modalMode === "create" ? "Simpan Tugas" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
