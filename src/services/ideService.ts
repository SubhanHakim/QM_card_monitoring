import api from "@/lib/axios";

export interface MasterError {
  id: number;
  nama_field: string;
  bobot_error: string | number;
  kategori: string;
}

export interface ReportUser {
  username: string;
  role: string;
}

export interface ErrorDetail {
  nama_field: string;
  bobot: number | string;
  kategori?: string;
  catatan?: string;
  [key: string]: any;
}

export interface IdeReportItem {
  id_aplikasi: string;
  nama_aplikan?: string | null;
  nama_user_ide?: string | null;
  cas_sas?: string | null;
  channel?: string | null;
  total_bobot: number | string;
  analis: string | null;
  errors: ErrorDetail[];
  catatan?: string | null;
  catatan_tambahan?: string | null;
  created_at?: string | null;
  tanggal?: string | null;
  [key: string]: any;
}

export interface SubmitIdePayload {
  id_aplikasi: string;
  nama_aplikan?: string;
  nama_user_ide?: string;
  cas_sas?: string;
  channel?: string;
  errors: number[]; // array of id_error
  catatan_tambahan?: string | null;
}

export interface UpdateIdePayload {
  errors: number[]; // array of id_error
  nama_aplikan?: string;
  nama_user_ide?: string;
  cas_sas?: string;
  channel?: string;
  catatan_tambahan?: string | null;
  tahap_pengecekan?: string;
}

export interface RekapBulananRingkasan {
  total_aplikasi: number;
  total_error: number;
  rata_rata_bobot: number;
  total_fatal: number;
  total_minor: number;
  total_lolos: number;
}

export interface RekapBulananChannel {
  channel: string;
  total_aplikasi: number;
  total_error: number;
}

export interface RekapBulananAnalis {
  username: string;
  total_aplikasi: number;
  total_error: number;
  total_fatal: number;
  total_minor: number;
  total_lolos: number;
}

export interface RekapBulananTopError {
  id_error: number;
  nama_field: string;
  kategori: string;
  bobot: number;
  frekuensi: number;
}

export interface RekapBulananResponse {
  periode: string;
  bulan: number;
  tahun: number;
  ringkasan: RekapBulananRingkasan;
  per_channel: RekapBulananChannel[];
  per_analis: RekapBulananAnalis[];
  top_error: RekapBulananTopError[];
}

export interface RekapBulananDetailParams {
  bulan: number;
  tahun: number;
  channel?: string | null;
  analis?: string | null;
  status?: string | null;
}

export interface RekapBulananDetailItem {
  id_aplikasi: string;
  nama_aplikan?: string | null;
  nama_user_ide?: string | null;
  cas_sas?: string | null;
  channel?: string | null;
  tanggal_input?: string | null;
  analis: string | null;
  total_bobot: number;
  jumlah_error: number;
  status: "Fatal" | "Minor" | "Lolos" | string;
  errors: {
    id_error: number;
    nama_field: string;
    kategori?: string;
    bobot: number;
  }[];
}

export interface RekapBulananDetailResponse {
  periode: string;
  bulan: number;
  tahun: number;
  total_aplikasi: number;
  data: RekapBulananDetailItem[];
}

