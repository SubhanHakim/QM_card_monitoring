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
  errors: number[]; // array of id_error
  catatan_tambahan?: string | null;
}

export interface UpdateIdePayload {
  errors: number[]; // array of id_error
  catatan_tambahan?: string | null;
  tahap_pengecekan?: string;
}

export const ideService = {
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
