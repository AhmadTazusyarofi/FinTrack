import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Lock, Mail, Sun, Moon } from "lucide-react";
import { loginRequest, saveAuth } from "../../services/auth.service";
import { useTheme } from "../../contexts/ThemeContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
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

  const inputWrapStyle = isDark
    ? {
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(45px) saturate(180%)",
        WebkitBackdropFilter: "blur(45px) saturate(180%)",
        borderColor: "rgba(255,255,255,0.10)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.30)",
      }
    : {
        background: "rgba(255,255,255,0.18)",
        backdropFilter: "blur(45px) saturate(180%)",
        WebkitBackdropFilter: "blur(45px) saturate(180%)",
        borderColor: "rgba(255,255,255,0.40)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      };

  const labelCls = `block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`;
  const inputCls = `w-full bg-transparent font-medium outline-none ${isDark ? "text-white placeholder-slate-500" : "text-brand-stroke placeholder-slate-400"}`;
  const iconCls = `absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-white/30" : "text-brand-stroke/40"}`;
  const eyeCls = `absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${isDark ? "text-white/30 hover:text-white/70" : "text-brand-stroke/40 hover:text-brand-stroke/70"}`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${isDark ? "bg-[#0f1117]" : "bg-white"}`}>
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-12 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDark ? "bg-white/10 hover:bg-white/15 text-white/60 hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700"}`}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full ${isDark ? "bg-brand-secondary/5" : "bg-brand-secondary/20"}`} />
        <div className={`absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full ${isDark ? "bg-brand-secondary/5" : "bg-brand-secondary/15"}`} />
        <div className="absolute top-1/3 right-0 w-32 h-32 rounded-full bg-brand-highlight/30 blur-2xl" />
        <div className="absolute top-1/4 right-1/4 w-56 h-56 rounded-full bg-brand-secondary/25 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full bg-brand-highlight/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 px-8">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-brand-stroke"}`}>
            BukuKasKu
          </h1>
          <p className={`font-medium mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Kelola keuangan pribadi dengan cerdas
          </p>
        </div>

        {/* Heading */}
        <div className="mb-5">
          <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-brand-stroke"}`}>
            Masuk ke akun
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Masukkan email dan password kamu
          </p>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl border text-sm font-semibold text-red-500"
            style={{
              background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.25)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className={labelCls}>Email</label>
            <div
              className="relative rounded-xl border focus-within:ring-2 focus-within:ring-brand-bg/20 focus-within:border-brand-bg/30 transition-all duration-200"
              style={inputWrapStyle}
            >
              <Mail className={iconCls} />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputCls} pl-10 pr-4 py-3 text-sm`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={labelCls}>Password</label>
            <div
              className="relative rounded-xl border focus-within:ring-2 focus-within:ring-brand-bg/20 focus-within:border-brand-bg/30 transition-all duration-200"
              style={inputWrapStyle}
            >
              <Lock className={iconCls} />
              <input
                type={showPass ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pl-10 pr-11 py-3 text-sm`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className={eyeCls}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

        <p className={`text-center text-sm font-medium mt-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Belum punya akun?{" "}
          <Link to="/auth/register" className="text-brand-bg hover:text-brand-bg/80 font-bold transition-colors">
            Daftar sekarang
          </Link>
        </p>

        <p className={`text-center text-xs font-semibold mt-6 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
          &copy; {new Date().getFullYear()} BukuKasKu
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
