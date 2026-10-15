import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userAuthStore } from "@/store/authStore";
import { ideService, type IdeReportItem } from "@/services/ideService";
import { SubmitIdeModal } from "@/components/SubmitIdeModal";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

export default function DashboardPage() {
  const { user, logout } = userAuthStore();
  const navigate = useNavigate();

  // State
  const [reports, setReports] = useState<IdeReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState<boolean>(false);
  const [editingReport, setEditingReport] = useState<IdeReportItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Helper formatting analis name: "subhan_hakim" -> "Subhan Hakim"
  const formatAnalisName = (name: string | null | undefined) => {
    if (!name) return "Petugas QM";
    return name
      .split(/[_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Fetch Data Function
  const fetchReportData = useCallback(async (isSilent = false) => {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const res: any = await ideService.getReports();
      const items: IdeReportItem[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setReports(items);
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err: any) {
      console.error("Gagal mengambil data report:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Gagal memuat data laporan. Pastikan server backend aktif."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Client-side search and category filter (per-application)
  const filteredReports = useMemo(() => {
    let result = reports;

    // Filter Kategori (ALL, FATAL, NON_FATAL, CLEAN)
    if (selectedCategoryFilter !== "ALL") {
      result = result.filter((item) => {
        const hasFatal = item.errors?.some((e) => Number(e.bobot) >= 1);
        const totalBobot = Number(item.total_bobot || 0);
        if (selectedCategoryFilter === "FATAL") return hasFatal;
        if (selectedCategoryFilter === "NON_FATAL") return !hasFatal && totalBobot > 0;
        if (selectedCategoryFilter === "CLEAN") return !hasFatal && totalBobot === 0;
        return true;
      });
    }

    // Filter Search Text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const matchApp = item.id_aplikasi?.toLowerCase().includes(q);
        const matchAnalis =
          item.analis?.toLowerCase().replace(/_/g, " ").includes(q) ||
          item.analis?.toLowerCase().includes(q);
        const matchErrors = item.errors?.some((e) =>
          e.nama_field?.toLowerCase().includes(q)
        );
        return matchApp || matchAnalis || matchErrors;
      });
    }

    return result;
  }, [reports, selectedCategoryFilter, searchQuery]);

  // Metrics calculation
  const stats = useMemo(() => {
    const totalApps = reports.length;
    const fatalApps = reports.filter((r) =>
      r.errors?.some((e) => Number(e.bobot) >= 1)
    ).length;
    const nonFatalApps = reports.filter((r) => {
      const hasFatal = r.errors?.some((e) => Number(e.bobot) >= 1);
      const totalBobot = Number(r.total_bobot || 0);
      return !hasFatal && totalBobot > 0;
    }).length;
    const cleanApps = reports.filter((r) => {
      const hasFatal = r.errors?.some((e) => Number(e.bobot) >= 1);
      const totalBobot = Number(r.total_bobot || 0);
      return !hasFatal && totalBobot === 0;
    }).length;
    const totalErrors = reports.reduce(
      (sum, r) => sum + (r.errors?.length || 0),
      0
    );

    return { totalApps, fatalApps, nonFatalApps, cleanApps, totalErrors };
  }, [reports]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/70 dark:bg-background text-foreground">
      {/* ─── 1. TOP NAVIGATION BAR ─── */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-md px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Navigation Tabs */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-sm">
                QM
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-foreground">
                    Quality Monitoring
                  </h1>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/70 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/40">
                    IDE Stage
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rekapitulasi Evaluasi Pemeriksaan per Aplikasi
                </p>
              </div>
            </div>

            {/* Segmented Switcher */}
            <nav className="hidden md:flex items-center p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-medium">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg bg-background text-foreground font-semibold shadow-xs flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                Daftar Laporan
              </button>
              <button
                type="button"
                onClick={() => navigate("/rekap")}
                className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Rekap Bulanan
              </button>
            </nav>
          </div>

          {/* User Profile & Actions */}
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
                  onClick={() => navigate("/rekap")}
                  className="cursor-pointer text-sm font-medium flex items-center gap-2.5 p-2 rounded-md"
                >
                  <BarChart3 className="h-4 w-4" />
                  Rekap Bulanan
                </DropdownMenuItem>
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
        {/* PAGE TITLE & ACTION BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard Temuan IDE
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Daftar rekapitulasi temuan kesalahan dikelompokkan per aplikasi nasabah
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => fetchReportData(true)}
              disabled={isLoading || isRefreshing}
              className="gap-2 text-sm h-10 px-4 bg-background shadow-xs hover:bg-muted/70 font-medium"
            >
              <RefreshCw
                className={`h-4 w-4 text-muted-foreground ${
                  isRefreshing || isLoading ? "animate-spin" : ""
                }`}
              />
              <span>Refresh</span>
            </Button>

            <Button
              size="default"
              onClick={() => {
                setEditingReport(null);
                setIsSubmitOpen(true);
              }}
              className="gap-2 text-sm h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Input Temuan IDE</span>
            </Button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Aplikasi */}
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                  Aplikasi Dievaluasi
                </p>
                <div className="text-3xl font-extrabold tracking-tight mt-1.5 text-foreground">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalApps}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Berkas aplikasi nasabah
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shadow-2xs">
                <FileCheck2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Aplikasi Fatal */}
          <Card className="border border-red-200/70 dark:border-red-900/40 shadow-xs bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 tracking-wide uppercase">
                  Aplikasi Ada Fatal
                </p>
                <div className="text-3xl font-extrabold tracking-tight mt-1.5 text-red-600 dark:text-red-400">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : stats.fatalApps}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Memiliki error bobot ≥ 1
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center shadow-2xs">
                <AlertOctagon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Non-Fatal */}
          <Card className="border border-amber-200/70 dark:border-amber-900/40 shadow-xs bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 tracking-wide uppercase">
                  Minor Saja
                </p>
                <div className="text-3xl font-extrabold tracking-tight mt-1.5 text-amber-700 dark:text-amber-400">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : stats.nonFatalApps}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Hanya temuan non-fatal
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Total Temuan Keseluruhan */}
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                  Total Temuan Error
                </p>
                <div className="text-3xl font-extrabold tracking-tight mt-1.5 text-foreground">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalErrors}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lastUpdated ? `Sync: ${lastUpdated}` : "Siap"}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── 3. DATA TABLE CARD ─── */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          {/* TOOLBAR: FILTER & SEARCH */}
          <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/50 w-fit flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedCategoryFilter === "ALL"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua ({reports.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter("FATAL")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedCategoryFilter === "FATAL"
                    ? "bg-background text-red-600 shadow-xs font-bold"
                    : "text-muted-foreground hover:text-red-600"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                Ada Fatal ({stats.fatalApps})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter("NON_FATAL")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedCategoryFilter === "NON_FATAL"
                    ? "bg-background text-amber-600 shadow-xs font-bold"
                    : "text-muted-foreground hover:text-amber-600"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Minor Saja ({stats.nonFatalApps})
              </button>
              {stats.cleanApps > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("CLEAN")}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedCategoryFilter === "CLEAN"
                      ? "bg-background text-emerald-600 shadow-xs font-bold"
                      : "text-muted-foreground hover:text-emerald-600"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Lolos ({stats.cleanApps})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari ID aplikasi, field, analis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 text-sm bg-background border-border/80 focus-visible:ring-1"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ERROR BANNER */}
          {error && (
            <div className="m-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-300">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchReportData()}
                className="text-xs h-8 border-red-300 hover:bg-red-100/60 font-medium"
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* TABLE CONTAINER */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/90 dark:bg-muted/40 border-b border-border/70 hover:bg-slate-50/90">
                  <TableHead className="w-14 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                    No
                  </TableHead>
                  <TableHead className="w-[170px] text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 whitespace-nowrap">
                    ID Aplikasi
                  </TableHead>
                  <TableHead className="min-w-[320px] text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                    Daftar Parameter Error
                  </TableHead>
                  <TableHead className="w-[120px] text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 whitespace-nowrap">
                    Jumlah Error
                  </TableHead>
                  <TableHead className="w-[120px] text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 whitespace-nowrap">
                    Total Bobot
                  </TableHead>
                  <TableHead className="w-[130px] text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="w-[160px] text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 whitespace-nowrap">
                    Analis
                  </TableHead>
                  <TableHead className="w-[160px] text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 whitespace-nowrap">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  // Skeleton Loading Rows
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={idx} className="border-b border-border/40">
                      <TableCell className="text-center py-4">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </TableCell>
                      <TableCell className="py-4">
                        <Skeleton className="h-6 w-28 rounded-md" />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex gap-1.5">
                          <Skeleton className="h-6 w-24 rounded-md" />
                          <Skeleton className="h-6 w-32 rounded-md" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Skeleton className="h-5 w-8 mx-auto" />
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Skeleton className="h-6 w-12 mx-auto rounded-md" />
                      </TableCell>
                      <TableCell className="py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell className="py-4">
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Skeleton className="h-7 w-16 mx-auto rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredReports.length === 0 ? (
                  // Empty State
                  <TableRow>
                    <TableCell colSpan={8} className="h-56 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <div className="rounded-full bg-muted/80 p-4 border border-border/50">
                          <FileText className="h-7 w-7 text-muted-foreground/70" />
                        </div>
                        <p className="text-base font-semibold text-foreground">
                          {searchQuery || selectedCategoryFilter !== "ALL"
                            ? "Tidak ada aplikasi yang cocok"
                            : "Belum ada rekapan evaluasi IDE"}
                        </p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          {searchQuery || selectedCategoryFilter !== "ALL"
                            ? "Coba ubah kata kunci pencarian atau ganti filter kategori."
                            : "Klik tombol 'Input Temuan IDE' di atas untuk mencatat temuan baru."}
                        </p>
                        {(searchQuery || selectedCategoryFilter !== "ALL") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedCategoryFilter("ALL");
                            }}
                            className="text-xs mt-1"
                          >
                            Reset Semua Filter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Data Rows (1 Row = 1 Application)
                  filteredReports.map((item, index) => {
                    const hasFatal = item.errors?.some((e) => Number(e.bobot) >= 1);
                    const errorCount = item.errors?.length || 0;
                    const totalBobotNum =
                      typeof item.total_bobot === "number"
                        ? Math.round(item.total_bobot * 100) / 100
                        : parseFloat(String(item.total_bobot || 0)) || 0;

                    // Group and deduplicate errors for a clean, non-crowded display
                    const groupedErrorsMap = new Map<
                      string,
                      { nama_field: string; bobot: number; count: number }
                    >();
                    for (const err of item.errors || []) {
                      const name = err.nama_field;
                      const existing = groupedErrorsMap.get(name);
                      if (existing) {
                        existing.count += 1;
                      } else {
                        groupedErrorsMap.set(name, {
                          nama_field: name,
                          bobot: Number(err.bobot),
                          count: 1,
                        });
                      }
                    }
                    const groupedErrors = Array.from(groupedErrorsMap.values()).sort((a, b) => {
                      if ((b.bobot >= 1 ? 1 : 0) !== (a.bobot >= 1 ? 1 : 0)) {
                        return (b.bobot >= 1 ? 1 : 0) - (a.bobot >= 1 ? 1 : 0);
                      }
                      return b.count - a.count;
                    });

                    const visibleErrors = groupedErrors.slice(0, 2);
                    const hiddenErrors = groupedErrors.slice(2);
                    const hiddenCount = hiddenErrors.reduce((sum, e) => sum + e.count, 0);

                    return (
                      <TableRow
                        key={item.id_aplikasi || index}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        {/* 1. No */}
                        <TableCell className="text-center text-xs text-muted-foreground font-medium py-4">
                          {index + 1}
                        </TableCell>

                        {/* 2. ID Aplikasi (Clickable to detail) */}
                        <TableCell className="py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => navigate(`/report/${encodeURIComponent(item.id_aplikasi)}`)}
                            className="font-mono text-sm font-semibold px-2.5 py-1 rounded-md bg-muted/80 hover:bg-primary/10 hover:text-primary text-foreground border border-border/60 hover:border-primary/40 transition-colors cursor-pointer inline-flex items-center gap-1.5 group"
                            title="Klik untuk melihat detail aplikasi"
                          >
                            <span>{item.id_aplikasi}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </button>
                        </TableCell>

                        {/* 3. Daftar Parameter Error (Clean & Simplified) */}
                        <TableCell className="py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {groupedErrors.length > 0 ? (
                              <>
                                {visibleErrors.map((err, errIdx) => {
                                  const isFatal = err.bobot >= 1;
                                  const isClean =
                                    err.bobot === 0 ||
                                    err.nama_field?.toUpperCase().includes("NO ERROR");

                                  if (isClean) {
                                    return (
                                      <span
                                        key={`clean-${errIdx}`}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                                      >
                                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                                        <span>{err.nama_field}</span>
                                      </span>
                                    );
                                  }

                                  return (
                                    <span
                                      key={`err-${errIdx}-${err.nama_field}`}
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                                        isFatal
                                          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200/80 dark:border-red-900/40"
                                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40"
                                      }`}
                                    >
                                      <span>{err.nama_field}</span>
                                      {err.count > 1 && (
                                        <span className="ml-1 opacity-75 font-normal text-[11px]">
                                          ×{err.count}
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}

                                {hiddenCount > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger
                                      onClick={() =>
                                        navigate(`/report/${encodeURIComponent(item.id_aplikasi)}`)
                                      }
                                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/60"
                                      title="Lihat parameter lainnya"
                                    >
                                      +{hiddenCount} lainnya
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs p-2.5 max-w-xs shadow-md">
                                      <div className="space-y-1">
                                        <p className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/40">
                                          Parameter Lainnya:
                                        </p>
                                        {hiddenErrors.map((h, hIdx) => (
                                          <div
                                            key={hIdx}
                                            className="flex items-center justify-between gap-3 text-xs"
                                          >
                                            <span>
                                              {h.nama_field} {h.count > 1 ? `(${h.count}x)` : ""}
                                            </span>
                                            <span
                                              className={
                                                h.bobot >= 1
                                                  ? "text-red-500 font-semibold"
                                                  : "text-amber-500"
                                              }
                                            >
                                              {h.bobot >= 1 ? "Fatal" : "Minor"}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                Bersih (No Error)
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 4. Jumlah Error */}
                        <TableCell className="text-center py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-foreground">
                            {errorCount} Temuan
                          </span>
                        </TableCell>

                        {/* 5. Total Bobot */}
                        <TableCell className="text-center py-4 whitespace-nowrap">
                          <span
                            className={`font-mono text-sm font-bold px-2.5 py-1 rounded-md border ${
                              hasFatal
                                ? "bg-red-50/80 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40"
                                : totalBobotNum > 0
                                ? "bg-amber-50/80 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40"
                                : "bg-emerald-50/80 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40"
                            }`}
                          >
                            {totalBobotNum}
                          </span>
                        </TableCell>

                        {/* 6. Status */}
                        <TableCell className="py-4 whitespace-nowrap">
                          {hasFatal ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80">
                              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                              Fatal
                            </span>
                          ) : totalBobotNum > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Minor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80">
                              <span className="w-2 h-2 rounded-full bg-emerald-600" />
                              Lolos
                            </span>
                          )}
                        </TableCell>

                        {/* 7. Analis */}
                        <TableCell className="py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 border border-border/60 shadow-2xs">
                              {item.analis ? item.analis.slice(0, 1).toUpperCase() : "U"}
                            </span>
                            <span className="font-semibold text-foreground text-sm truncate">
                              {formatAnalisName(item.analis)}
                            </span>
                          </div>
                        </TableCell>

                        {/* 8. Aksi (Detail & Edit Button) */}
                        <TableCell className="text-center py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/report/${encodeURIComponent(item.id_aplikasi)}`)}
                              className="h-8 px-2.5 text-xs gap-1.5 font-medium hover:bg-primary hover:text-primary-foreground border-border/80 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Detail</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingReport(item);
                                setIsSubmitOpen(true);
                              }}
                              className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-colors"
                              title="Edit Temuan"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* TABLE FOOTER / RECORD COUNTER */}
          <div className="px-5 py-3.5 border-t border-border/60 bg-slate-50/60 dark:bg-muted/20 flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>
              Menampilkan{" "}
              <strong className="text-foreground font-bold">
                {filteredReports.length}
              </strong>{" "}
              aplikasi nasabah
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Terakhir diperbarui: {lastUpdated || "-"}
            </span>
          </div>
        </div>
      </main>

      {/* ─── 4. POPUP MODAL INPUT / EDIT TEMUAN IDE ─── */}
      <SubmitIdeModal
        open={isSubmitOpen}
        onOpenChange={(isOpen) => {
          setIsSubmitOpen(isOpen);
          if (!isOpen) setEditingReport(null);
        }}
        onSuccess={() => {
          fetchReportData(true);
          setEditingReport(null);
        }}
        editData={editingReport}
      />
    </div>
  );
}
