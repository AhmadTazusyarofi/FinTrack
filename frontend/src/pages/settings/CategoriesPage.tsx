import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { Category } from "../../types";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../services/categoryService";

export function CategoriesPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveEdit(id: string) {
    setEditError(null);
    if (!editName.trim()) {
      setEditError("Nama wajib diisi");
      return;
    }
    setEditLoading(true);
    try {
      await updateCategory(id, editName.trim());
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c)),
      );
      setEditingId(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal memperbarui";
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setDeletingId(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menghapus";
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleAdd() {
    setAddError(null);
    if (!addName.trim()) {
      setAddError("Nama kategori wajib diisi");
      return;
    }
    setAddLoading(true);
    try {
      const created = await createCategory(addName.trim(), addType);
      setCategories((prev) =>
        [...prev, created].sort(
          (a, b) =>
            a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
        ),
      );
      setShowAdd(false);
      setAddName("");
      setAddType("INCOME");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menambahkan";
      setAddError(msg);
    } finally {
      setAddLoading(false);
    }
  }

  const cardStyle = isDark
    ? {
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.20)",
      }
    : {
        background: "rgba(255,255,255,0.80)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderColor: "rgba(255,255,255,0.90)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
      };

  const divider = `border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`;
  const inputClass = `w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all border ${isDark ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[#abd1c6]/40" : "bg-slate-50 border-slate-200 text-[#001e1d] placeholder-slate-400 focus:border-[#004643]/30 focus:bg-white"}`;

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  function renderSection(title: string, items: Category[]) {
    return (
      <div>
        <div className="flex items-center gap-1.5 px-1 mb-2">
          <span
            className={`text-xs font-extrabold uppercase tracking-widest ${isDark ? "text-white" : "text-[#001e1d]"}`}
          >
            {title}
          </span>
          <span
            className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? "bg-white/10 text-white/40" : "bg-slate-100 text-slate-400"}`}
          >
            {items.length}
          </span>
        </div>
        <div className="rounded-2xl border overflow-hidden" style={cardStyle}>
          {items.length === 0 ? (
            <div
              className={`px-4 py-5 text-center text-xs font-semibold ${isDark ? "text-white/30" : "text-slate-400"}`}
            >
              Belum ada kategori
            </div>
          ) : (
            items.map((cat, i) => (
              <div key={cat.id}>
                {i > 0 && <div className={divider} />}
                <div className="px-4 py-3">
                  {editingId === cat.id ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveEdit(cat.id)
                        }
                        className={inputClass}
                        placeholder="Nama kategori"
                      />
                      {editError && (
                        <p className="text-xs font-semibold text-red-500">
                          {editError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditError(null);
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          <X className="w-3 h-3" /> Batal
                        </button>
                        <button
                          onClick={() => handleSaveEdit(cat.id)}
                          disabled={editLoading}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#004643] text-white hover:bg-[#004643]/90 disabled:opacity-60 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Check className="w-3 h-3" />{" "}
                          {editLoading ? "..." : "Simpan"}
                        </button>
                      </div>
                    </div>
                  ) : deletingId === cat.id ? (
                    <div className="space-y-2">
                      <p
                        className={`text-xs font-semibold ${isDark ? "text-white/70" : "text-slate-600"}`}
                      >
                        Hapus{" "}
                        <span className="font-extrabold">"{cat.name}"</span>?
                      </p>
                      {deleteError && (
                        <p className="text-xs font-semibold text-red-500">
                          {deleteError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setDeletingId(null);
                            setDeleteError(null);
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          <X className="w-3 h-3" /> Batal
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={deleteLoading}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />{" "}
                          {deleteLoading ? "..." : "Hapus"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-[#001e1d]"}`}
                        >
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditName(cat.name);
                            setEditError(null);
                            setDeletingId(null);
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(cat.id);
                            setDeleteError(null);
                            setEditingId(null);
                          }}
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
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pb-32 ${isDark ? "bg-[#0f1117]" : "bg-[#f1f5f9]"}`}
    >
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
          <h1
            className={`text-lg font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#001e1d]"}`}
          >
            Kelola Kategori
          </h1>
        </div>
        <button
          onClick={() => {
            setShowAdd(true);
            setAddName("");
            setAddType("INCOME");
            setAddError(null);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004643] text-white text-sm font-bold hover:bg-[#004643]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 space-y-5">
        {loading ? (
          <div
            className={`text-center py-12 text-sm font-semibold ${isDark ? "text-white/40" : "text-slate-400"}`}
          >
            Memuat...
          </div>
        ) : (
          <>
            {renderSection("Pemasukan", income)}
            {renderSection("Pengeluaran", expense)}
          </>
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
                  Tambah Kategori
                </h3>
                <p className={`text-xs font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Tambahkan kategori pemasukan atau pengeluaran
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

              {/* Type Toggle */}
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Jenis Kategori
                </label>
                <div className={`grid grid-cols-2 gap-2 rounded-xl p-1 ${isDark ? "bg-white/10" : "bg-slate-100"}`}>
                  {(["INCOME", "EXPENSE"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setAddType(t)}
                      className={`py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                        addType === t
                          ? t === "INCOME"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-brand-tertiary text-white shadow-sm"
                          : isDark
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {t === "INCOME" ? "↓ Pemasukan" : "↑ Pengeluaran"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Nama Kategori
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Makan, Transportasi..."
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-bg/20 transition-all ${
                    isDark
                      ? "bg-white/5 border-white/10 text-white placeholder-slate-600"
                      : "bg-slate-50 border-slate-200 text-[#001e1d] placeholder-slate-400 focus:bg-white"
                  }`}
                />
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
                className={`flex-1 py-3 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 ${
                  addType === "INCOME" ? "bg-emerald-500" : "bg-brand-bg"
                }`}
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

export default CategoriesPage;
