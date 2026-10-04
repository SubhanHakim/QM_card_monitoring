import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ideService, type MasterError } from "@/services/ideService";
import {
  AlertCircle,
  AlertOctagon,
  Check,
  CheckCircle2,
  FileCheck,
  Loader2,
  PlusCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";

interface SubmitIdeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SubmitIdeSheet({
  open,
  onOpenChange,
  onSuccess,
}: SubmitIdeSheetProps) {
  const [idAplikasi, setIdAplikasi] = useState("");
  const [selectedErrors, setSelectedErrors] = useState<number[]>([]);
  const [catatanTambahan, setCatatanTambahan] = useState("");
  const [masterErrors, setMasterErrors] = useState<MasterError[]>([]);
  const [searchErrorQuery, setSearchErrorQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "FATAL" | "NON_FATAL">("ALL");

  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Load master errors dari endpoint BE saat modal dibuka
  useEffect(() => {
    if (open) {
      setSubmitError(null);
      setSubmitSuccess(null);
      setIsLoadingMaster(true);
      ideService
        .getMasterErrors()
        .then((data) => {
          setMasterErrors(data);
        })
        .finally(() => {
          setIsLoadingMaster(false);
        });
    }
  }, [open]);

  // Cek apakah item adalah "NO ERROR"
  const isNoErrorItem = (err?: MasterError) => {
    if (!err) return false;
    const name = err.nama_field.toLowerCase();
    const kat = err.kategori.toLowerCase();
    return name.includes("no error") || kat.includes("clean");
  };

  // Toggle selection ID error dengan logika cerdas QM:
  // Jika memilih "NO ERROR", error lain dilepas.
  // Jika memilih error lain, "NO ERROR" dilepas.
  const toggleError = (id: number) => {
    const targetItem = masterErrors.find((e) => e.id === id);
    const isTargetNoError = isNoErrorItem(targetItem);

    setSelectedErrors((prev) => {
      const alreadyChecked = prev.includes(id);

      if (alreadyChecked) {
        return prev.filter((item) => item !== id);
      }

      if (isTargetNoError) {
        // Hanya "NO ERROR" yang dipilih
        return [id];
      }

      // Jika memilih error riil, buang pilihan "NO ERROR" jika sebelumnya terpilih
      const withoutNoError = prev.filter((prevId) => {
        const item = masterErrors.find((e) => e.id === prevId);
        return !isNoErrorItem(item);
      });

      return [...withoutNoError, id];
    });
  };

  const handleSelectAllCurrent = () => {
    // Pilih semua kecuali item "NO ERROR"
    const idsToAdd = filteredMasterErrors
      .filter((e) => !isNoErrorItem(e))
      .map((e) => e.id);
    setSelectedErrors(idsToAdd);
  };

  const handleDeselectAll = () => {
    setSelectedErrors([]);
  };

  const resetForm = () => {
    setIdAplikasi("");
    setSelectedErrors([]);
    setCatatanTambahan("");
    setSearchErrorQuery("");
    setActiveTab("ALL");
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // Preset catatan cepat
  const quickNotes = [
    "Nomor KTP kurang 1 digit",
    "Ejaan nama berbeda dengan sistem",
    "Dokumen KTP buram / tidak terbaca",
    "Nomor telepon tidak aktif",
    "Data valid dan sesuai",
  ];

  const handleAddQuickNote = (note: string) => {
    setCatatanTambahan((prev) => (prev ? `${prev}. ${note}` : note));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idAplikasi.trim()) {
      setSubmitError("Nomor / ID Aplikasi wajib diisi.");
      return;
    }

    if (selectedErrors.length === 0) {
      setSubmitError("Pilih minimal 1 parameter pemeriksaan / No Error.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Payload sesuai endpoint POST /api/ide/submit
      const payload = {
        id_aplikasi: idAplikasi.trim().toUpperCase(),
        errors: selectedErrors,
        catatan_tambahan: catatanTambahan.trim() || null,
      };

      await ideService.submitReport(payload);

      setSubmitSuccess(
        `Berhasil menyimpan ${selectedErrors.length} entri untuk ${payload.id_aplikasi}!`
      );

      // Trigger update dashboard table
      onSuccess();

      // Reset and close after feedback
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 1000);
    } catch (err: any) {
      console.error("Gagal submit temuan IDE:", err);
      setSubmitError(
        err?.response?.data?.message ||
          err?.message ||
          "Gagal menyimpan data ke server."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter master errors berdasarkan kategori tab & pencarian
  const filteredMasterErrors = useMemo(() => {
    return masterErrors.filter((e) => {
      const isFatal = e.kategori.toLowerCase().includes("fatal");
      if (activeTab === "FATAL" && !isFatal) return false;
      if (activeTab === "NON_FATAL" && isFatal) return false;

      if (!searchErrorQuery.trim()) return true;
      const q = searchErrorQuery.toLowerCase();
      return (
        e.nama_field.toLowerCase().includes(q) ||
        e.kategori.toLowerCase().includes(q)
      );
    });
  }, [masterErrors, activeTab, searchErrorQuery]);

  // Kalkulasi total bobot terpilih
  const selectedDetails = useMemo(() => {
    const items = masterErrors.filter((e) => selectedErrors.includes(e.id));
    const hasNoError = items.some((e) => isNoErrorItem(e));
    const fatalCount = items.filter((e) =>
      e.kategori.toLowerCase().includes("fatal")
    ).length;
    const totalWeight = items.reduce(
      (sum, e) => sum + (parseFloat(String(e.bobot_error)) || 0),
      0
    );

    return {
      items,
      hasNoError,
      fatalCount,
      totalWeight: Number(totalWeight.toFixed(1)),
    };
  }, [masterErrors, selectedErrors]);

  const fatalCountTotal = masterErrors.filter((e) =>
    e.kategori.toLowerCase().includes("fatal")
  ).length;
  const nonFatalCountTotal = masterErrors.length - fatalCountTotal;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col h-full overflow-hidden p-0 border-l border-border/70 bg-card shadow-2xl"
      >
        {/* ─── HEADER ─── */}
        <SheetHeader className="p-5 border-b border-border/60 bg-slate-50/70 dark:bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm dark:bg-white dark:text-slate-900 shadow-xs">
                <PlusCircle className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold tracking-tight text-foreground">
                  Input Temuan Pemeriksaan IDE
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Catat hasil evaluasi dan checklist kesalahan aplikasi nasabah
                </SheetDescription>
              </div>
            </div>

            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/40">
              Tahap IDE
            </span>
          </div>
        </SheetHeader>

        {/* ─── FORM CONTENT ─── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-5"
        >
          {/* Notification Banners */}
          {submitError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40 dark:border-red-900/40 dark:text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* 1. NOMOR / ID APLIKASI */}
          <div className="space-y-1.5">
            <Label htmlFor="id_aplikasi" className="text-xs font-semibold text-foreground">
              Nomor / ID Aplikasi <span className="text-red-500">*</span>
            </Label>
            <Input
              id="id_aplikasi"
              placeholder="Contoh: APP-2026-9999"
              value={idAplikasi}
              onChange={(e) => setIdAplikasi(e.target.value)}
              className="font-mono text-xs uppercase h-9 bg-background border-border/80 focus-visible:ring-1"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              ID unik aplikasi nasabah yang dievaluasi pada tahap IDE.
            </p>
          </div>

          {/* 2. DAFTAR CHECKLIST PARAMETER */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Checklist Parameter Kesalahan <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-primary">
                  {selectedErrors.length} dipilih
                </span>
                {selectedDetails.totalWeight > 0 && (
                  <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                    Bobot: {selectedDetails.totalWeight}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="space-y-2 bg-slate-50/80 dark:bg-muted/30 p-2.5 rounded-xl border border-border/60">
              {/* Category Sub-tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("ALL")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      activeTab === "ALL"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Semua ({masterErrors.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("FATAL")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                      activeTab === "FATAL"
                        ? "bg-background text-red-600 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-red-600"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    Fatal ({fatalCountTotal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("NON_FATAL")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                      activeTab === "NON_FATAL"
                        ? "bg-background text-amber-600 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-amber-600"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    Non-Fatal ({nonFatalCountTotal})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllCurrent}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-muted-foreground/30">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Batal
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari parameter (contoh: NIK, NAME, CAS)..."
                  value={searchErrorQuery}
                  onChange={(e) => setSearchErrorQuery(e.target.value)}
                  className="pl-8 pr-7 text-xs h-8 bg-background border-border/70"
                />
                {searchErrorQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchErrorQuery("")}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Error List Cards */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto rounded-xl border border-border/70 p-2 bg-background">
              {isLoadingMaster ? (
                <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span>Memuat parameter dari database...</span>
                </div>
              ) : filteredMasterErrors.length === 0 ? (
                <div className="text-center p-6 text-xs text-muted-foreground">
                  Tidak ditemukan parameter yang cocok.
                </div>
              ) : (
                filteredMasterErrors.map((err) => {
                  const isChecked = selectedErrors.includes(err.id);
                  const isFatal = err.kategori.toLowerCase().includes("fatal");
                  const isClean = isNoErrorItem(err);

                  return (
                    <div
                      key={err.id}
                      onClick={() => toggleError(err.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                        isChecked
                          ? isClean
                            ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                            : isFatal
                            ? "bg-red-500/10 border-red-500/40 shadow-xs"
                            : "bg-amber-500/10 border-amber-500/40 shadow-xs"
                          : "border-border/60 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox Icon */}
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                            isChecked
                              ? isClean
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : isFatal
                                ? "bg-red-600 border-red-600 text-white"
                                : "bg-amber-600 border-amber-600 text-white"
                              : "border-border bg-background"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        {/* Nama Field & Bobot */}
                        <div className="truncate">
                          <p className="text-xs font-semibold leading-tight text-foreground truncate">
                            {err.nama_field}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            Bobot: {err.bobot_error}
                          </p>
                        </div>
                      </div>

                      {/* Pill Badge */}
                      <div className="shrink-0 ml-2">
                        {isFatal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80 dark:border-red-900/40">
                            <AlertOctagon className="h-2.5 w-2.5" />
                            Fatal
                          </span>
                        ) : isClean ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/40">
                            <FileCheck className="h-2.5 w-2.5" />
                            Clean
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/40">
                            Non-Fatal
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. CATATAN & PRESET CEPAT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="catatan" className="text-xs font-semibold text-foreground">
                Catatan Tambahan <span className="text-muted-foreground font-normal">(Opsional)</span>
              </Label>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Preset Cepat
              </span>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5">
              {quickNotes.map((note, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddQuickNote(note)}
                  className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                >
                  + {note}
                </button>
              ))}
            </div>

            <Textarea
              id="catatan"
              placeholder="Tuliskan temuan spesifik (contoh: Nomor KTP kurang satu digit dan ejaan nama berbeda dengan sistem)..."
              value={catatanTambahan}
              onChange={(e) => setCatatanTambahan(e.target.value)}
              className="text-xs resize-none h-20 bg-background border-border/80 focus-visible:ring-1 leading-relaxed"
              disabled={isSubmitting}
            />
          </div>

          {/* 4. SUMMARY BOX */}
          {idAplikasi.trim() && selectedErrors.length > 0 && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                selectedDetails.hasNoError
                  ? "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                  : selectedDetails.fatalCount > 0
                  ? "bg-red-50/60 border-red-200 dark:bg-red-950/20 dark:border-red-900/40 text-red-800 dark:text-red-300"
                  : "bg-slate-50 border-border/70 dark:bg-muted/40 text-muted-foreground"
              }`}
            >
              <div className="flex justify-between items-center font-semibold">
                <span>Ringkasan Pengiriman:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-background/80 text-[11px] border border-border/50">
                  {selectedErrors.length} baris log • Bobot {selectedDetails.totalWeight}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Akan membuat {selectedErrors.length} catatan log pengecekan untuk{" "}
                <strong className="text-foreground">{idAplikasi.toUpperCase()}</strong> pada tahap IDE
                {selectedDetails.fatalCount > 0 && (
                  <span className="text-red-600 font-semibold ml-1">
                    ({selectedDetails.fatalCount} error fatal terdeteksi)
                  </span>
                )}
                .
              </p>
            </div>
          )}

          {/* ─── FOOTER ACTIONS ─── */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Batal
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={
                isSubmitting || !idAplikasi.trim() || selectedErrors.length === 0
              }
              className="gap-2 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan Log...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>
                    Kirim Laporan ({selectedErrors.length})
                    {selectedDetails.totalWeight > 0 &&
                      ` • Bobot: ${selectedDetails.totalWeight}`}
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
