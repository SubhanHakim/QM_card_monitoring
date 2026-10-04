import api from "@/lib/axios";

export const authService = {
  login: async (payload: { username: string; password: string }) => {
    const response = await api.post("/auth/login", payload);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};
