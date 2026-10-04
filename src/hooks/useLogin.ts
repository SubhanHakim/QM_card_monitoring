import { authService } from "@/services/authService";
import { userAuthStore } from "@/store/authStore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = userAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (payload: {
    username: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const data = await authService.login(payload);
      setAuth(data.token, data.user);

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal login");
    } finally {
      setLoading(false);
    }
  };

  return { handleLogin, loading, error };
};
