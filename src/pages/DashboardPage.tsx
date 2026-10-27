import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { AppShell } from "@/components/AppShell";
import { ideService, type IdeReportItem } from "@/services/ideService";
import { SubmitIdeModal } from "@/components/SubmitIdeModal";
import { AlertCircle, RefreshCw, Search, X } from "lucide-react";

export default function DashboardPage() {
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

  const filterTabs = [
    { key: "ALL", label: "Semua", count: reports.length },
    { key: "FATAL", label: "Ada critical", count: stats.fatalApps },
    { key: "NON_FATAL", label: "Minor saja", count: stats.nonFatalApps },
    ...(stats.cleanApps > 0
      ? [{ key: "CLEAN", label: "Lolos", count: stats.cleanApps }]
      : []),
  ];

  // Peer metrics in one divided container; the critical figure answers the screen's question, so it leads.
  const kpis = [
    { label: "Aplikasi dievaluasi", value: stats.totalApps, note: "Berkas aplikasi nasabah" },
    { label: "Aplikasi ada critical", value: stats.fatalApps, note: "Memiliki error bobot ≥ 1", lead: true },
    { label: "Minor saja", value: stats.nonFatalApps, note: "Hanya temuan non-critical" },
    { label: "Total temuan error", value: stats.totalErrors, note: "Di semua aplikasi" },
  ];

  const headCell = "h-10 px-4 text-xs font-normal text-[#5f6368]";
  const filtered = searchQuery || selectedCategoryFilter !== "ALL";

  return (
    <AppShell>
      {/* ─── CANVAS: one gutter (16px) between blocks ─── */}
      <main className="w-full flex-1 space-y-4 px-4 py-8 md:px-10">
        {/* TITLE ROW */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Temuan IDE</h1>
            <p className="mt-1 text-sm text-[#5f6368]">
              {isLoading
                ? "Memuat rekap temuan…"
                : stats.totalApps === 0
                ? "Belum ada aplikasi yang dievaluasi."
                : stats.fatalApps > 0
                ? `${stats.fatalApps} dari ${stats.totalApps} aplikasi memiliki temuan critical dan perlu ditindak.`
                : `Tidak ada temuan critical di ${stats.totalApps} aplikasi yang dievaluasi.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#5f6368] tabular-nums sm:inline">
              Diperbarui {lastUpdated || "—"}
            </span>
            <Button
              variant="outline"
              onClick={() => fetchReportData(true)}
              disabled={isLoading || isRefreshing}
              className="h-8 gap-2 rounded-md border-[#d1d5db] bg-white px-3 text-sm font-medium hover:bg-[#e9e9e9]/50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingReport(null);
                setIsSubmitOpen(true);
              }}
              className="h-8 rounded-md bg-[#003D79] px-3.5 text-sm font-medium text-white hover:bg-[#003D79]/90"
            >
              Input temuan IDE
            </Button>
          </div>
        </div>

        {/* KPI STRIP: one container, 1px dividers */}
        <section
          aria-label="Ringkasan"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#e5e7eb] lg:grid-cols-4"
        >
          {kpis.map((k) => (
            <div key={k.label} className="bg-white p-5">
              <p className="text-sm text-[#5f6368]">{k.label}</p>
              <div
                className={`mt-2 font-normal tabular-nums leading-none ${
                  k.lead ? "text-[32px]" : "text-2xl"
                } ${k.value === 0 ? "text-[#6b6b6b]" : k.lead ? "text-[#c4242a]" : "text-[#111]"}`}
              >
                {isLoading ? <Skeleton className="h-6 w-12 rounded-sm" /> : k.value}
              </div>
              <p className="mt-2 text-xs text-[#5f6368]">{k.note}</p>
            </div>
          ))}
        </section>

        {/* ─── DATA TABLE ─── */}
        <section className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
          {/* Tabs on a full-width rule, search at the right */}
          <div className="flex flex-col gap-2 border-b border-[#e5e7eb] px-5 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" className="-mb-px flex gap-6 overflow-x-auto">
              {filterTabs.map((t) => {
                const active = selectedCategoryFilter === t.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(t.key)}
                    className={`flex h-12 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 text-sm transition-colors ${
                      active
                        ? "border-[#003D79] font-medium text-[#111]"
                        : "border-transparent text-[#5f6368] hover:text-[#111]"
                    }`}
                  >
                    {t.label}
                    <span
                      className={`min-w-5 rounded px-1.5 py-0.5 text-center text-xs font-medium tabular-nums ${
                        t.key === "FATAL" && t.count > 0
                          ? "bg-[#ffedea] text-[#831c1e]"
                          : active
                          ? "bg-[#003D79] text-white"
                          : "bg-[#f2f2f2] text-[#5f6368]"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full pb-3 sm:w-80 sm:pb-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5f6368]" />
              <Input
                type="text"
                aria-label="Cari aplikasi"
                placeholder="Cari ID aplikasi, field, analis"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-md border-[#d1d5db] bg-white pl-9 pr-8 text-sm placeholder:text-[#6b6b6b] focus-visible:ring-1"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Hapus pencarian"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 cursor-pointer text-[#5f6368] hover:text-[#111]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Error stays inside the block that failed */}
          {error && (
            <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-3 text-sm">
              <span className="flex items-center gap-2 text-[#831c1e]">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#c4242a]" />
                {error}
                {lastUpdated ? ` Data terakhir valid ${lastUpdated}.` : ""}
              </span>
              <button
                type="button"
                onClick={() => fetchReportData()}
                className="cursor-pointer font-medium underline-offset-4 hover:underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          <Table className="min-w-[960px] table-fixed">
            <TableHeader>
              <TableRow className="border-[#e5e7eb] hover:bg-transparent">
                <TableHead className={`${headCell} w-44 pl-5`}>ID aplikasi</TableHead>
                <TableHead className={headCell}>Parameter error</TableHead>
                <TableHead className={`${headCell} w-24 text-right`}>Temuan</TableHead>
                <TableHead className={`${headCell} w-28 text-right`}>Total bobot</TableHead>
                <TableHead className={`${headCell} w-36 pl-8`}>Status</TableHead>
                <TableHead className={`${headCell} w-48`}>Analis</TableHead>
                <TableHead className={`${headCell} w-32 pr-5 text-right`}>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx} className="h-12 border-[#f2f2f2] hover:bg-transparent">
                    <TableCell className="pl-5"><Skeleton className="h-4 w-28 rounded-sm" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-5 w-40 rounded-sm" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="ml-auto h-4 w-6 rounded-sm" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="ml-auto h-4 w-8 rounded-sm" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-4 w-16 rounded-sm" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-4 w-24 rounded-sm" /></TableCell>
                    <TableCell className="pr-5"><Skeleton className="ml-auto h-4 w-20 rounded-sm" /></TableCell>
                  </TableRow>
                ))
              ) : filteredReports.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-40 text-center whitespace-normal">
                    <p className="text-sm font-medium">
                      {filtered ? "Tidak ada aplikasi yang cocok." : "Belum ada rekap evaluasi IDE."}
                    </p>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      {filtered
                        ? "Ubah kata kunci atau pilih tab lain."
                        : "Catat temuan pertama lewat tombol Input temuan IDE."}
                    </p>
                    {filtered && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategoryFilter("ALL");
                        }}
                        className="mt-2 cursor-pointer text-sm font-medium underline-offset-4 hover:underline"
                      >
                        Reset filter
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((item) => {
                  const hasFatal = item.errors?.some((e) => Number(e.bobot) >= 1);
                  const errorCount = item.errors?.length || 0;
                  const totalBobotNum =
                    typeof item.total_bobot === "number"
                      ? Math.round(item.total_bobot * 100) / 100
                      : parseFloat(String(item.total_bobot || 0)) || 0;
                  const detailUrl = `/report/${encodeURIComponent(item.id_aplikasi)}`;

                  // Group duplicate parameters, fatal first
                  const grouped = new Map<string, { nama_field: string; bobot: number; count: number }>();
                  for (const err of item.errors || []) {
                    const g = grouped.get(err.nama_field);
                    if (g) g.count += 1;
                    else grouped.set(err.nama_field, { nama_field: err.nama_field, bobot: Number(err.bobot), count: 1 });
                  }
                  const groupedErrors = Array.from(grouped.values()).sort(
                    (a, b) => Number(b.bobot >= 1) - Number(a.bobot >= 1) || b.count - a.count
                  );
                  const visibleErrors = groupedErrors.slice(0, 2);
                  const hiddenErrors = groupedErrors.slice(2);
                  const hiddenCount = hiddenErrors.reduce((sum, e) => sum + e.count, 0);

                  const chip = "inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium";

                  return (
                    <TableRow
                      key={item.id_aplikasi}
                      className="h-12 border-[#f2f2f2] transition-colors hover:bg-[#f9f9f9]"
                    >
                      <TableCell className="pl-5">
                        <button
                          type="button"
                          onClick={() => navigate(detailUrl)}
                          className="cursor-pointer font-mono text-sm font-medium hover:text-[#003D79] focus-visible:outline-2 focus-visible:outline-[#003D79]"
                        >
                          {item.id_aplikasi}
                        </button>
                      </TableCell>

                      <TableCell className="px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {groupedErrors.length === 0 ? (
                            <span className="text-sm text-[#5f6368]">Tidak ada error</span>
                          ) : (
                            <>
                              {visibleErrors.map((err) => (
                                <span
                                  key={err.nama_field}
                                  className={`${chip} ${
                                    err.bobot >= 1
                                      ? "bg-[#ffedea] text-[#831c1e]"
                                      : "bg-[#fffbeb] text-[#92400e]"
                                  }`}
                                >
                                  {err.nama_field}
                                  {err.count > 1 && <span className="ml-1 font-normal tabular-nums">×{err.count}</span>}
                                </span>
                              ))}
                              {hiddenCount > 0 && (
                                <Tooltip>
                                  <TooltipTrigger
                                    onClick={() => navigate(detailUrl)}
                                    className={`${chip} cursor-pointer bg-[#f2f2f2] text-[#5f6368] hover:text-[#111]`}
                                  >
                                    +{hiddenCount} lainnya
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs p-2.5 text-xs">
                                    <ul className="space-y-1">
                                      {hiddenErrors.map((h) => (
                                        <li key={h.nama_field} className="flex justify-between gap-4">
                                          <span>
                                            {h.nama_field}
                                            {h.count > 1 ? ` (${h.count}×)` : ""}
                                          </span>
                                          <span>{h.bobot >= 1 ? "Critical" : "Minor"}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-4 text-right tabular-nums">{errorCount}</TableCell>
                      <TableCell className="px-4 text-right font-medium tabular-nums">{totalBobotNum}</TableCell>

                      <TableCell className="pl-8 pr-4">
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              hasFatal ? "bg-[#c4242a]" : totalBobotNum > 0 ? "bg-[#b45309]" : "bg-[#247b50]"
                            }`}
                          />
                          {hasFatal ? "Critical" : totalBobotNum > 0 ? "Minor" : "Lolos"}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 text-sm">{formatAnalisName(item.analis)}</TableCell>

                      <TableCell className="pr-5 text-right">
                        <div className="inline-flex items-center gap-4 text-sm">
                          <button
                            type="button"
                            onClick={() => navigate(detailUrl)}
                            className="cursor-pointer font-medium underline-offset-4 hover:underline"
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReport(item);
                              setIsSubmitOpen(true);
                            }}
                            className="cursor-pointer text-[#5f6368] underline-offset-4 hover:text-[#111] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="border-t border-[#e5e7eb] px-5 py-3 text-xs text-[#5f6368]">
            Menampilkan <span className="tabular-nums text-[#111]">{filteredReports.length}</span> dari{" "}
            <span className="tabular-nums">{reports.length}</span> aplikasi nasabah
          </div>
        </section>
      </main>

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
    </AppShell>
  );
}
