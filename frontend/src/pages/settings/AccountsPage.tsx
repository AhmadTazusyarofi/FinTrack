import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, Check, X,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { Account } from "../../types";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../../services/accountService";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function parseRupiahInput(raw: string): number {
  return parseInt(raw.replace(/\D/g, ""), 10) || 0;
}

function formatRupiahInput(value: number): string {
  if (!value) return "";
  return new Intl.NumberFormat("id-ID").format(value);
}

export function AccountsPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState(0);
  const [editBalanceDisplay, setEditBalanceDisplay] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBalance, setAddBalance] = useState(0);
  const [addBalanceDisplay, setAddBalanceDisplay] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    getAccounts()
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, []);

  function startEdit(acc: Account) {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditBalance(acc.balance);
    setEditBalanceDisplay(formatRupiahInput(acc.balance));
    setEditError(null);
    setDeletingId(null);
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);
    if (!editName.trim()) { setEditError("Nama akun wajib diisi"); return; }
    setEditLoading(true);
    try {
      await updateAccount(id, editName.trim(), editBalance);
      setAccounts((prev) =>
        prev.map((a) => a.id === id ? { ...a, name: editName.trim(), balance: editBalance } : a)
      );
      setEditingId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal memperbarui";
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setDeletingId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal menghapus";
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleAdd() {
    setAddError(null);
    if (!addName.trim()) { setAddError("Nama akun wajib diisi"); return; }
    setAddLoading(true);
    try {
      const created = await createAccount(addName.trim(), addBalance);
      setAccounts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      setAddName("");
      setAddBalance(0);
      setAddBalanceDisplay("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal menambahkan";
      setAddError(msg);
    } finally {
      setAddLoading(false);
    }
  }

  const cardStyle = isDark
    ? { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.20)" }
    : { background: "rgba(255,255,255,0.80)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderColor: "rgba(255,255,255,0.90)", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" };

  const divider = `border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`;
  const inputClass = `w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all border ${isDark ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[#abd1c6]/40" : "bg-slate-50 border-slate-200 text-[#001e1d] placeholder-slate-400 focus:border-[#004643]/30 focus:bg-white"}`;

  return (
    <div className={`min-h-screen pb-32 ${isDark ? "bg-[#0f1117]" : "bg-[#f1f5f9]"}`}>
      {/* Header */}
      <div
        className={`sticky top-0 z-30 px-4 pb-3.5 flex items-center justify-between border-b ${isDark ? "border-white/5" : "border-slate-100"}`}
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 14px)",
          background: isDark ? "rgba(15,17,23,0.90)" : "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-slate-100 hover:bg-slate-200"}`}
          >
            <ArrowLeft className="w-4 h-4 dark:text-white" />
          </button>
          <h1 className={`text-lg font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#001e1d]"}`}>
            Kelola Akun
          </h1>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddName(""); setAddBalance(0); setAddBalanceDisplay(""); setAddError(null); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004643] text-white text-sm font-bold hover:bg-[#004643]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-1.5 px-1 mb-2">
          <span className={`text-xs font-extrabold uppercase tracking-widest ${isDark ? "text-white" : "text-[#001e1d]"}`}>Akun & Bank</span>
          <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? "bg-white/10 text-white/40" : "bg-slate-100 text-slate-400"}`}>{accounts.length}</span>
        </div>

        {loading ? (
          <div className={`text-center py-12 text-sm font-semibold ${isDark ? "text-white/40" : "text-slate-400"}`}>Memuat...</div>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={cardStyle}>
            {accounts.length === 0 ? (
              <div className={`px-4 py-8 text-center text-xs font-semibold ${isDark ? "text-white/30" : "text-slate-400"}`}>
                Belum ada akun
              </div>
            ) : (
              accounts.map((acc, i) => (
                <div key={acc.id}>
                  {i > 0 && <div className={divider} />}
                  <div className="px-4 py-3">
                    {editingId === acc.id ? (
                      <div className="space-y-2">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Nama akun"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={inputClass}
                        />
                        <div className="relative">
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isDark ? "text-white/40" : "text-slate-400"}`}>Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={editBalanceDisplay}
                            onChange={(e) => {
                              const raw = parseRupiahInput(e.target.value);
                              setEditBalance(raw);
                              setEditBalanceDisplay(formatRupiahInput(raw));
                            }}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                        {editError && <p className="text-xs font-semibold text-red-500">{editError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingId(null); setEditError(null); }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                          >
                            <X className="w-3 h-3" /> Batal
                          </button>
                          <button
                            onClick={() => handleSaveEdit(acc.id)}
                            disabled={editLoading}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#004643] text-white hover:bg-[#004643]/90 disabled:opacity-60 flex items-center justify-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" /> {editLoading ? "..." : "Simpan"}
                          </button>
                        </div>
                      </div>
                    ) : deletingId === acc.id ? (
                      <div className="space-y-2">
                        <p className={`text-xs font-semibold ${isDark ? "text-white/70" : "text-slate-600"}`}>
                          Hapus <span className="font-extrabold">"{acc.name}"</span>?
                        </p>
                        {deleteError && <p className="text-xs font-semibold text-red-500">{deleteError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setDeletingId(null); setDeleteError(null); }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                          >
                            <X className="w-3 h-3" /> Batal
                          </button>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            disabled={deleteLoading}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> {deleteLoading ? "..." : "Hapus"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="min-w-0">
                            <p className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-[#001e1d]"}`}>{acc.name}</p>
                            <p className={`text-xs font-semibold mt-0.5 ${isDark ? "text-white/40" : "text-slate-400"}`}>{formatRupiah(acc.balance)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(acc)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setDeletingId(acc.id); setDeleteError(null); setEditingId(null); }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? "hover:bg-red-500/15 text-white/40 hover:text-red-400" : "hover:bg-red-50 text-slate-400 hover:text-red-500"}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => setShowAdd(false)}
          />
          <div
            className={`relative w-full max-w-md rounded-3xl shadow-2xl flex flex-col ${isDark ? "bg-[#1a1f2e]" : "bg-white"}`}
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? "border-white/5" : "border-slate-100"}`}>
              <div>
                <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-[#001e1d]"}`}>
                  Tambah Akun
                </h3>
                <p className={`text-xs font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Tambahkan rekening atau dompet baru
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className={`p-2 rounded-xl transition-all ${isDark ? "hover:bg-white/10 text-slate-500 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {addError && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
                  {addError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Nama Akun
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BCA, Gopay, Dompet..."
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-bg/20 transition-all ${
                    isDark
                      ? "bg-white/5 border-white/10 text-white placeholder-slate-600"
                      : "bg-slate-50 border-slate-200 text-[#001e1d] placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>

              {/* Balance */}
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Saldo Awal
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={addBalanceDisplay}
                    onChange={(e) => {
                      const raw = parseRupiahInput(e.target.value);
                      setAddBalance(raw);
                      setAddBalanceDisplay(formatRupiahInput(raw));
                    }}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-bg/20 transition-all ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white placeholder-slate-600"
                        : "bg-slate-50 border-slate-200 text-[#001e1d] placeholder-slate-400 focus:bg-white"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t shrink-0 flex gap-3 ${isDark ? "border-white/5" : "border-slate-100"}`}>
              <button
                onClick={() => setShowAdd(false)}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                  isDark
                    ? "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                    : "border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold bg-[#004643] shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              >
                {addLoading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsPage;
