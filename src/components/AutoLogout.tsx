// src/components/AutoLogout.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation"; // use next/navigation for app router

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 menit dalam milidetik
const SESSION_CHECK_INTERVAL = 2 * 60 * 1000; // Cek validitas session setiap 2 menit

export default function AutoLogout() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performLogout = useCallback(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  // Reset timer inactivity setiap kali user melakukan aksi
  const resetTimer = useCallback(() => {
    // Abaikan fitur AutoLogout jika sedang berada di halaman admin 
    // agar proses panjang seperti Deep Research tidak terpotong
    if (pathname?.startsWith("/admin")) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // User tidak aktif selama 15 menit → paksa logout
      performLogout();
    }, INACTIVITY_TIMEOUT);
  }, [performLogout, pathname]);

  // Cek apakah session masih valid (misal: user dihapus dari DB)
  const checkSessionValidity = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      // Jika session kosong / user sudah tidak ada → paksa logout
      if (!data || !data.user) {
        performLogout();
      }
    } catch {
      // Network error, abaikan
    }
  }, [performLogout]);

  useEffect(() => {
    // Hanya aktifkan jika user sudah login
    if (status !== "authenticated") return;

    // Abaikan jika sedang di halaman admin
    if (pathname?.startsWith("/admin")) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      return;
    }

    // Daftar event yang menandakan user aktif
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // Pasang listener untuk setiap event
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Mulai timer pertama kali
    resetTimer();

    // Cek validitas session secara berkala (handle deleted user)
    checkIntervalRef.current = setInterval(checkSessionValidity, SESSION_CHECK_INTERVAL);

    return () => {
      // Bersihkan semua listener dan timer saat unmount
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [status, resetTimer, checkSessionValidity, pathname]);

  // Komponen ini tidak merender UI apapun
  return null;
}
