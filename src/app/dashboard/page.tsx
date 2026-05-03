// src/app/dashboard/page.tsx
// Dashboard sekarang ada di halaman utama (/), redirect ke sana
import { redirect } from "next/navigation";

export default function DashboardRedirectPage() {
  redirect("/");
}
