import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus, Lock, Mail, User } from "lucide-react";
import { registerRequest, saveAuth } from "../../services/auth.service";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPass) {
      setError("Password dan konfirmasi password tidak cocok");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      const data = await registerRequest(name.trim(), email, password);
      saveAuth(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Registrasi gagal, coba lagi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 6)
      return { label: "Terlalu pendek", color: "bg-red-400", width: "w-1/4" };
    if (password.length < 8)
      return { label: "Lemah", color: "bg-orange-400", width: "w-2/4" };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password))
      return { label: "Kuat", color: "bg-emerald-400", width: "w-full" };
    return { label: "Sedang", color: "bg-brand-highlight", width: "w-3/4" };
  })();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-secondary/20" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-secondary/15" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-brand-highlight/30 blur-2xl" />
        <div className="absolute top-1/4 left-1/4 w-56 h-56 rounded-full bg-brand-secondary/25 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full bg-brand-highlight/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 px-8">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-brand-stroke tracking-tight">
            BukuKasKu
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Mulai kelola keuangan kamu hari ini
          </p>
        </div>

        {/* Heading */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-brand-stroke">
            Buat akun baru
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Lengkapi data diri kamu di bawah
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
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Nama Lengkap
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
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-stroke/40 pointer-events-none" />
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Nama kamu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-transparent text-brand-stroke placeholder-slate-400 text-sm font-medium outline-none"
              />
            </div>
          </div>

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
                autoComplete="new-password"
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
            {passwordStrength && (
              <div className="mt-2">
                <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`}
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Konfirmasi Password
            </label>
            <div
              className="relative rounded-xl border focus-within:ring-2 transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                backdropFilter: "blur(45px) saturate(180%)",
                WebkitBackdropFilter: "blur(45px) saturate(180%)",
                borderColor:
                  confirmPass && confirmPass !== password
                    ? "rgba(239,68,68,0.40)"
                    : confirmPass && confirmPass === password
                      ? "rgba(52,211,153,0.40)"
                      : "rgba(255,255,255,0.40)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-stroke/40 pointer-events-none" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-transparent text-brand-stroke placeholder-slate-400 text-sm font-medium outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-stroke/40 hover:text-brand-stroke/70 transition-colors"
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {confirmPass && confirmPass !== password && (
              <p className="text-[10px] font-bold text-red-500 mt-1">
                Password tidak cocok
              </p>
            )}
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
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? "Memproses..." : "Buat Akun"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 font-medium mt-6">
          Sudah punya akun?{" "}
          <Link
            to="/auth/login"
            className="text-brand-bg hover:text-brand-bg/80 font-bold transition-colors"
          >
            Masuk di sini
          </Link>
        </p>

        <p className="text-center text-xs text-slate-400 font-semibold mt-6">
          &copy; {new Date().getFullYear()} Finance Tracker
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
