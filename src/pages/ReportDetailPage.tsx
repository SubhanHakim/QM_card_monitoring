import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ideService, type IdeReportItem } from "@/services/ideService";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SubmitIdeModal } from "@/components/SubmitIdeModal";

export default function ReportDetailPage() {
  const { id_aplikasi } = useParams<{ id_aplikasi: string }>();
  const navigate = useNavigate();

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

  const status = metrics.hasFatal
    ? { label: "Critical", cls: "bg-[#ffedea] text-[#831c1e]" }
    : metrics.totalBobot > 0
    ? { label: "Minor", cls: "bg-[#fffbeb] text-[#92400e]" }
    : { label: "Lolos evaluasi", cls: "bg-[#dcfae5] text-[#04250e]" };

  // Peer metrics in one divided container; total bobot answers "how bad is this application?", so it leads.
  const kpis = [
    { label: "Total bobot", value: metrics.totalBobot, note: "Akumulasi penalti nilai", lead: true },
    { label: "Jumlah temuan", value: metrics.totalErrors, note: "Parameter ketidaksesuaian" },
    { label: "Temuan critical", value: metrics.fatalCount, note: "Bobot error ≥ 1" },
    { label: "Temuan minor", value: metrics.minorCount, note: "Bobot error 0.1" },
  ];

  const headCell = "h-10 px-4 text-xs font-normal text-[#5f6368]";

  return (
    <AppShell>
      <main className="w-full flex-1 space-y-4 px-4 py-8 md:px-10">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64 rounded-sm" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[#e5e7eb] bg-white p-6">
            <h1 className="text-lg font-semibold">Detail aplikasi tidak bisa dimuat</h1>
            <p className="mt-1 text-sm text-[#831c1e]">{error}</p>
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={fetchDetail}
                className="h-9 rounded-md bg-[#003D79] px-4 text-sm font-medium text-white hover:bg-[#003D79]/90"
              >
                Coba lagi
              </Button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline"
              >
                Kembali ke daftar laporan
              </button>
            </div>
          </div>
        ) : report ? (
          <>
            {/* TITLE ROW */}
            <div>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#5f6368] transition-colors hover:text-[#111]"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                Daftar laporan
              </button>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-mono text-2xl font-semibold tracking-tight">{report.id_aplikasi}</h1>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#5f6368] transition-colors hover:text-[#111]"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {copied ? "Tersalin" : "Salin ID"}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-[#5f6368]">
                    {metrics.totalErrors === 0
                      ? "Tidak ada temuan pada evaluasi tahap IDE."
                      : `${metrics.totalErrors} temuan pada evaluasi tahap IDE oleh ${formatAnalisName(report.analis)}`}
                    {report.created_at &&
                      `, ${new Date(report.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`}
                    .
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={fetchDetail}
                    className="h-8 gap-2 rounded-md border-[#d1d5db] bg-white px-3 text-sm font-medium hover:bg-[#e9e9e9]/50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => setIsEditOpen(true)}
                    className="h-8 rounded-md bg-[#003D79] px-3.5 text-sm font-medium text-white hover:bg-[#003D79]/90"
                  >
                    Edit temuan
                  </Button>
                </div>
              </div>
            </div>

            {/* KPI STRIP */}
            <section
              aria-label="Ringkasan"
              className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#e5e7eb] lg:grid-cols-4"
            >
              {kpis.map((k) => (
                <div key={k.label} className="bg-white p-5">
                  <p className="text-sm text-[#5f6368]">{k.label}</p>
                  <p
                    className={`mt-2 font-normal leading-none tabular-nums ${k.lead ? "text-[32px]" : "text-2xl"} ${
                      k.value === 0 ? "text-[#6b6b6b]" : k.lead && metrics.hasFatal ? "text-[#c4242a]" : "text-[#111]"
                    }`}
                  >
                    {k.value}
                  </p>
                  <p className="mt-2 text-xs text-[#5f6368]">{k.note}</p>
                </div>
              ))}
            </section>

            {/* PARAMETER TABLE */}
            <section className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
              <div className="flex items-baseline justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
                <h2 className="text-base font-medium">Parameter temuan</h2>
                <span className="text-sm text-[#5f6368] tabular-nums">{report.errors?.length || 0} parameter</span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="border-[#e5e7eb] hover:bg-transparent">
                    <TableHead className={`${headCell} min-w-[240px] pl-5`}>Parameter</TableHead>
                    <TableHead className={headCell}>Kategori</TableHead>
                    <TableHead className={`${headCell} text-right`}>Bobot</TableHead>
                    <TableHead className={`${headCell} min-w-[240px] pr-5`}>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!report.errors || report.errors.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="h-32 text-center whitespace-normal">
                        <p className="text-sm font-medium">Tidak ada temuan kesalahan.</p>
                        <p className="mt-1 text-sm text-[#5f6368]">Aplikasi ini dievaluasi bersih (No Error).</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.errors.map((err, idx) => {
                      const bobotNum = Number(err.bobot);
                      const isFatal = bobotNum >= 1;
                      const isClean = bobotNum === 0 || err.nama_field.toUpperCase().includes("NO ERROR");

                      return (
                        <TableRow
                          key={`detail-err-${idx}`}
                          className="h-12 border-[#f2f2f2] transition-colors hover:bg-[#f9f9f9]"
                        >
                          <TableCell className="pl-5 text-sm font-medium">{err.nama_field}</TableCell>
                          <TableCell className="px-4">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                isClean
                                  ? "bg-[#f2f2f2] text-[#5f6368]"
                                  : isFatal
                                  ? "bg-[#ffedea] text-[#831c1e]"
                                  : "bg-[#fffbeb] text-[#92400e]"
                              }`}
                            >
                              {isClean ? "Bersih" : isFatal ? "Critical" : "Non-critical"}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 text-right text-sm tabular-nums">{err.bobot}</TableCell>
                          <TableCell className="pr-5 text-sm whitespace-normal text-[#5f6368]">
                            {err.catatan || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </section>

            {/* CATATAN ANALIS */}
            {(report.catatan || report.catatan_tambahan) && (
              <section className="rounded-lg border border-[#e5e7eb] bg-white p-5">
                <h2 className="text-base font-medium">Catatan analis</h2>
                <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed">
                  {report.catatan || report.catatan_tambahan}
                </p>
              </section>
            )}
          </>
        ) : null}
      </main>

      {report && (
        <SubmitIdeModal open={isEditOpen} onOpenChange={setIsEditOpen} onSuccess={fetchDetail} editData={report} />
      )}
    </AppShell>
  );
}
