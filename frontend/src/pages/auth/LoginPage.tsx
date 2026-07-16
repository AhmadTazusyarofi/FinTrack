import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Lock, Mail } from "lucide-react";
import { loginRequest, saveAuth } from "../../services/auth.service";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginRequest(email, password);
      saveAuth(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Login gagal, coba lagi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-secondary/20" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-secondary/15" />
        <div className="absolute top-1/3 right-0 w-32 h-32 rounded-full bg-brand-highlight/30 blur-2xl" />
        <div className="absolute top-1/4 right-1/4 w-56 h-56 rounded-full bg-brand-secondary/25 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full bg-brand-highlight/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 px-8">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-brand-stroke tracking-tight">
            BukuKasKu
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Kelola keuangan pribadi dengan cerdas
          </p>
        </div>

        {/* Heading */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-brand-stroke">Masuk ke akun</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Masukkan email dan password kamu
          </p>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl border text-sm font-semibold text-red-600"
            style={{
              background: "rgba(239,68,68,0.08)",
              backdropFilter: "blur(45px) saturate(180%)",
              WebkitBackdropFilter: "blur(45px) saturate(180%)",
              borderColor: "rgba(239,68,68,0.20)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <div
              className="relative rounded-xl border focus-within:ring-2 focus-within:ring-brand-bg/15 focus-within:border-brand-bg/30 transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                backdropFilter: "blur(45px) saturate(180%)",
                WebkitBackdropFilter: "blur(45px) saturate(180%)",
                borderColor: "rgba(255, 255, 255, 0.40)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-stroke/40 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-transparent text-brand-stroke placeholder-slate-400 text-sm font-medium outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div
              className="relative rounded-xl border focus-within:ring-2 focus-within:ring-brand-bg/15 focus-within:border-brand-bg/30 transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                backdropFilter: "blur(45px) saturate(180%)",
                WebkitBackdropFilter: "blur(45px) saturate(180%)",
                borderColor: "rgba(255, 255, 255, 0.40)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-stroke/40 pointer-events-none" />
              <input
                type={showPass ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-transparent text-brand-stroke placeholder-slate-400 text-sm font-medium outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-stroke/40 hover:text-brand-stroke/70 transition-colors"
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-bg hover:bg-brand-bg/90 active:scale-[0.98] text-brand-headline font-bold text-sm rounded-xl transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 font-medium mt-6">
          Belum punya akun?{" "}
          <Link
            to="/auth/register"
            className="text-brand-bg hover:text-brand-bg/80 font-bold transition-colors"
          >
            Daftar sekarang
          </Link>
        </p>

        <p className="text-center text-xs text-slate-400 font-semibold mt-6">
          &copy; {new Date().getFullYear()} Finance Tracker
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
