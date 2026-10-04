import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import ReportDetailPage from "./pages/ReportDetailPage.tsx";
import { TooltipProvider } from "./components/ui/tooltip";

function App() {
  return (
    <TooltipProvider>
      <Routes>
        {/* Rute utama (/) otomatis mengarah ke halaman login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Halaman Login */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Halaman Terproteksi (Harus sudah login) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report/:id_aplikasi" element={<ReportDetailPage />} />
          <Route path="/ide/report/:id_aplikasi" element={<ReportDetailPage />} />
        </Route>

        {/* Jika rute tidak ditemukan, arahkan ke /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </TooltipProvider>
  );
}

export default App;
