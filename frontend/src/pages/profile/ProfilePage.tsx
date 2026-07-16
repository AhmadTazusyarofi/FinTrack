import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
  Check,
  X,
  Shield,
  Camera,
  Bell,
  Sun,
  Moon,
  Info,
  Trash2,
  AlertTriangle,
  Tag,
  Wallet,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  getStoredUser,
  clearAuth,
  saveAuth,
} from "../../services/auth.service";
import {
  updateProfileName,
  updatePassword,
  uploadAvatarFile,
  updateEmail,
  deleteAccount,
} from "../../services/profileService";

export function ProfilePage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const user = getStoredUser();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w: string) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  // ── Avatar ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.foto_profil ?? null,
  );
  const [avatarLoading, setAvatarLoading] = useState(false);

  // ── Nama ──
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  // ── Email ──
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email ?? "");
  const [emailPassInput, setEmailPassInput] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // ── Password ──
  const [editingPass, setEditingPass] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  // ── Notifikasi ──
  const [notifEnabled, setNotifEnabled] = useState(
    () => localStorage.getItem("notif_enabled") === "true",
  );

  // ── Hapus Akun ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassInput, setDeletePassInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Handlers ──

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      setAvatarPreview(URL.createObjectURL(file));
      const result = await uploadAvatarFile(file);
      const token = localStorage.getItem("token") ?? "";
      saveAuth(token, { ...getStoredUser()!, foto_profil: result.foto_profil });
      setAvatarPreview(result.foto_profil);
    } catch {
      setAvatarPreview(user?.foto_profil ?? null);
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  }

  async function handleSaveName() {
    setNameError(null);
    if (nameInput.trim().length < 2) {
      setNameError("Nama minimal 2 karakter");
      return;
    }
    setNameLoading(true);
    try {
      const result = await updateProfileName(nameInput.trim());
      const token = localStorage.getItem("token") ?? "";
      saveAuth(token, { ...getStoredUser()!, name: result.name });
      setNameSuccess(true);
      setTimeout(() => {
        setNameSuccess(false);
        setEditingName(false);
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal memperbarui nama";
      setNameError(msg);
    } finally {
      setNameLoading(false);
    }
  }

  async function handleUpdateEmail() {
    setEmailError(null);
    if (
      !emailInput.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())
    ) {
      setEmailError("Format email tidak valid");
      return;
    }
    if (!emailPassInput) {
      setEmailError("Masukkan password untuk konfirmasi");
      return;
    }
    setEmailLoading(true);
    try {
      const result = await updateEmail(emailInput.trim(), emailPassInput);
      const token = localStorage.getItem("token") ?? "";
      saveAuth(token, { ...getStoredUser()!, email: result.email });
      setEmailSuccess(true);
      setEmailPassInput("");
      setTimeout(() => {
        setEmailSuccess(false);
        setEditingEmail(false);
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal memperbarui email";
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword() {
    setPassError(null);
    if (newPass !== confirmPass) {
      setPassError("Password baru tidak cocok");
      return;
    }
    if (newPass.length < 6) {
      setPassError("Password baru minimal 6 karakter");
      return;
    }
    setPassLoading(true);
    try {
      await updatePassword(currentPass, newPass);
      setPassSuccess(true);
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setTimeout(() => {
        setPassSuccess(false);
        setEditingPass(false);
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal mengubah password";
      setPassError(msg);
    } finally {
      setPassLoading(false);
    }
  }

  async function handleToggleNotif() {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem("notif_enabled", next ? "true" : "false");
    if (next && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassInput);
      clearAuth();
      navigate("/auth/login", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menghapus akun";
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleLogout() {
    clearAuth();
    navigate("/auth/login", { replace: true });
  }

  // ── Styles ──

  const cardStyle = isDark
    ? {
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.20)",
      }
    : {
        background: "rgba(255,255,255,0.70)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderColor: "rgba(255,255,255,0.80)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
      };

  const inputClass = `w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border ${
    isDark
      ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[#abd1c6]/40"
      : "bg-slate-50 border-slate-200 text-[#001e1d] placeholder-slate-400 focus:border-[#004643]/30 focus:bg-white"
  }`;

  const divider = `border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`;
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";
  const labelClass = `text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`;
  const valueClass = `text-sm font-semibold mt-0.5 ${isDark ? "text-white" : "text-[#001e1d]"}`;
  const chevronClass = `flex items-center gap-1.5 ${isDark ? "text-white/30" : "text-slate-400"}`;
  const iconBg =
    "w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center";
  const cancelBtn = `flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;
  const saveBtn =
    "flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#004643] text-white hover:bg-[#004643]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5";

  return (
    <div
      className={`min-h-screen pb-32 ${isDark ? "bg-[#0f1117]" : "bg-[#f1f5f9]"}`}
    >
      {/* ── Hero banner ── */}
      <div
        className="relative bg-gradient-to-br from-[#006b65] via-[#004643] to-[#002523] px-5 pb-20 overflow-hidden"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -right-3 -top-3 w-24 h-24 rounded-full bg-white/[0.06] pointer-events-none" />
        <div className="absolute left-8 -bottom-12 w-36 h-36 rounded-full bg-white/[0.03] pointer-events-none" />

        <button
          onClick={() => navigate(-1)}
          className="relative z-10 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        <div className="relative z-10 flex flex-col items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="group relative w-24 h-24 rounded-full shadow-2xl ring-4 ring-white/20 overflow-hidden focus:outline-none"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#f9bc60] flex items-center justify-center">
                  <span className="text-3xl font-extrabold text-[#002523]">
                    {initials}
                  </span>
                </div>
              )}
              <div
                className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${avatarLoading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                {avatarLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#f9bc60] border-2 border-[#004643] flex items-center justify-center pointer-events-none shadow-md">
              <Camera className="w-3.5 h-3.5 text-[#002523]" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              {user?.name ?? "—"}
            </h2>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 -mt-7 space-y-5 relative z-10">
        {/* Informasi Akun */}
        <div className="rounded-3xl border overflow-hidden" style={cardStyle}>
          {/* Nama */}
          <button
            onClick={() => {
              setEditingName(!editingName);
              setNameError(null);
            }}
            className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div className={iconBg}>
                <User className="w-4 h-4 dark:text-white" />
              </div>
              <div className="text-left">
                <p className={labelClass}>Nama Lengkap</p>
                <p className={valueClass}>{user?.name ?? "—"}</p>
              </div>
            </div>
            <div className={chevronClass}>
              <span className="text-xs font-semibold">Edit</span>
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-200 ${editingName ? "rotate-90" : ""}`}
              />
            </div>
          </button>

          {editingName && (
            <div className={`px-4 pb-4 ${divider}`}>
              <div className="pt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={inputClass}
                />
                {nameError && (
                  <p className="text-xs font-semibold text-red-500">
                    {nameError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNameInput(user?.name ?? "");
                      setNameError(null);
                    }}
                    className={cancelBtn}
                  >
                    <X className="w-3.5 h-3.5" /> Batal
                  </button>
                  <button
                    onClick={handleSaveName}
                    disabled={nameLoading || nameSuccess}
                    className={saveBtn}
                  >
                    {nameSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Tersimpan
                      </>
                    ) : nameLoading ? (
                      "Menyimpan..."
                    ) : (
                      "Simpan"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={divider} />

          {/* Email */}
          <button
            onClick={() => {
              setEditingEmail(!editingEmail);
              setEmailError(null);
            }}
            className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div className={iconBg}>
                <Mail className="w-4 h-4 dark:text-white" />
              </div>
              <div className="text-left">
                <p className={labelClass}>Email</p>
                <p className={valueClass}>{user?.email ?? "—"}</p>
              </div>
            </div>
            <div className={chevronClass}>
              <span className="text-xs font-semibold">Edit</span>
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-200 ${editingEmail ? "rotate-90" : ""}`}
              />
            </div>
          </button>

          {editingEmail && (
            <div className={`px-4 pb-4 ${divider}`}>
              <div className="pt-4 space-y-3">
                <div className="relative">
                  <Mail
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-white/25" : "text-slate-400"}`}
                  />
                  <input
                    type="email"
                    placeholder="Email baru"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <div className="relative">
                  <Lock
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-white/25" : "text-slate-400"}`}
                  />
                  <input
                    type="password"
                    placeholder="Konfirmasi dengan password"
                    value={emailPassInput}
                    onChange={(e) => setEmailPassInput(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {emailError && (
                  <p className="text-xs font-semibold text-red-500">
                    {emailError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingEmail(false);
                      setEmailInput(user?.email ?? "");
                      setEmailPassInput("");
                      setEmailError(null);
                    }}
                    className={cancelBtn}
                  >
                    <X className="w-3.5 h-3.5" /> Batal
                  </button>
                  <button
                    onClick={handleUpdateEmail}
                    disabled={emailLoading || emailSuccess}
                    className={saveBtn}
                  >
                    {emailSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Tersimpan
                      </>
                    ) : emailLoading ? (
                      "Menyimpan..."
                    ) : (
                      "Simpan"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Keamanan */}
        <div className="rounded-3xl border overflow-hidden" style={cardStyle}>
          <button
            onClick={() => {
              setEditingPass(!editingPass);
              setPassError(null);
            }}
            className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div className={iconBg}>
                <Shield className="w-4 h-4 dark:text-white" />
              </div>
              <div className="text-left">
                <p className={labelClass}>Password</p>
                <p className={valueClass}>Ganti Password</p>
              </div>
            </div>
            <div className={chevronClass}>
              <span className="text-xs font-semibold">Ubah</span>
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-200 ${editingPass ? "rotate-90" : ""}`}
              />
            </div>
          </button>

          {editingPass && (
            <div className={`px-4 pb-4 ${divider}`}>
              <div className="pt-4 space-y-3">
                <div className="relative">
                  <Lock
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-white/25" : "text-slate-400"}`}
                  />
                  <input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Password lama"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className={`${inputClass} pl-10 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDark ? "text-white/30 hover:text-white/60" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {showCurrent ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-white/25" : "text-slate-400"}`}
                  />
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Password baru (min. 6 karakter)"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className={`${inputClass} pl-10 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDark ? "text-white/30 hover:text-white/60" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {showNew ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-white/25" : "text-slate-400"}`}
                  />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Konfirmasi password baru"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className={`${inputClass} pl-10 pr-11`}
                    style={
                      confirmPass && confirmPass !== newPass
                        ? { borderColor: "rgba(239,68,68,0.5)" }
                        : confirmPass && confirmPass === newPass
                          ? { borderColor: "rgba(52,211,153,0.5)" }
                          : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDark ? "text-white/30 hover:text-white/60" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passError && (
                  <p className="text-xs font-semibold text-red-500">
                    {passError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingPass(false);
                      setCurrentPass("");
                      setNewPass("");
                      setConfirmPass("");
                      setPassError(null);
                    }}
                    className={cancelBtn}
                  >
                    <X className="w-3.5 h-3.5" /> Batal
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={passLoading || passSuccess}
                    className={saveBtn}
                  >
                    {passSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Berhasil
                      </>
                    ) : passLoading ? (
                      "Menyimpan..."
                    ) : (
                      "Simpan"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pengaturan Data */}
        <div className="rounded-3xl border overflow-hidden" style={cardStyle}>
          <button
            onClick={() => navigate("/settings/categories")}
            className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div className={iconBg}><Tag className="w-4 h-4 dark:text-white" /></div>
              <div className="text-left">
                <p className={labelClass}>Pengaturan</p>
                <p className={valueClass}>Kelola Kategori</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 ${isDark ? "text-white/30" : "text-slate-400"}`} />
          </button>

          <div className={divider} />

          <button
            onClick={() => navigate("/settings/accounts")}
            className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div className={iconBg}><Wallet className="w-4 h-4 dark:text-white" /></div>
              <div className="text-left">
                <p className={labelClass}>Pengaturan</p>
                <p className={valueClass}>Kelola Akun & Bank</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 ${isDark ? "text-white/30" : "text-slate-400"}`} />
          </button>
        </div>

        {/* Tampilan & Notifikasi */}
        <div className="rounded-3xl border overflow-hidden" style={cardStyle}>
          {/* Toggle Tema */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className={iconBg}>
                {isDark ? (
                  <Moon className="w-4 h-4 dark:text-white" />
                ) : (
                  <Sun className="w-4 h-4 dark:text-white" />
                )}
              </div>
              <div>
                <p className={labelClass}>Tampilan</p>
                <p className={valueClass}>
                  {isDark ? "Mode Gelap" : "Mode Terang"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isDark ? "bg-[#004643]" : "bg-slate-200"}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform duration-300 ${isDark ? "translate-x-6 bg-[#f9bc60]" : "translate-x-0.5 bg-white"}`}
              />
            </button>
          </div>

          <div className={divider} />

          {/* Toggle Notifikasi */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className={iconBg}>
                <Bell
                  className={`w-4 h-4 dark:text-white`}
                />
              </div>
              <div>
                <p className={labelClass}>Notifikasi</p>
                <p className={valueClass}>
                  {notifEnabled ? "Aktif" : "Nonaktif"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleNotif}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${notifEnabled ? "bg-[#004643]" : isDark ? "bg-white/10" : "bg-slate-200"}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform duration-300 ${notifEnabled ? "translate-x-6 bg-[#f9bc60]" : "translate-x-0.5 bg-white"}`}
              />
            </button>
          </div>
        </div>

        {/* Tentang Aplikasi */}
        <div className="rounded-3xl border overflow-hidden" style={cardStyle}>
          <div className="flex items-center gap-3 px-4 py-4">
            <div className={iconBg}>
              <Info className="w-4 h-4 dark:text-white" />
            </div>
            <div className="flex-1">
              <p className={labelClass}>Tentang Aplikasi</p>
              <p className={valueClass}>Finance Tracker</p>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${isDark ? "bg-white/10 text-white/50" : "bg-slate-100 text-slate-400"}`}
            >
              v1.0.0
            </span>
          </div>
          <div className={divider} />
          <div className="px-4 py-3 space-y-1">
            {(
              [
                { label: "Versi", value: "1.0.0" },
                { label: "Platform", value: "Progressive Web App" },
                { label: "Build", value: "Stable" },
              ] as const
            ).map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-1"
              >
                <span
                  className={`text-xs font-semibold ${isDark ? "text-white/40" : "text-slate-400"}`}
                >
                  {label}
                </span>
                <span
                  className={`text-xs font-bold ${isDark ? "text-white/70" : "text-slate-600"}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sesi & Bahaya */}
        <div className="rounded-3xl border overflow-hidden" style={cardStyle}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-4 transition-colors ${isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"}`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#e16162]/15 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-[#e16162]" />
            </div>
            <span className="text-sm font-bold text-[#e16162]">
              Keluar dari Akun
            </span>
          </button>

          <div className={divider} />

          <button
            onClick={() => {
              setShowDeleteModal(true);
              setDeletePassInput("");
              setDeleteError(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-4 transition-colors ${isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"}`}
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-red-500">Hapus Akun</p>
              <p
                className={`text-[10px] font-semibold mt-0.5 ${isDark ? "text-white/30" : "text-slate-400"}`}
              >
                Semua data akan dihapus permanen
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div
            className="relative w-full max-w-sm mx-4 rounded-3xl border p-6 mb-8 sm:mb-0"
            style={
              isDark
                ? {
                    background: "rgba(20,24,34,0.98)",
                    backdropFilter: "blur(20px)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }
                : {
                    background: "rgba(255,255,255,0.98)",
                    backdropFilter: "blur(20px)",
                    borderColor: "rgba(226,232,240,0.8)",
                  }
            }
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h3
              className={`text-center text-lg font-extrabold mb-1 ${isDark ? "text-white" : "text-[#001e1d]"}`}
            >
              Hapus Akun?
            </h3>
            <p
              className={`text-center text-xs font-semibold mb-5 ${isDark ? "text-white/40" : "text-slate-400"}`}
            >
              Semua transaksi, anggaran, dan data kamu akan terhapus permanen
              dan tidak dapat dipulihkan.
            </p>

            <div className="relative mb-3">
              <Lock
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-white/25" : "text-slate-400"}`}
              />
              <input
                type="password"
                placeholder="Masukkan password untuk konfirmasi"
                value={deletePassInput}
                onChange={(e) => setDeletePassInput(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>

            {deleteError && (
              <p className="text-xs font-semibold text-red-500 mb-3">
                {deleteError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={cancelBtn}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePassInput}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  "Menghapus..."
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Akun
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
