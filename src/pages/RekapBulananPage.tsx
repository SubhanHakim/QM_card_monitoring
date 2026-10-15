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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { userAuthStore } from "@/store/authStore";
import {
  ideService,
  type RekapBulananResponse,
  type RekapBulananDetailItem,
} from "@/services/ideService";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Layers,
  LogOut,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

const NAMA_BULAN = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

export default function RekapBulananPage() {
  const { user, logout } = userAuthStore();
  const navigate = useNavigate();

  // Date selection state (default: current month & year)
  const now = new Date();
  const [selectedBulan, setSelectedBulan] = useState<number>(now.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState<number>(now.getFullYear());

  // Aggregate data state
  const [rekap, setRekap] = useState<RekapBulananResponse | null>(null);
  const [isLoadingRekap, setIsLoadingRekap] = useState<boolean>(true);
  const [rekapError, setRekapError] = useState<string | null>(null);

  // Drill-down data state
  const [detailList, setDetailList] = useState<RekapBulananDetailItem[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Drill-down filters state
  const [filterChannel, setFilterChannel] = useState<string>("ALL");
  const [filterAnalis, setFilterAnalis] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const formatUsername = (name: string | null | undefined) => {
    if (!name) return "Petugas QM";
    return name
      .split(/[_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  // Fetch Aggregate Rekap
  const fetchRekap = useCallback(
    async (bulan: number, tahun: number, isSilent = false) => {
      try {
        if (isSilent) {
          setIsRefreshing(true);
        } else {
          setIsLoadingRekap(true);
        }
        setRekapError(null);

        const data = await ideService.getRekapBulanan(bulan, tahun);
        setRekap(data);
        setLastUpdated(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } catch (err: any) {
        console.error("Gagal mengambil data rekap bulanan:", err);
        setRekapError(
          err?.response?.data?.msg ||
            err?.response?.data?.message ||
            "Gagal memuat rekap bulanan."
        );
      } finally {
        setIsLoadingRekap(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // Fetch Drill-down Detail
  const fetchDetail = useCallback(
    async (
      bulan: number,
      tahun: number,
      channel: string,
      analis: string,
      status: string
    ) => {
      try {
        setIsLoadingDetail(true);
        setDetailError(null);

        const res = await ideService.getRekapBulananDetail({
          bulan,
          tahun,
          channel: channel !== "ALL" ? channel : undefined,
          analis: analis !== "ALL" ? analis : undefined,
          status: status !== "ALL" ? status.toLowerCase() : undefined,
        });

        setDetailList(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        console.error("Gagal mengambil detail rekap:", err);
        setDetailError(
          err?.response?.data?.msg ||
            err?.response?.data?.message ||
            "Gagal memuat daftar drill-down."
        );
      } finally {
        setIsLoadingDetail(false);
      }
    },
    []
  );

  // Trigger fetch when period changes
  useEffect(() => {
    fetchRekap(selectedBulan, selectedTahun);
  }, [fetchRekap, selectedBulan, selectedTahun]);

  // Trigger fetch detail when filters change
  useEffect(() => {
    fetchDetail(
      selectedBulan,
      selectedTahun,
      filterChannel,
      filterAnalis,
      filterStatus
    );
  }, [
    fetchDetail,
    selectedBulan,
    selectedTahun,
    filterChannel,
    filterAnalis,
    filterStatus,
  ]);

  // Refresh handler
  const handleRefresh = () => {
    fetchRekap(selectedBulan, selectedTahun, true);
    fetchDetail(
      selectedBulan,
      selectedTahun,
      filterChannel,
      filterAnalis,
      filterStatus
    );
  };

  // Set to current month
  const handleCurrentMonth = () => {
    const today = new Date();
    setSelectedBulan(today.getMonth() + 1);
    setSelectedTahun(today.getFullYear());
  };

  // Client search filter on the detail list
  const filteredDetailList = useMemo(() => {
    if (!searchQuery.trim()) return detailList;
    const q = searchQuery.toLowerCase();
    return detailList.filter((item) => {
      const matchApp = item.id_aplikasi?.toLowerCase().includes(q);
      const matchAplikan = item.nama_aplikan?.toLowerCase().includes(q);
      const matchUserIde = item.nama_user_ide?.toLowerCase().includes(q);
      const matchCasSas = item.cas_sas?.toLowerCase().includes(q);
      const matchChannel = item.channel?.toLowerCase().includes(q);
      const matchAnalis = item.analis?.toLowerCase().includes(q);
      return (
        matchApp ||
        matchAplikan ||
        matchUserIde ||
        matchCasSas ||
        matchChannel ||
        matchAnalis
      );
    });
  }, [detailList, searchQuery]);

  // Quick filter shortcuts
  const applyQuickFilter = (type: "channel" | "analis" | "status", value: string) => {
    if (type === "channel") {
      setFilterChannel((prev) => (prev === value ? "ALL" : value));
    } else if (type === "analis") {
      setFilterAnalis((prev) => (prev === value ? "ALL" : value));
    } else if (type === "status") {
      setFilterStatus((prev) => (prev === value ? "ALL" : value));
    }
  };

  const resetAllFilters = () => {
    setFilterChannel("ALL");
    setFilterAnalis("ALL");
    setFilterStatus("ALL");
    setSearchQuery("");
  };

  const hasActiveFilters =
    filterChannel !== "ALL" ||
    filterAnalis !== "ALL" ||
    filterStatus !== "ALL" ||
    searchQuery.trim() !== "";

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredDetailList || filteredDetailList.length === 0) return;

    const headers = [
      "No",
      "ID Aplikasi",
      "Nama Aplikan",
      "Nama User IDE",
      "CAS/SAS",
      "Channel",
      "Tanggal Input",
      "Petugas Analis",
      "Total Bobot",
      "Jumlah Error",
      "Status",
      "Temuan Error",
    ];

    const rows = filteredDetailList.map((item, idx) => [
      idx + 1,
      `"${item.id_aplikasi}"`,
      `"${item.nama_aplikan || "-"}"`,
      `"${item.nama_user_ide || "-"}"`,
      `"${item.cas_sas || "-"}"`,
      `"${item.channel || "-"}"`,
      `"${item.tanggal_input ? new Date(item.tanggal_input).toLocaleDateString("id-ID") : "-"}"`,
      `"${item.analis || "-"}"`,
      item.total_bobot,
      item.jumlah_error,
      `"${item.status}"`,
      `"${item.errors?.map((e) => e.nama_field).join("; ") || "Clean"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Rekap_IDE_${rekap?.periode?.replace(/\s+/g, "_") || `${selectedBulan}_${selectedTahun}`}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ringkasan = rekap?.ringkasan;

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
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/70 dark:bg-blue-950/50 dark:text-blue-300">
                    IDE Stage
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rekapitulasi Evaluasi Pemeriksaan per Aplikasi
                </p>
              </div>
            </div>

            {/* Segmented Switcher: Real-time vs Rekap Bulanan */}
            <nav className="hidden md:flex items-center p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-medium">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Daftar Laporan
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg bg-background text-foreground font-semibold shadow-xs flex items-center gap-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
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
                  onClick={() => navigate("/dashboard")}
                  className="cursor-pointer text-sm font-medium flex items-center gap-2.5 p-2 rounded-md"
                >
                  <FileText className="h-4 w-4" />
                  Daftar Laporan
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

      {/* ─── 2. MAIN CONTENT CONTAINER ─── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-medium w-full">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex-1 py-2 rounded-lg text-muted-foreground hover:text-foreground text-center"
          >
            Daftar Laporan
          </button>
          <button
            type="button"
            className="flex-1 py-2 rounded-lg bg-background text-foreground font-semibold shadow-xs text-center"
          >
            Rekap Bulanan
          </button>
        </div>

        {/* ─── PERIODE SELECTOR & HEADER TITLE ─── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Rekapitulasi Bulanan IDE
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Agregat evaluasi pemeriksaan nasabah, breakdown channel, analis, dan parameter kesalahan</span>
              {lastUpdated && (
                <span className="text-[11px] font-mono text-muted-foreground/80 bg-muted/60 px-2 py-0.5 rounded-md">
                  Update: {lastUpdated}
                </span>
              )}
            </p>
          </div>

          {/* Period Selector Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bulan Dropdown */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="select-bulan" className="text-xs font-medium text-muted-foreground">
                Bulan:
              </label>
              <select
                id="select-bulan"
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(Number(e.target.value))}
                className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-xs focus:ring-1 focus:ring-ring"
              >
                {NAMA_BULAN.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun Input */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="select-tahun" className="text-xs font-medium text-muted-foreground">
                Tahun:
              </label>
              <select
                id="select-tahun"
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(Number(e.target.value))}
                className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-xs focus:ring-1 focus:ring-ring"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Bulan Ini */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrentMonth}
              className="text-xs h-9 px-3 gap-1.5 font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Bulan Ini
            </Button>

            {/* Tombol Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoadingRekap || isRefreshing}
              className="text-xs h-9 px-3 gap-1.5 font-medium"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isLoadingRekap || isRefreshing ? "animate-spin text-primary" : ""
                }`}
              />
              {isRefreshing ? "Memuat..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {rekapError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-800 text-sm border border-red-200 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Gagal memuat rekap bulanan</p>
              <p className="text-xs text-red-700 dark:text-red-400">{rekapError}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchRekap(selectedBulan, selectedTahun)}
              className="text-xs bg-white dark:bg-card"
            >
              Coba Lagi
            </Button>
          </div>
        )}

        {/* ─── 3. EXECUTIVE SUMMARY CARDS (RINGKASAN) ─── */}
        {isLoadingRekap && !rekap ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Aplikasi */}
            <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Total Aplikasi</span>
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {ringkasan?.total_aplikasi ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">Periksa di {rekap?.periode}</p>
              </CardContent>
            </Card>

            {/* Total Error */}
            <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Total Temuan</span>
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {ringkasan?.total_error ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">Parameter error tercatat</p>
              </CardContent>
            </Card>

            {/* Rata-rata Bobot */}
            <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Rata-rata Bobot</span>
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {ringkasan?.rata_rata_bobot ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">Bobot per aplikasi</p>
              </CardContent>
            </Card>

            {/* Total Fatal */}
            <Card
              onClick={() => applyQuickFilter("status", "Fatal")}
              className={`rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-all cursor-pointer ${
                filterStatus === "Fatal"
                  ? "ring-2 ring-red-500 bg-red-50/30 dark:bg-red-950/20"
                  : ""
              }`}
            >
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    Temuan Fatal
                  </span>
                  <div className="p-1.5 rounded-lg bg-red-100/70 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                    <AlertOctagon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                  {ringkasan?.total_fatal ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">Bobot ≥ 1.0 (Klik filter)</p>
              </CardContent>
            </Card>

            {/* Total Minor */}
            <Card
              onClick={() => applyQuickFilter("status", "Minor")}
              className={`rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-all cursor-pointer ${
                filterStatus === "Minor"
                  ? "ring-2 ring-amber-500 bg-amber-50/30 dark:bg-amber-950/20"
                  : ""
              }`}
            >
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Temuan Minor
                  </span>
                  <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {ringkasan?.total_minor ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">Bobot &lt; 1.0 (Klik filter)</p>
              </CardContent>
            </Card>

            {/* Total Lolos */}
            <Card
              onClick={() => applyQuickFilter("status", "Lolos")}
              className={`rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-all cursor-pointer ${
                filterStatus === "Lolos"
                  ? "ring-2 ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                  : ""
              }`}
            >
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Lolos / Clean
                  </span>
                  <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {ringkasan?.total_lolos ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">Tanpa error (Klik filter)</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── 4. ANALYTICAL BREAKDOWN (3 COLUMNS / CARDS) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* A. BREAKDOWN PER CHANNEL */}
          <Card className="rounded-2xl border-border/80 shadow-xs flex flex-col">
            <CardHeader className="px-5 py-4 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Distribusi per Channel
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {rekap?.per_channel?.length || 0} Channel
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              {isLoadingRekap && !rekap ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : !rekap?.per_channel || rekap.per_channel.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Belum ada data channel pada periode ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {rekap.per_channel.map((ch) => {
                    const isSelected = filterChannel === ch.channel;
                    const maxApps = ringkasan?.total_aplikasi || 1;
                    const pct = Math.round((ch.total_aplikasi / maxApps) * 100);

                    return (
                      <div
                        key={ch.channel}
                        onClick={() => applyQuickFilter("channel", ch.channel)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-primary/10 border-primary font-semibold shadow-xs"
                            : "border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            {ch.channel}
                            {isSelected && (
                              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded-md">
                                Terfilter
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">{ch.total_aplikasi}</strong> app (
                            {ch.total_error} err)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                          <span>{pct}% dari total aplikasi</span>
                          <span className="text-primary hover:underline font-medium">
                            {isSelected ? "Batal filter" : "Filter drill-down →"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* B. TOP 10 TEMUAN ERROR */}
          <Card className="rounded-2xl border-border/80 shadow-xs flex flex-col">
            <CardHeader className="px-5 py-4 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Top Parameter Error
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">Paling sering muncul</span>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto max-h-[380px]">
              {isLoadingRekap && !rekap ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-xl" />
                  ))}
                </div>
              ) : !rekap?.top_error || rekap.top_error.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Tidak ada temuan error pada periode ini (100% Bersih).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {rekap.top_error.map((err, idx) => {
                    const isFatal =
                      (err.kategori || "").toLowerCase().includes("fatal") ||
                      Number(err.bobot) >= 1;

                    return (
                      <div
                        key={err.id_error || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {err.nama_field}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                  isFatal
                                    ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                }`}
                              >
                                {isFatal ? "Fatal" : "Minor"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Bobot: {err.bobot}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Frequency Count */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-foreground">
                            {err.frekuensi}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            temuan
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* C. PRODUKTIVITAS PER ANALIS */}
          <Card className="rounded-2xl border-border/80 shadow-xs flex flex-col">
            <CardHeader className="px-5 py-4 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Performa per Analis
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {rekap?.per_analis?.length || 0} Analis
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto max-h-[380px]">
              {isLoadingRekap && !rekap ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : !rekap?.per_analis || rekap.per_analis.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Belum ada data analis pada periode ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {rekap.per_analis.map((an) => {
                    const isSelected = filterAnalis === an.username;

                    return (
                      <div
                        key={an.username}
                        onClick={() => applyQuickFilter("analis", an.username)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-primary/10 border-primary font-semibold shadow-xs"
                            : "border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {an.username ? an.username.slice(0, 2).toUpperCase() : "AN"}
                            </div>
                            <span className="font-semibold text-foreground">
                              {formatUsername(an.username)}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded-md">
                                Terfilter
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {an.total_aplikasi} App
                          </span>
                        </div>

                        {/* Breakdown status badges */}
                        <div className="flex items-center gap-1.5 text-[10px] mt-2">
                          <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-medium dark:bg-red-950/40 dark:text-red-300">
                            Fatal: {an.total_fatal}
                          </span>
                          <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium dark:bg-amber-950/40 dark:text-amber-300">
                            Minor: {an.total_minor}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium dark:bg-emerald-950/40 dark:text-emerald-300">
                            Lolos: {an.total_lolos}
                          </span>
                          <span className="ml-auto text-muted-foreground">
                            {an.total_error} err
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── 5. DRILL-DOWN DETAIL TABLE ─── */}
        <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-border/60 bg-muted/15 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-bold text-foreground">
                    Drill-Down: Daftar Aplikasi Terperiksa
                  </CardTitle>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {filteredDetailList.length} Aplikasi
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rincian seluruh aplikasi nasabah untuk periode {rekap?.periode || "terpilih"}
                </p>
              </div>

              {/* Export Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={filteredDetailList.length === 0}
                  className="text-xs h-8.5 px-3 gap-1.5 font-medium shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Error Alert Drill-Down */}
            {detailError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{detailError}</span>
              </div>
            )}

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari ID Aplikasi, Nama Aplikan, User IDE, CAS/SAS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 text-xs h-8.5 bg-background rounded-lg"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Channel */}
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="h-8.5 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Semua Channel</option>
                <option value="MKK">MKK</option>
                <option value="Bulk Upload">Bulk Upload</option>
                <option value="CAKRA">CAKRA</option>
                <option value="RM Tools">RM Tools</option>
              </select>

              {/* Filter Analis */}
              <select
                value={filterAnalis}
                onChange={(e) => setFilterAnalis(e.target.value)}
                className="h-8.5 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Semua Analis</option>
                {rekap?.per_analis?.map((a) => (
                  <option key={a.username} value={a.username}>
                    {formatUsername(a.username)}
                  </option>
                ))}
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-8.5 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Semua Status</option>
                <option value="Fatal">Fatal</option>
                <option value="Minor">Minor</option>
                <option value="Lolos">Lolos</option>
              </select>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFilters}
                  className="text-xs h-8.5 px-2.5 text-muted-foreground hover:text-foreground gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Drill-Down Table Content */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs font-semibold text-center">No</TableHead>
                  <TableHead className="text-xs font-semibold">ID Aplikasi</TableHead>
                  <TableHead className="text-xs font-semibold">Nama Aplikan / User IDE</TableHead>
                  <TableHead className="text-xs font-semibold">CAS/SAS & Channel</TableHead>
                  <TableHead className="text-xs font-semibold">Petugas Analis</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Bobot / Error</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoadingDetail ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={8} className="py-3 px-6">
                        <Skeleton className="h-8 w-full rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredDetailList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">
                          Tidak ada aplikasi yang sesuai dengan filter.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Coba ganti filter channel, analis, atau kata kunci pencarian.
                        </p>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetAllFilters}
                            className="text-xs mt-2"
                          >
                            Reset Semua Filter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDetailList.map((item, idx) => {
                    const isFatal = item.status?.toLowerCase() === "fatal";
                    const isMinor = item.status?.toLowerCase() === "minor";
                    const isLolos = item.status?.toLowerCase() === "lolos";

                    return (
                      <TableRow
                        key={item.id_aplikasi || idx}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        {/* No */}
                        <TableCell className="text-xs text-muted-foreground text-center font-mono">
                          {idx + 1}
                        </TableCell>

                        {/* ID Aplikasi */}
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-foreground">
                            {item.id_aplikasi}
                          </div>
                          {item.tanggal_input && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.tanggal_input).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </TableCell>

                        {/* Nama Aplikan / User IDE */}
                        <TableCell>
                          <div className="text-xs font-semibold text-foreground">
                            {item.nama_aplikan || "-"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            User IDE: {item.nama_user_ide || "-"}
                          </div>
                        </TableCell>

                        {/* CAS/SAS & Channel */}
                        <TableCell>
                          <div className="text-xs font-medium text-foreground">
                            {item.cas_sas || "-"}
                          </div>
                          <div className="mt-0.5">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {item.channel || "Unknown"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Analis */}
                        <TableCell>
                          <span className="text-xs font-medium text-foreground">
                            {formatUsername(item.analis)}
                          </span>
                        </TableCell>

                        {/* Bobot & Error */}
                        <TableCell className="text-center">
                          <div className="text-xs font-bold text-foreground">
                            {item.total_bobot}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {item.jumlah_error} parameter
                          </span>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isFatal
                                ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                                : isMinor
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                            }`}
                          >
                            {isFatal && <AlertOctagon className="h-3 w-3" />}
                            {isMinor && <AlertTriangle className="h-3 w-3" />}
                            {isLolos && <CheckCircle2 className="h-3 w-3" />}
                            {item.status}
                          </span>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/report/${encodeURIComponent(item.id_aplikasi)}`)}
                            className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
