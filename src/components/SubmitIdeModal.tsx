import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ideService, type MasterError, type IdeReportItem } from "@/services/ideService";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Search,
  X,
} from "lucide-react";

interface SubmitIdeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: IdeReportItem | null;
}

export function SubmitIdeModal({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: SubmitIdeModalProps) {
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

  // Load master errors saat popup dibuka
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

  // Pre-fill form jika dalam mode edit
  useEffect(() => {
    if (open) {
      if (editData) {
        setIdAplikasi(editData.id_aplikasi || "");
        setCatatanTambahan(editData.catatan_tambahan || editData.catatan || "");
      } else {
        resetForm();
      }
    }
  }, [open, editData]);

  // Sinkronisasi selectedErrors jika dalam mode edit setelah masterErrors dimuat
  useEffect(() => {
    if (open && editData && masterErrors.length > 0) {
      const selected: number[] = [];
      editData.errors?.forEach((itemErr: any) => {
        const found = masterErrors.find(
          (m) =>
            m.id === itemErr.id_error ||
            m.id === itemErr.id ||
            m.nama_field.trim().toLowerCase() === itemErr.nama_field?.trim().toLowerCase()
        );
        if (found && !selected.includes(found.id)) {
          selected.push(found.id);
        }
      });
      setSelectedErrors(selected);
    }
  }, [open, editData, masterErrors]);

  // Cek apakah item adalah "NO ERROR"
  const isNoErrorItem = (err?: MasterError) => {
    if (!err) return false;
    const name = err.nama_field.toLowerCase();
    const kat = err.kategori.toLowerCase();
    return name.includes("no error") || kat.includes("clean");
  };

  // Toggle selection
  const toggleError = (id: number) => {
    const targetItem = masterErrors.find((e) => e.id === id);
    const isTargetNoError = isNoErrorItem(targetItem);

    setSelectedErrors((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (isTargetNoError) {
        return [id];
      }
      return [
        ...prev.filter((prevId) => {
          const item = masterErrors.find((e) => e.id === prevId);
          return !isNoErrorItem(item);
        }),
        id,
      ];
    });
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idAplikasi.trim()) {
      setSubmitError("ID Aplikasi wajib diisi.");
      return;
    }

    if (selectedErrors.length === 0) {
      setSubmitError("Pilih minimal 1 parameter atau No Error.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const cleanAppId = idAplikasi.trim().toUpperCase();

      if (editData) {
        await ideService.updateReport(cleanAppId, {
          errors: selectedErrors,
          catatan_tambahan: catatanTambahan.trim() || null,
        });
        setSubmitSuccess("Perubahan temuan berhasil disimpan!");
      } else {
        const payload = {
          id_aplikasi: cleanAppId,
          errors: selectedErrors,
          catatan_tambahan: catatanTambahan.trim() || null,
        };
        await ideService.submitReport(payload);
        setSubmitSuccess("Berhasil disimpan!");
      }

      onSuccess();

      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 700);
    } catch (err: any) {
      console.error("Gagal submit:", err);
      setSubmitError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          "Gagal menyimpan data temuan."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter master errors
  const filteredMasterErrors = useMemo(() => {
    return masterErrors.filter((e) => {
      const isFatal = e.kategori.toLowerCase().includes("fatal");
      if (activeTab === "FATAL" && !isFatal) return false;
      if (activeTab === "NON_FATAL" && isFatal) return false;

      if (!searchErrorQuery.trim()) return true;
      return (
        e.nama_field.toLowerCase().includes(searchErrorQuery.toLowerCase())
      );
    });
  }, [masterErrors, activeTab, searchErrorQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-xl border-border/80 bg-card">
        {/* ─── HEADER MINIMALIS ─── */}
        <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <DialogTitle className="text-base font-bold text-foreground">
                {editData ? `Edit Temuan IDE (${editData.id_aplikasi})` : "Input Temuan IDE"}
              </DialogTitle>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                Tahap IDE
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ─── FORM & BODY ─── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Alert */}
            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            {submitSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* 1. ID APLIKASI */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="id_app" className="text-xs font-semibold text-foreground">
                  Nomor / ID Aplikasi <span className="text-red-500">*</span>
                </Label>
                {editData && (
                  <span className="text-[11px] text-muted-foreground italic">
                    Terkunci saat edit
                  </span>
                )}
              </div>
              <Input
                id="id_app"
                placeholder="APP-2026-9999"
                value={idAplikasi}
                onChange={(e) => setIdAplikasi(e.target.value)}
                className="font-mono text-sm uppercase h-9.5 bg-background disabled:bg-muted/70 disabled:text-muted-foreground"
                disabled={isSubmitting || !!editData}
                autoFocus={!editData}
              />
            </div>

            {/* 2. PARAMETER KESALAHAN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Pilih Parameter <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const ids = filteredMasterErrors
                        .filter((e) => !isNoErrorItem(e))
                        .map((e) => e.id);
                      setSelectedErrors(ids);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-muted-foreground/30">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedErrors([])}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Toolbar: Tabs & Search */}
              <div className="flex items-center gap-2">
                {/* Tabs */}
                <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("ALL")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      activeTab === "ALL"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("FATAL")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      activeTab === "FATAL"
                        ? "bg-background text-red-600 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-red-600"
                    }`}
                  >
                    Fatal
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("NON_FATAL")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      activeTab === "NON_FATAL"
                        ? "bg-background text-amber-600 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-amber-600"
                    }`}
                  >
                    Non-Fatal
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari parameter..."
                    value={searchErrorQuery}
                    onChange={(e) => setSearchErrorQuery(e.target.value)}
                    className="pl-8 pr-7 text-xs h-8 bg-background"
                  />
                  {searchErrorQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchErrorQuery("")}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Daftar Parameter (Clean Checklist Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-1 rounded-xl border border-border/70 bg-background">
                {isLoadingMaster ? (
                  <div className="col-span-2 flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat parameter...</span>
                  </div>
                ) : filteredMasterErrors.length === 0 ? (
                  <div className="col-span-2 text-center p-6 text-xs text-muted-foreground">
                    Tidak ada parameter ditemukan.
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
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer select-none transition-all ${
                          isChecked
                            ? isClean
                              ? "bg-emerald-500/10 border-emerald-500/60 font-semibold"
                              : isFatal
                              ? "bg-red-500/10 border-red-500/60 font-semibold"
                              : "bg-amber-500/10 border-amber-500/60 font-semibold"
                            : "border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
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
                          <span className="text-xs text-foreground leading-tight">
                            {err.nama_field}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            isFatal
                              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                              : isClean
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}
                        >
                          {isClean ? "0" : err.bobot_error}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. CATATAN TAMBAHAN (OPSIONAL) */}
            <div className="space-y-1.5">
              <Label htmlFor="catatan" className="text-xs font-semibold text-foreground">
                Catatan <span className="text-muted-foreground font-normal">(Opsional)</span>
              </Label>
              <Textarea
                id="catatan"
                placeholder="Catatan temuan..."
                value={catatanTambahan}
                onChange={(e) => setCatatanTambahan(e.target.value)}
                className="text-xs resize-none h-16 bg-background leading-relaxed"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* ─── FIXED FOOTER RINGKAS ─── */}
          <div className="px-6 py-3 border-t border-border/60 bg-muted/15 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground">
              {selectedErrors.length > 0 ? (
                <span>
                  <strong className="text-foreground">{selectedErrors.length}</strong> parameter dipilih
                </span>
              ) : (
                "Pilih minimal 1 parameter"
              )}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs h-9 px-3.5"
              >
                Batal
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={
                  isSubmitting || !idAplikasi.trim() || selectedErrors.length === 0
                }
                className="text-xs h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Menyimpan...
                  </>
                ) : (
                  editData ? "Simpan Perubahan" : "Simpan Laporan"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
