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
import { Check, Loader2, Search, X } from "lucide-react";

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
  const [namaAplikan, setNamaAplikan] = useState("");
  const [namaUserIde, setNamaUserIde] = useState("");
  const [casSas, setCasSas] = useState("");
  const [channel, setChannel] = useState("");
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
        setNamaAplikan(editData.nama_aplikan || "");
        setNamaUserIde(editData.nama_user_ide || "");
        setCasSas(editData.cas_sas || "");
        setChannel(editData.channel || "");
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
    setNamaAplikan("");
    setNamaUserIde("");
    setCasSas("");
    setChannel("");
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

    if (!namaAplikan.trim()) {
      setSubmitError("Nama Aplikan wajib diisi.");
      return;
    }

    if (!namaUserIde.trim()) {
      setSubmitError("Nama User IDE wajib diisi.");
      return;
    }

    if (!casSas.trim()) {
      setSubmitError("CAS/SAS wajib diisi.");
      return;
    }

    if (!channel) {
      setSubmitError("Channel wajib dipilih.");
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
          nama_aplikan: namaAplikan.trim(),
          nama_user_ide: namaUserIde.trim(),
          cas_sas: casSas.trim(),
          channel,
          catatan_tambahan: catatanTambahan.trim() || null,
        });
        setSubmitSuccess("Perubahan temuan berhasil disimpan!");
      } else {
        const payload = {
          id_aplikasi: cleanAppId,
          nama_aplikan: namaAplikan.trim(),
          nama_user_ide: namaUserIde.trim(),
          cas_sas: casSas.trim(),
          channel,
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

  const parameterTabs = [
    { key: "ALL", label: "Semua" },
    { key: "FATAL", label: "Critical" },
    { key: "NON_FATAL", label: "Non-critical" },
  ] as const;

  // Tells the user why Save is disabled instead of greying it silently.
  const missingFields = [
    !idAplikasi.trim() && "ID aplikasi",
    !namaAplikan.trim() && "nama aplikan",
    !namaUserIde.trim() && "nama user IDE",
    !casSas.trim() && "CAS/SAS",
    !channel && "channel",
  ].filter(Boolean) as string[];
  const canSubmit = missingFields.length === 0 && selectedErrors.length > 0;
  const hint = isSubmitting
    ? "Menyimpan…"
    : missingFields.length > 0
    ? `Lengkapi ${missingFields[0]}${missingFields.length > 1 ? ` dan ${missingFields.length - 1} kolom lain` : ""}.`
    : selectedErrors.length === 0
    ? "Pilih minimal 1 parameter."
    : `${selectedErrors.length} parameter dipilih`;

  const label = "text-sm font-medium text-[#111]";
  const field = "h-10 rounded-md border-[#d1d5db] bg-white text-sm placeholder:text-[#6b6b6b] disabled:bg-[#f2f4f7] disabled:text-[#5f6368]";
  const req = <span className="ml-0.5 text-[#c4242a]" aria-hidden="true">*</span>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white p-0 text-[#111] sm:max-w-2xl">
        {/* ─── HEADER ─── */}
        <DialogHeader className="shrink-0 px-6 pb-4 pt-5">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {editData ? "Edit temuan IDE" : "Input temuan IDE"}
          </DialogTitle>
          <p className="text-sm text-[#5f6368]">
            {editData ? (
              <>
                Mengubah temuan untuk <span className="font-mono text-[#111]">{editData.id_aplikasi}</span>.
              </>
            ) : (
              "Catat parameter yang salah pada satu aplikasi nasabah."
            )}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col border-t border-[#e5e7eb]">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {submitError && (
              <p role="alert" className="rounded-md bg-[#ffedea] px-3 py-2 text-sm text-[#831c1e]">
                {submitError}
              </p>
            )}
            {submitSuccess && (
              <p role="status" className="rounded-md bg-[#dcfae5] px-3 py-2 text-sm text-[#04250e]">
                {submitSuccess}
              </p>
            )}

            {/* Identitas aplikasi */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="id_app" className={label}>
                  Nomor / ID aplikasi{req}
                </Label>
                <Input
                  id="id_app"
                  placeholder="APP-2026-9999"
                  value={idAplikasi}
                  onChange={(e) => setIdAplikasi(e.target.value)}
                  aria-describedby={editData ? "id_app_note" : undefined}
                  className={`${field} font-mono uppercase`}
                  disabled={isSubmitting || !!editData}
                  autoFocus={!editData}
                />
                {editData && (
                  <p id="id_app_note" className="text-xs text-[#5f6368]">
                    ID aplikasi tidak bisa diubah saat edit.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nama_aplikan" className={label}>
                  Nama aplikan{req}
                </Label>
                <Input
                  id="nama_aplikan"
                  placeholder="Nama lengkap aplikan"
                  value={namaAplikan}
                  onChange={(e) => setNamaAplikan(e.target.value)}
                  className={field}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama_user_ide" className={label}>
                  Nama user IDE{req}
                </Label>
                <Input
                  id="nama_user_ide"
                  placeholder="Nama user di sistem IDE"
                  value={namaUserIde}
                  onChange={(e) => setNamaUserIde(e.target.value)}
                  className={field}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cas_sas" className={label}>
                  CAS / SAS{req}
                </Label>
                <Input
                  id="cas_sas"
                  placeholder="Nomor CAS/SAS"
                  value={casSas}
                  onChange={(e) => setCasSas(e.target.value)}
                  className={field}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel" className={label}>
                  Channel{req}
                </Label>
                <select
                  id="channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  disabled={isSubmitting}
                  className={`${field} w-full border px-3 text-[#111] outline-none focus-visible:ring-1 focus-visible:ring-[#003D79] disabled:cursor-not-allowed ${
                    channel ? "" : "text-[#6b6b6b]"
                  }`}
                >
                  <option value="">Pilih channel</option>
                  <option value="MKK">MKK</option>
                  <option value="Bulk Upload">Bulk Upload</option>
                  <option value="CAKRA">CAKRA</option>
                  <option value="RM Tools">RM Tools</option>
                </select>
              </div>
            </div>

            {/* Parameter error */}
            <fieldset className="space-y-3">
              <div className="flex items-center justify-between">
                <legend className={label}>
                  Parameter error{req}
                </legend>
                <div className="flex items-center gap-4 text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedErrors(
                        filteredMasterErrors.filter((e) => !isNoErrorItem(e)).map((e) => e.id)
                      )
                    }
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                  >
                    Pilih semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedErrors([])}
                    className="cursor-pointer text-[#5f6368] underline-offset-4 hover:text-[#111] hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
                {/* Tabs on a full-width rule, search at the right */}
                <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-3">
                  <div role="tablist" className="-mb-px flex gap-4">
                    {parameterTabs.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`h-10 cursor-pointer border-b-2 text-sm transition-colors ${
                          activeTab === t.key
                            ? "border-[#003D79] font-medium text-[#111]"
                            : "border-transparent text-[#5f6368] hover:text-[#111]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-44 sm:w-56">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-[#5f6368]" />
                    <Input
                      type="text"
                      aria-label="Cari parameter"
                      placeholder="Cari parameter"
                      value={searchErrorQuery}
                      onChange={(e) => setSearchErrorQuery(e.target.value)}
                      className="h-8 rounded-md border-[#d1d5db] bg-white pl-8 pr-7 text-sm placeholder:text-[#6b6b6b]"
                    />
                    {searchErrorQuery && (
                      <button
                        type="button"
                        aria-label="Hapus pencarian"
                        onClick={() => setSearchErrorQuery("")}
                        className="absolute right-2 top-2 cursor-pointer text-[#5f6368] hover:text-[#111]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid max-h-60 grid-cols-1 gap-x-1 overflow-y-auto p-1 sm:grid-cols-2">
                  {isLoadingMaster ? (
                    <div className="col-span-full flex items-center justify-center gap-2 py-10 text-sm text-[#5f6368]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat parameter…
                    </div>
                  ) : filteredMasterErrors.length === 0 ? (
                    <p className="col-span-full py-10 text-center text-sm text-[#5f6368]">
                      Tidak ada parameter yang cocok.
                    </p>
                  ) : (
                    filteredMasterErrors.map((err) => {
                      const isChecked = selectedErrors.includes(err.id);
                      const isFatal = err.kategori.toLowerCase().includes("fatal");
                      const isClean = isNoErrorItem(err);

                      return (
                        <button
                          key={err.id}
                          type="button"
                          role="checkbox"
                          aria-checked={isChecked}
                          onClick={() => toggleError(err.id)}
                          className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[#003D79] ${
                            isChecked ? "bg-[#f2f4f7]" : "hover:bg-[#f9f9f9]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
                                isChecked ? "border-[#003D79] bg-[#003D79] text-white" : "border-[#9ca3af] bg-white"
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className={`truncate ${isChecked ? "font-medium" : ""}`}>{err.nama_field}</span>
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                              isClean
                                ? "bg-[#f2f2f2] text-[#5f6368]"
                                : isFatal
                                ? "bg-[#ffedea] text-[#831c1e]"
                                : "bg-[#fffbeb] text-[#92400e]"
                            }`}
                          >
                            {isClean ? "0" : err.bobot_error}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="catatan" className={label}>
                Catatan <span className="font-normal text-[#5f6368]">(opsional)</span>
              </Label>
              <Textarea
                id="catatan"
                placeholder="Tambahkan konteks temuan bila perlu"
                value={catatanTambahan}
                onChange={(e) => setCatatanTambahan(e.target.value)}
                className="h-20 resize-none rounded-md border-[#d1d5db] bg-white text-sm leading-relaxed placeholder:text-[#6b6b6b]"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* ─── FOOTER ─── */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e5e7eb] px-6 py-3">
            <span className="text-sm text-[#5f6368] tabular-nums">{hint}</span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-9 rounded-md border-[#d1d5db] bg-white px-4 text-sm font-medium hover:bg-[#f2f4f7]"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !canSubmit}
                className="h-9 rounded-md bg-[#003D79] px-4 text-sm font-medium text-white hover:bg-[#003D79]/90 disabled:bg-[#003D79]/40 disabled:opacity-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Menyimpan…
                  </>
                ) : editData ? (
                  "Simpan perubahan"
                ) : (
                  "Simpan laporan"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