export const ideService = {
  // GET: /ide/rekap/bulanan?bulan=10&tahun=2026
  getRekapBulanan: async (bulan: number, tahun: number): Promise<RekapBulananResponse> => {
    const response = await api.get<RekapBulananResponse>("/ide/rekap/bulanan", {
      params: { bulan, tahun },
    });
    return response.data;
  },

  // GET: /ide/rekap/bulanan/detail?bulan=10&tahun=2026&channel=...&analis=...&status=...
  getRekapBulananDetail: async (
    params: RekapBulananDetailParams
  ): Promise<RekapBulananDetailResponse> => {
    const cleanParams: Record<string, any> = {
      bulan: params.bulan,
      tahun: params.tahun,
    };
    if (params.channel) cleanParams.channel = params.channel;
    if (params.analis) cleanParams.analis = params.analis;
    if (params.status) cleanParams.status = params.status;

    const response = await api.get<RekapBulananDetailResponse>(
      "/ide/rekap/bulanan/detail",
      { params: cleanParams }
    );
    return response.data;
  },
  // GET: http://localhost:5000/api/ide/report
  getReports: async () => {
    const response = await api.get<IdeReportItem[]>("/ide/report");
    return response.data;
  },

  // GET: http://localhost:5000/api/ide/report/:id_aplikasi
  getReportById: async (idAplikasi: string): Promise<IdeReportItem> => {
    const response = await api.get(`/ide/report/${encodeURIComponent(idAplikasi)}`);
    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData[0];
    }
    if (resData?.data && typeof resData.data === "object") {
      return Array.isArray(resData.data) ? resData.data[0] : resData.data;
    }
    return resData;
  },

  // PUT: http://localhost:5000/api/ide/report/:id_aplikasi
  updateReport: async (idAplikasi: string, payload: UpdateIdePayload) => {
    try {
      const response = await api.put(`/ide/report/${encodeURIComponent(idAplikasi)}`, payload);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 405 || err.response?.status === 404) {
        try {
          const patchRes = await api.patch(`/ide/report/${encodeURIComponent(idAplikasi)}`, payload);
          return patchRes.data;
        } catch {
          const postRes = await api.post(`/ide/report/${encodeURIComponent(idAplikasi)}`, payload);
          return postRes.data;
        }
      }
      throw err;
    }
  },

  // POST: http://localhost:5000/api/ide/submit
  submitReport: async (payload: SubmitIdePayload) => {
    const response = await api.post("/ide/submit", payload);
    return response.data;
  },

  // Mengambil daftar master error dari BE: GET http://localhost:5000/api/ide/parameters
  getMasterErrors: async (): Promise<MasterError[]> => {
    try {
      const res = await api.get("/ide/parameters");
      const data = Array.isArray(res.data) ? res.data : res.data?.data;
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (err) {
      console.warn("Gagal memanggil /ide/parameters, menggunakan fallback lokal:", err);
    }

    // Fallback template 16 parameter jika database belum diseed
    return [
      { id: 1, nama_field: "CAS", bobot_error: "0.1", kategori: "Non Fatal" },
      { id: 2, nama_field: "MARKETING SOURCE CODE", bobot_error: "0.1", kategori: "Non Fatal" },
      { id: 3, nama_field: "NO. ID/NIK", bobot_error: "1", kategori: "Fatal" },
      { id: 4, nama_field: "NAME", bobot_error: "1", kategori: "Fatal" },
      { id: 5, nama_field: "GENDER", bobot_error: "1", kategori: "Fatal" },
      { id: 6, nama_field: "PLACE OF BIRTH", bobot_error: "1", kategori: "Fatal" },
      { id: 7, nama_field: "DATE OF BIRTH", bobot_error: "1", kategori: "Fatal" },
      { id: 8, nama_field: "MOTHERS MAIDEN NAME", bobot_error: "1", kategori: "Fatal" },
      { id: 9, nama_field: "ADDRES LINE 1", bobot_error: "0.1", kategori: "Non Fatal" },
      { id: 10, nama_field: "KEC KEL KOTA PROVINSI1", bobot_error: "0.1", kategori: "Non Fatal" },
      { id: 11, nama_field: "TIPE TELP DAN NO TELP 1", bobot_error: "1", kategori: "Fatal" },
      { id: 12, nama_field: "EMAIL ADDRESS", bobot_error: "0.1", kategori: "Non Fatal" },
      { id: 13, nama_field: "TYPE OF WORK 1", bobot_error: "0.1", kategori: "Non Fatal" },
      { id: 14, nama_field: "COMPANY NAME", bobot_error: "1", kategori: "Fatal" },
      { id: 15, nama_field: "NIP", bobot_error: "0.1", kategori: "Non Fatal" },
      { id: 16, nama_field: "NO ERROR", bobot_error: "0", kategori: "Clean" },
    ];
  },
};
