import { Navigate, Outlet } from "react-router-dom";
import { userAuthStore } from "@/store/authStore";

export default function ProtectedRoute() {
  const { token } = userAuthStore();

  // 1. Jika TIDAK ada token, tendang ke /login
  // replace: true tujuannya agar halaman ini tidak tersimpan di riwayat tombol "Back" browser
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Jika ADA token, tampilkan halaman anaknya (anak dari Route ini di App.tsx)
  return <Outlet />;
}
