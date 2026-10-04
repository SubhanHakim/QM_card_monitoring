import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ideService, type IdeReportItem } from "@/services/ideService";
import { userAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronDown,
  Copy,
  FileCheck2,
  FileSpreadsheet,
  LogOut,
  MessageSquare,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { SubmitIdeModal } from "@/components/SubmitIdeModal";

export default function ReportDetailPage() {
  const { id_aplikasi } = useParams<{ id_aplikasi: string }>();
  const navigate = useNavigate();
  const { user, logout } = userAuthStore();

  const [report, setReport] = useState<IdeReportItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  const fetchDetail = async () => {
    if (!id_aplikasi) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await ideService.getReportById(id_aplikasi);
      setReport(data);
    } catch (err: any) {
      console.error("Gagal mengambil detail report:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          `Tidak dapat memuat detail laporan untuk ID ${id_aplikasi}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id_aplikasi]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleCopyId = () => {
    if (!id_aplikasi) return;
    navigator.clipboard.writeText(id_aplikasi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper formatting analis name: "subhan_hakim" -> "Subhan Hakim"
  const formatAnalisName = (name: string | null | undefined) => {
    if (!name) return "Petugas QM";
    return name
      .split(/[_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Status & Metrics calculations
  const metrics = useMemo(() => {
    if (!report) {
      return {
        totalBobot: 0,
        totalErrors: 0,
        fatalCount: 0,
        minorCount: 0,
        hasFatal: false,
      };
    }

    const errors = report.errors || [];
    const totalBobot =
      typeof report.total_bobot === "number"
        ? Math.round(report.total_bobot * 100) / 100
        : parseFloat(String(report.total_bobot || 0)) || 0;

    const fatalCount = errors.filter((e) => Number(e.bobot) >= 1).length;
    const minorCount = errors.filter(
      (e) => Number(e.bobot) > 0 && Number(e.bobot) < 1
    ).length;
    const hasFatal = fatalCount > 0;

    return {
      totalBobot,
      totalErrors: errors.length,
      fatalCount,
      minorCount,
      hasFatal,
    };
  }, [report]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/70 dark:bg-background text-foreground">
      {/* ─── 1. TOP NAVIGATION BAR ─── */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-md px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2 text-sm font-medium hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Dashboard</span>
            </Button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 pl-2.5 pr-3.5 py-1.5 rounded-full border border-border/80 hover:bg-accent/60 transition-colors outline-none cursor-pointer">
                <Avatar className="h-8 w-8 text-xs font-semibold">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "QM"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <span className="text-sm font-semibold block leading-tight text-foreground">
                    {user?.name || "Petugas QM"}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {user?.role || "analis"}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5">
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.name || "Petugas QM"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {user?.role || "analis"}
                  </p>
                </div>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer text-sm font-medium flex items-center gap-2.5 p-2 rounded-md mt-1"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ─── 2. MAIN CONTAINER ─── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-9 w-64 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        ) : error ? (
          /* Error State */
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:bg-red-950/20 dark:border-red-900/40">
            <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-900 dark:text-red-200">
              Gagal Memuat Detail Aplikasi
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1 max-w-md mx-auto">
              {error}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDetail}
                className="gap-2 text-sm bg-background border-red-300 hover:bg-red-100/50"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-sm"
              >
                Kembali ke Dashboard
              </Button>
            </div>
          </div>
        ) : report ? (
          /* Content State */
          <>
            {/* HERO HEADER CARD */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 md:p-7 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                {/* ID & Title */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                      {report.id_aplikasi}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyId}
                      className="h-8 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground border-border/70"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>{copied ? "Tersalin!" : "Salin ID"}</span>
                    </Button>

                    {/* Status Badge */}
                    {metrics.hasFatal ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                        Fatal Error
                      </span>
                    ) : metrics.totalBobot > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Minor Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Lolos Evaluasi
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Rekapitulasi evaluasi kualitas aplikasi nasabah pada tahap IDE
                  </p>
                </div>

                {/* Evaluator & Refresh Actions */}
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs">
                      {report.analis ? report.analis.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Petugas Analis
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {formatAnalisName(report.analis)}
                      </p>
                      {report.created_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(report.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDetail}
                    className="h-9 px-3 gap-1.5 text-xs ml-auto border-border/80"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Refresh</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    className="h-9 px-3.5 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit Temuan</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Bobot */}
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                      Total Bobot
                    </p>
                    <div className="text-3xl font-extrabold tracking-tight mt-1.5 text-foreground">
                      {metrics.totalBobot}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Akumulasi penalti nilai
                    </p>
                  </div>
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-2xs ${
                      metrics.hasFatal
                        ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                        : metrics.totalBobot > 0
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Total Temuan Error */}
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                      Jumlah Temuan
                    </p>
                    <div className="text-3xl font-extrabold tracking-tight mt-1.5 text-foreground">
                      {metrics.totalErrors}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Parameter ketidaksesuaian
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shadow-2xs">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Fatal Errors */}
              <Card className="border border-red-200/70 dark:border-red-900/40 shadow-xs bg-card">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 tracking-wide uppercase">
                      Temuan Fatal
                    </p>
                    <div className="text-3xl font-extrabold tracking-tight mt-1.5 text-red-600 dark:text-red-400">
                      {metrics.fatalCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bobot error ≥ 1
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center shadow-2xs">
                    <AlertOctagon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Minor Errors */}
              <Card className="border border-amber-200/70 dark:border-amber-900/40 shadow-xs bg-card">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 tracking-wide uppercase">
                      Temuan Minor
                    </p>
                    <div className="text-3xl font-extrabold tracking-tight mt-1.5 text-amber-700 dark:text-amber-400">
                      {metrics.minorCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bobot error 0.1
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ERROR PARAMETERS TABLE CARD */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="p-5 border-b border-border/70 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Daftar Parameter Temuan Kesalahan
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Rincian parameter yang ditandai memiliki ketidaksesuaian data
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                  {report.errors?.length || 0} Parameter Teridentifikasi
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/90 dark:bg-muted/40 border-b border-border/70 hover:bg-slate-50/90">
                      <TableHead className="w-14 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                        No
                      </TableHead>
                      <TableHead className="min-w-[260px] text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                        Nama Parameter / Field
                      </TableHead>
                      <TableHead className="w-[160px] text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 whitespace-nowrap">
                        Kategori
                      </TableHead>
                      <TableHead className="w-[140px] text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 whitespace-nowrap">
                        Bobot Nilai
                      </TableHead>
                      <TableHead className="min-w-[240px] text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                        Catatan Spesifik
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {!report.errors || report.errors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
                            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-900/40">
                              <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              Tidak Ada Temuan Kesalahan
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Aplikasi ini dievaluasi bersih / tanpa catatan error (No Error).
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.errors.map((err, idx) => {
                        const bobotNum = Number(err.bobot);
                        const isFatal = bobotNum >= 1;
                        const isClean =
                          bobotNum === 0 ||
                          err.nama_field.toUpperCase().includes("NO ERROR");

                        return (
                          <TableRow
                            key={`detail-err-${idx}`}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            {/* 1. No */}
                            <TableCell className="text-center text-xs text-muted-foreground font-medium py-4">
                              {idx + 1}
                            </TableCell>

                            {/* 2. Nama Parameter */}
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isClean
                                      ? "bg-emerald-500"
                                      : isFatal
                                      ? "bg-red-500"
                                      : "bg-amber-500"
                                  }`}
                                />
                                <span className="font-semibold text-sm text-foreground">
                                  {err.nama_field}
                                </span>
                              </div>
                            </TableCell>

                            {/* 3. Kategori */}
                            <TableCell className="text-center py-4 whitespace-nowrap">
                              {isClean ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                  Bersih
                                </span>
                              ) : isFatal ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80">
                                  Fatal
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80">
                                  Non Fatal / Minor
                                </span>
                              )}
                            </TableCell>

                            {/* 4. Bobot Nilai */}
                            <TableCell className="text-center py-4 whitespace-nowrap">
                              <span
                                className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
                                  isFatal
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : bobotNum > 0
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {err.bobot}
                              </span>
                            </TableCell>

                            {/* 5. Catatan Spesifik Parameter */}
                            <TableCell className="py-4 text-xs text-muted-foreground">
                              {err.catatan || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* CATATAN ANALIS / TAMBAHAN CARD */}
            {(report.catatan || report.catatan_tambahan) && (
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>Catatan Tambahan Analis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/60 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {report.catatan || report.catatan_tambahan}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </main>

      {/* ─── POPUP MODAL EDIT TEMUAN IDE ─── */}
      {report && (
        <SubmitIdeModal
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={fetchDetail}
          editData={report}
        />
      )}
    </div>
  );
}
