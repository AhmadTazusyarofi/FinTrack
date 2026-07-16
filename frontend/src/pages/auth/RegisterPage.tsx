import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus, Lock, Mail, User, Camera, Sun, Moon } from "lucide-react";
import { registerRequest, saveAuth } from "../../services/auth.service";
import { uploadAvatarFile } from "../../services/profileService";
import { useTheme } from "../../contexts/ThemeContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

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

      if (photoFile) {
        saveAuth(data.token, data.user);
        try {
          const { foto_profil } = await uploadAvatarFile(photoFile);
          saveAuth(data.token, { ...data.user, foto_profil });
        } catch {
          // Upload gagal — user tetap terdaftar, hanya tanpa foto
        }
      } else {
        saveAuth(data.token, data.user);
      }

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
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-secondary/20" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-secondary/15" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-brand-highlight/30 blur-2xl" />
        <div className="absolute top-1/4 left-1/4 w-56 h-56 rounded-full bg-brand-secondary/25 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full bg-brand-highlight/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 px-8 py-10">
        {/* Heading */}
        <div className="mb-5">
          <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-brand-stroke"}`}>
            Buat akun baru
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Lengkapi data diri kamu di bawah
          </p>
        </div>

        {/* Avatar selector */}
        <div className="flex flex-col items-center mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 group focus:outline-none"
          >
            <div className={`w-20 h-20 rounded-full overflow-hidden border-2 shadow-md flex items-center justify-center ${isDark ? "border-white/15 bg-white/10" : "border-white/60 bg-brand-secondary/20"}`}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className={`w-8 h-8 ${isDark ? "text-white/20" : "text-brand-stroke/25"}`} />
              )}
            </div>
            <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full bg-brand-bg flex items-center justify-center shadow border-2 group-hover:scale-110 transition-transform ${isDark ? "border-[#0f1117]" : "border-white"}`}>
              <Camera className="w-3 h-3 text-brand-headline" />
            </div>
          </button>
          <p className={`text-[11px] font-medium mt-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {photoPreview ? "Ketuk untuk ganti foto" : "Foto profil (opsional)"}
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
          {/* Name */}
          <div>
            <label className={labelCls}>Nama Lengkap</label>
            <div
              className="relative rounded-xl border focus-within:ring-2 focus-within:ring-brand-bg/20 focus-within:border-brand-bg/30 transition-all duration-200"
              style={inputWrapStyle}
            >
              <User className={iconCls} />
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Nama kamu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputCls} pl-10 pr-4 py-3 text-sm`}
              />
            </div>
          </div>

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
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pl-10 pr-11 py-3 text-sm`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className={eyeCls}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordStrength && (
              <div className="mt-2">
                <div className={`h-1 w-full rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-200"}`}>
                  <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`} />
                </div>
                <p className={`text-[10px] font-bold mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className={labelCls}>Konfirmasi Password</label>
            <div
              className="relative rounded-xl border focus-within:ring-2 transition-all duration-200"
              style={{
                ...inputWrapStyle,
                borderColor:
                  confirmPass && confirmPass !== password
                    ? "rgba(239,68,68,0.50)"
                    : confirmPass && confirmPass === password
                      ? "rgba(52,211,153,0.50)"
                      : inputWrapStyle.borderColor,
              }}
            >
              <Lock className={iconCls} />
              <input
                type={showConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className={`${inputCls} pl-10 pr-11 py-3 text-sm`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className={eyeCls}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

        <p className={`text-center text-sm font-medium mt-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Sudah punya akun?{" "}
          <Link to="/auth/login" className="text-brand-bg hover:text-brand-bg/80 font-bold transition-colors">
            Masuk di sini
          </Link>
        </p>

        <p className={`text-center text-xs font-semibold mt-6 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
          &copy; {new Date().getFullYear()} BukuKasKu
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
