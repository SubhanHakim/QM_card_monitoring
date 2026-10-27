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
import { AppShell } from "@/components/AppShell";
import {
  ideService,
  type RekapBulananResponse,
  type RekapBulananDetailItem,
} from "@/services/ideService";
import { AlertCircle, Download, RefreshCw, Search, X } from "lucide-react";

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

  const [sebaranTab, setSebaranTab] = useState<"channel" | "analis">("channel");
  const ringkasan = rekap?.ringkasan;
  const isFirstLoad = isLoadingRekap && !rekap;
  const periodeLabel =
    rekap?.periode ||
    `${NAMA_BULAN.find((b) => b.value === selectedBulan)?.label ?? ""} ${selectedTahun}`;

  // One finding under the title: what most needs attention this month.
  const finding = isFirstLoad
    ? "Memuat rekap…"
    : !ringkasan
    ? `Periode ${periodeLabel}.`
    : ringkasan.total_fatal > 0
    ? `${periodeLabel}: ${ringkasan.total_fatal} dari ${ringkasan.total_aplikasi} aplikasi memiliki temuan critical.`
    : `${periodeLabel}: tidak ada temuan critical di ${ringkasan.total_aplikasi} aplikasi.`;

  // Peer metrics in one divided container; status cells double as the drill-down filter.
  const kpis = [
    {
      label: "Aplikasi diperiksa",
      value: ringkasan?.total_aplikasi ?? 0,
      note: `${ringkasan?.total_error ?? 0} temuan · rata-rata bobot ${ringkasan?.rata_rata_bobot ?? 0}`,
    },
    { label: "Critical", value: ringkasan?.total_fatal ?? 0, note: "Bobot ≥ 1,0", status: "Fatal", lead: true },
    { label: "Minor", value: ringkasan?.total_minor ?? 0, note: "Bobot < 1,0", status: "Minor" },
    { label: "Lolos", value: ringkasan?.total_lolos ?? 0, note: "Tanpa error", status: "Lolos" },
  ];

  const headCell = "h-10 px-4 text-xs font-normal text-[#5f6368]";
  const sel =
    "h-8 rounded-md border border-[#d1d5db] bg-white px-2.5 text-sm text-[#111] outline-none focus-visible:ring-1 focus-visible:ring-[#003D79]";
  const cardHead = "flex h-12 items-center justify-between gap-3 border-b border-[#e5e7eb] px-5";
  const emptyText = "px-5 py-10 text-center text-sm text-[#5f6368]";
  const statusDot = (s?: string) =>
    s?.toLowerCase() === "fatal" ? "bg-[#c4242a]" : s?.toLowerCase() === "minor" ? "bg-[#b45309]" : "bg-[#247b50]";

  return (
    <AppShell>
      <main className="w-full flex-1 space-y-4 px-4 py-8 md:px-10">
        {/* TITLE ROW */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Rekap bulanan</h1>
            <p className="mt-1 text-sm text-[#5f6368]">{finding}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated && (
              <span className="mr-1 hidden text-xs tabular-nums text-[#5f6368] sm:inline">
                Diperbarui {lastUpdated}
              </span>
            )}
            <select
              aria-label="Bulan"
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(Number(e.target.value))}
              className={sel}
            >
              {NAMA_BULAN.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Tahun"
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className={sel}
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={handleCurrentMonth}
              className="h-8 rounded-md border-[#d1d5db] bg-white px-3 text-sm font-medium hover:bg-[#e9e9e9]/50"
            >
              Bulan ini
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoadingRekap || isRefreshing}
              className="h-8 gap-2 rounded-md border-[#d1d5db] bg-white px-3 text-sm font-medium hover:bg-[#e9e9e9]/50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingRekap || isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error stays inside the block that failed */}
        {rekapError && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-white px-5 py-3 text-sm">
            <span className="flex items-center gap-2 text-[#831c1e]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#c4242a]" />
              {rekapError}
              {lastUpdated ? ` Data terakhir valid ${lastUpdated}.` : ""}
            </span>
            <button
              type="button"
              onClick={() => fetchRekap(selectedBulan, selectedTahun)}
              className="shrink-0 cursor-pointer font-medium underline-offset-4 hover:underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* KPI STRIP: one container, 1px dividers. Status cells double as the drill-down filter. */}
        <section
          aria-label="Ringkasan"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#e5e7eb] lg:grid-cols-4"
        >
          {kpis.map((k) => {
            const selected = !!k.status && filterStatus === k.status;
            const body = (
              <>
                <p className={`text-sm ${selected ? "font-medium text-[#111]" : "text-[#5f6368]"}`}>{k.label}</p>
                <div
                  className={`mt-2 flex h-9 items-end font-normal leading-none tabular-nums ${
                    k.lead ? "text-[32px]" : "text-2xl"
                  } ${k.value === 0 ? "text-[#6b6b6b]" : k.lead ? "text-[#c4242a]" : "text-[#111]"}`}
                >
                  {isFirstLoad ? <Skeleton className="h-6 w-12 rounded-sm" /> : k.value}
                </div>
                <p className="mt-2 text-xs text-[#5f6368]">{k.note}</p>
              </>
            );
            const base = "border-b-2 bg-white p-5 text-left";
            return k.status ? (
              <button
                key={k.label}
                type="button"
                aria-pressed={selected}
                onClick={() => applyQuickFilter("status", k.status!)}
                className={`${base} cursor-pointer transition-colors hover:bg-[#f9f9f9] focus-visible:outline-2 focus-visible:outline-[#003D79] ${
                  selected ? "border-[#003D79]" : "border-transparent"
                }`}
              >
                {body}
              </button>
            ) : (
              <div key={k.label} className={`${base} border-transparent`}>
                {body}
              </div>
            );
          })}
        </section>

        {/* ─── BREAKDOWN: top parameters + one tabbed card for channel / analis ─── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Top parameters */}
          <section className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
            <div className={cardHead}>
              <h2 className="text-base font-medium">Parameter error teratas</h2>
              <span className="text-sm text-[#5f6368]">Paling sering muncul</span>
            </div>
            {isFirstLoad ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-sm" />
                ))}
              </div>
            ) : !rekap?.top_error || rekap.top_error.length === 0 ? (
              <p className={emptyText}>Tidak ada temuan error pada periode ini.</p>
            ) : (
              <ol className="p-1">
                {rekap.top_error.slice(0, 5).map((err, idx) => {
                  const isFatal =
                    (err.kategori || "").toLowerCase().includes("fatal") || Number(err.bobot) >= 1;
                  return (
                    <li key={err.id_error || idx} className="flex h-11 items-center gap-3 rounded-md px-4">
                      <span className="w-5 shrink-0 text-sm tabular-nums text-[#5f6368]">{idx + 1}.</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{err.nama_field}</span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                          isFatal ? "bg-[#ffedea] text-[#831c1e]" : "bg-[#fffbeb] text-[#92400e]"
                        }`}
                      >
                        {isFatal ? "Critical" : "Minor"}
                      </span>
                      <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                        {err.frekuensi} <span className="text-xs text-[#5f6368]">temuan</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Channel / analis */}
          <section className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-5">
              <div role="tablist" className="-mb-px flex gap-5">
                {(
                  [
                    { key: "channel", label: "Per channel", n: rekap?.per_channel?.length || 0 },
                    { key: "analis", label: "Per analis", n: rekap?.per_analis?.length || 0 },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={sebaranTab === t.key}
                    onClick={() => setSebaranTab(t.key)}
                    className={`h-12 cursor-pointer border-b-2 text-base transition-colors ${
                      sebaranTab === t.key
                        ? "border-[#003D79] font-medium text-[#111]"
                        : "border-transparent text-[#5f6368] hover:text-[#111]"
                    }`}
                  >
                    {t.label} <span className="text-sm font-normal tabular-nums text-[#5f6368]">{t.n}</span>
                  </button>
                ))}
              </div>
              <span className="hidden text-sm text-[#5f6368] sm:inline">Klik untuk memfilter tabel</span>
            </div>

            {isFirstLoad ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-sm" />
                ))}
              </div>
            ) : sebaranTab === "channel" ? (
              !rekap?.per_channel || rekap.per_channel.length === 0 ? (
                <p className={emptyText}>Belum ada data channel pada periode ini.</p>
              ) : (
                <ul className="p-1">
                  {rekap.per_channel.slice(0, 5).map((ch) => {
                    const isSelected = filterChannel === ch.channel;
                    const pct = Math.round((ch.total_aplikasi / (ringkasan?.total_aplikasi || 1)) * 100);
                    return (
                      <li key={ch.channel}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => applyQuickFilter("channel", ch.channel)}
                          className={`w-full cursor-pointer rounded-md px-4 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#003D79] ${
                            isSelected ? "bg-[#f2f4f7]" : "hover:bg-[#f9f9f9]"
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-3 text-sm">
                            <span className={isSelected ? "font-medium" : ""}>{ch.channel}</span>
                            <span className="tabular-nums text-[#5f6368]">
                              <span className="text-[#111]">{ch.total_aplikasi}</span> aplikasi · {ch.total_error} error · {pct}%
                            </span>
                          </span>
                          <span className="mt-2 block h-0.5 w-full bg-[#e5e7eb]">
                            <span
                              className="block h-0.5 bg-[#003D79] transition-[width] duration-300"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : !rekap?.per_analis || rekap.per_analis.length === 0 ? (
              <p className={emptyText}>Belum ada data analis pada periode ini.</p>
            ) : (
              <>
                <ul className="p-1">
                  {rekap.per_analis.slice(0, 5).map((an) => {
                    const isSelected = filterAnalis === an.username;
                    return (
                      <li key={an.username}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => applyQuickFilter("analis", an.username)}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-4 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#003D79] ${
                            isSelected ? "bg-[#f2f4f7]" : "hover:bg-[#f9f9f9]"
                          }`}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e9e9e9] text-xs font-medium">
                            {an.username ? an.username.slice(0, 2).toUpperCase() : "AN"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm ${isSelected ? "font-medium" : ""}`}>
                              {formatUsername(an.username)}
                            </span>
                            <span className="block text-xs tabular-nums text-[#5f6368]">
                              <span className={an.total_fatal > 0 ? "text-[#831c1e]" : ""}>Critical {an.total_fatal}</span>
                              {" · "}Minor {an.total_minor}
                              {" · "}Lolos {an.total_lolos}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-sm tabular-nums">
                            {an.total_aplikasi} <span className="text-[#5f6368]">aplikasi</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {rekap.per_analis.length > 5 && (
                  <p className="px-5 pb-3 text-xs text-[#5f6368]">
                    +{rekap.per_analis.length - 5} analis lainnya, gunakan filter di tabel.
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* ─── DRILL-DOWN TABLE ─── */}
        <section className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-medium">
                Aplikasi terperiksa <span className="font-normal tabular-nums text-[#5f6368]">{filteredDetailList.length}</span>
              </h2>
              <p className="mt-0.5 text-sm text-[#5f6368]">Rincian seluruh aplikasi nasabah untuk {periodeLabel}.</p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredDetailList.length === 0}
              className="h-8 gap-2 rounded-md border-[#d1d5db] bg-white px-3 text-sm font-medium hover:bg-[#e9e9e9]/50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>

          {/* Filter toolbar */}
          <div className="flex flex-col gap-2 border-b border-[#e5e7eb] px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
              <Search className="absolute left-3 top-2 h-4 w-4 text-[#5f6368]" />
              <Input
                type="text"
                aria-label="Cari aplikasi"
                placeholder="Cari ID aplikasi, aplikan, user IDE, CAS/SAS"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-md border-[#d1d5db] bg-white pl-9 pr-8 text-sm placeholder:text-[#6b6b6b] focus-visible:ring-1"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Hapus pencarian"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 cursor-pointer text-[#5f6368] hover:text-[#111]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              aria-label="Filter channel"
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className={sel}
            >
              <option value="ALL">Semua channel</option>
              <option value="MKK">MKK</option>
              <option value="Bulk Upload">Bulk Upload</option>
              <option value="CAKRA">CAKRA</option>
              <option value="RM Tools">RM Tools</option>
            </select>
            <select
              aria-label="Filter analis"
              value={filterAnalis}
              onChange={(e) => setFilterAnalis(e.target.value)}
              className={sel}
            >
              <option value="ALL">Semua analis</option>
              {rekap?.per_analis?.map((a) => (
                <option key={a.username} value={a.username}>
                  {formatUsername(a.username)}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={sel}
            >
              <option value="ALL">Semua status</option>
              <option value="Fatal">Critical</option>
              <option value="Minor">Minor</option>
              <option value="Lolos">Lolos</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="cursor-pointer px-1 text-sm text-[#5f6368] underline-offset-4 hover:text-[#111] hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Error stays inside the block that failed */}
          {detailError && (
            <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-3 text-sm">
              <span className="flex items-center gap-2 text-[#831c1e]">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#c4242a]" />
                {detailError}
              </span>
              <button
                type="button"
                onClick={() =>
                  fetchDetail(selectedBulan, selectedTahun, filterChannel, filterAnalis, filterStatus)
                }
                className="shrink-0 cursor-pointer font-medium underline-offset-4 hover:underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow className="border-[#e5e7eb] hover:bg-transparent">
                <TableHead className={`${headCell} pl-5`}>ID aplikasi</TableHead>
                <TableHead className={headCell}>Aplikan / user IDE</TableHead>
                <TableHead className={headCell}>CAS/SAS / channel</TableHead>
                <TableHead className={headCell}>Analis</TableHead>
                <TableHead className={`${headCell} text-right`}>Bobot / error</TableHead>
                <TableHead className={headCell}>Status</TableHead>
                <TableHead className={`${headCell} pr-5 text-right`}>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoadingDetail ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="h-14 border-[#f2f2f2] hover:bg-transparent">
                    <TableCell colSpan={7} className="px-5">
                      <Skeleton className="h-6 w-full rounded-sm" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredDetailList.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-40 whitespace-normal text-center">
                    <p className="text-sm font-medium">Tidak ada aplikasi yang sesuai.</p>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      {hasActiveFilters
                        ? "Ubah filter channel, analis, status, atau kata kunci."
                        : `Belum ada aplikasi terperiksa pada ${periodeLabel}.`}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="mt-2 cursor-pointer text-sm font-medium underline-offset-4 hover:underline"
                      >
                        Reset filter
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDetailList.map((item, idx) => (
                  <TableRow
                    key={item.id_aplikasi || idx}
                    className="h-14 border-[#f2f2f2] transition-colors hover:bg-[#f9f9f9]"
                  >
                    <TableCell className="pl-5">
                      <div className="font-mono text-sm font-medium">{item.id_aplikasi}</div>
                      {item.tanggal_input && (
                        <div className="text-xs text-[#5f6368]">
                          {new Date(item.tanggal_input).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="px-4">
                      <div className="text-sm">{item.nama_aplikan || "—"}</div>
                      <div className="text-xs text-[#5f6368]">User IDE: {item.nama_user_ide || "—"}</div>
                    </TableCell>

                    <TableCell className="px-4">
                      <div className="text-sm tabular-nums">{item.cas_sas || "—"}</div>
                      <div className="text-xs text-[#5f6368]">{item.channel || "Tidak diketahui"}</div>
                    </TableCell>

                    <TableCell className="px-4 text-sm">{formatUsername(item.analis)}</TableCell>

                    <TableCell className="px-4 text-right">
                      <div className="text-sm font-medium tabular-nums">{item.total_bobot}</div>
                      <div className="text-xs tabular-nums text-[#5f6368]">{item.jumlah_error} parameter</div>
                    </TableCell>

                    <TableCell className="px-4">
                      <span className="inline-flex items-center gap-2 text-sm">
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot(item.status)}`} />
                        {item.status === "Fatal" ? "Critical" : item.status}
                      </span>
                    </TableCell>

                    <TableCell className="pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/report/${encodeURIComponent(item.id_aplikasi)}`)}
                        className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline"
                      >
                        Detail
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </main>
    </AppShell>
  );
}
