import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/useLogin";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { handleLogin, loading, error } = useLogin();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin({ username, password });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f2f4f7] p-4 text-[#111] antialiased">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="#003D79" strokeWidth="2" />
            <path d="M7.5 12.5l3 3 6-7" stroke="#003D79" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight">Quality Monitoring</h1>
            <p className="text-sm text-[#5f6368]">Masuk untuk membuka rekap temuan IDE.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-[#e5e7eb] bg-white p-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Username
            </Label>
            <Input
              type="text"
              id="username"
              autoComplete="username"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 rounded-md border-[#d1d5db] bg-white text-sm placeholder:text-[#6b6b6b]"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              type="password"
              id="password"
              autoComplete="current-password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-md border-[#d1d5db] bg-white text-sm placeholder:text-[#6b6b6b]"
              required
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-[#ffedea] px-3 py-2 text-sm text-[#831c1e]">
              {error}
            </p>
          )}

          <Button
            className="h-10 w-full rounded-md bg-[#003D79] text-sm font-medium text-white hover:bg-[#003D79]/90"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses…
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
