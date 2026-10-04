import { create } from "zustand";

interface User {
  name: string;
  role: string;
  username?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const userAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  user: localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user") || "{}")
    : null,
  setAuth: (token, user) => {
    set({ token, user });
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },
  logout: () => {
    set({ token: null, user: null });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
}));
