import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wallet,
  Tag,
  FileText,
  Calendar,
} from "lucide-react";
import { Transaction, Category, Account } from "../../types";
import { Skeleton } from "../../components/Skeleton";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  TxPayload,
} from "../../services/transactionService";
import { getCategories } from "../../services/categoryService";
import { getAccounts } from "../../services/accountService";
import { MonthYearPicker } from "../../components/MonthYearPicker";

interface FormState {
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: string;
  categoryId: string;
  accountId: string;
  date: string;
}

const emptyForm: FormState = {
  type: "EXPENSE",
  description: "",
  amount: "",
  categoryId: "",
  accountId: "",
  date: new Date().toISOString().slice(0, 10),
};

const ITEMS_PER_PAGE = 5;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export function TransactionsPage() {
  const [filter, setFilter] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [allTotal, setAllTotal] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [filterYear, setFilterYear] = useState<number | "">("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshStats = useCallback(() => {
    getTransactions({ limit: 9999 })
      .then(({ data, meta }) => {
        setAllTotal(meta.total);
        setTotalIncome(
          data
            .filter((t) => t.type === "INCOME")
            .reduce((s, t) => s + t.amount, 0),
        );
        setTotalExpense(
          data
            .filter((t) => t.type === "EXPENSE")
            .reduce((s, t) => s + t.amount, 0),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshStats();
    getCategories()
      .then(setCategories)
      .catch(() => {});
    getAccounts()
      .then(setAccounts)
      .catch(() => {});
  }, [refreshStats]);

  // Refetch categories & accounts every time the modal opens so data
  // always reflects what the user last saved in the profile pages.
  useEffect(() => {
    if (!isOpen) return;
    getCategories()
      .then(setCategories)
      .catch(() => {});
    getAccounts()
      .then(setAccounts)
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchTransactions = useCallback(() => {
    setLoading(true);
    setError(null);
    getTransactions({
      type: filter !== "all" ? filter : undefined,
      month: filterMonth || undefined,
      year: filterYear || undefined,
      search: debouncedSearch || undefined,
      page,
      limit: ITEMS_PER_PAGE,
    })
      .then(({ data, meta }) => {
        setTransactions(data);
        setTotalPages(meta.totalPages);
        setTotalCount(meta.total);
      })
      .catch((e: { response?: { data?: { message?: string } } }) => {
        setError(e?.response?.data?.message ?? "Gagal memuat transaksi");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filter, filterMonth, filterYear, debouncedSearch, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const openAdd = () => {
    setEditingTx(null);
    setForm(emptyForm);
    setIsOpen(true);
  };
  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setForm({
      type: tx.type,
      description: tx.description,
      amount: String(tx.amount),
      categoryId: tx.categoryId,
      accountId: tx.accountId,
      date: tx.date,
    });
    setActiveMenu(null);
    setIsOpen(true);
  };
  const closeModal = () => {
    setIsOpen(false);
    setEditingTx(null);
    setError(null);
  };
  const handleFilterChange = (f: typeof filter) => {
    setFilter(f);
    setPage(1);
  };

  const handleSubmit = async () => {
    if (
      !form.description.trim() ||
      !form.amount ||
      !form.categoryId ||
      !form.accountId ||
      !form.date
    ) {
      setError("Semua kolom wajib diisi");
      return;
    }
    const payload: TxPayload = {
      type: form.type,
      amount: Number(form.amount),
      description: form.description.trim(),
      date: form.date,
      categoryId: form.categoryId,
      accountId: form.accountId,
    };
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingTx) {
        await updateTransaction(editingTx.id, payload);
      } else {
        await createTransaction(payload);
      }
      closeModal();
      fetchTransactions();
      refreshStats();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Gagal menyimpan transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActiveMenu(null);
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await deleteTransaction(id);
      fetchTransactions();
      refreshStats();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Gagal menghapus transaksi");
    }
  };

  const filteredCategories = categories.filter((c) => c.type === form.type);

  return (
    <div className="space-y-6 pb-8">
      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            label: "Total Transaksi",
            value: `${allTotal} transaksi`,
            up: undefined as boolean | undefined,
          },
          {
            label: "Total Pemasukan",
            value: formatCurrency(totalIncome),
            up: true,
          },
          {
            label: "Total Pengeluaran",
            value: formatCurrency(totalExpense),
            up: false,
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#1a1f2e] rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm border border-brand-stroke/5 dark:border-white/5"
          >
            <div>
              <p className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest">
                {s.label}
              </p>
              <p
                className={`text-lg font-bold mt-0.5 tracking-tight ${
                  s.up === true
                    ? "text-emerald-600"
                    : s.up === false
                      ? "text-brand-tertiary"
                      : "dark:text-white"
                }`}
              >
                {s.value}
              </p>
            </div>
            {s.up === true && (
              <TrendingUp className="w-5 h-5 text-emerald-500 opacity-60" />
            )}
            {s.up === false && (
              <TrendingDown className="w-5 h-5 text-brand-tertiary opacity-60" />
            )}
          </div>
        ))}
      </div>

      {/* Filter + Search + Add */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-[#1a1f2e] rounded-xl p-1 shadow-sm border border-brand-stroke/5 dark:border-white/5 shrink-0">
            {(["all", "INCOME", "EXPENSE"] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  filter === f
                    ? "bg-brand-bg text-brand-headline shadow-sm"
                    : "text-brand-stroke/50 hover:text-brand-stroke dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {f === "all"
                  ? "Semua"
                  : f === "INCOME"
                    ? "Pemasukan"
                    : "Pengeluaran"}
              </button>
            ))}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-brand-bg text-brand-headline text-sm font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all duration-200 shrink-0 ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <MonthYearPicker
            month={filterMonth}
            year={filterYear}
            onChange={(m, y) => {
              setFilterMonth(m);
              setFilterYear(y);
              setPage(1);
            }}
            allowAll
          />
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-white/5 rounded-xl border border-brand-stroke/5 dark:border-white/10 shadow-sm text-sm font-medium text-brand-stroke dark:text-white placeholder-brand-stroke/30 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-bg/20 transition-all"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-stroke/30 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && !isOpen && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-sm border border-brand-stroke/5 dark:border-white/5 overflow-hidden">
        <div className="px-6 py-5 border-b border-brand-stroke/5 dark:border-white/5">
          <h3 className="text-base font-bold text-brand-stroke dark:text-white">
            Daftar Transaksi
          </h3>
          <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">
            {totalCount} transaksi ditemukan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-stroke/5 dark:border-white/5 text-[10px] uppercase font-bold text-brand-stroke/35 dark:text-slate-500 tracking-widest">
                <th className="px-6 pb-3 pt-4">Transaksi</th>
                <th className="px-3 pb-3 pt-4">Kategori</th>
                <th className="px-3 pb-3 pt-4">Rekening</th>
                <th className="px-3 pb-3 pt-4">Tanggal</th>
                <th className="px-3 pb-3 pt-4 text-right">Jumlah</th>
                <th className="px-6 pb-3 pt-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-stroke/5 dark:divide-white/5">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-brand-stroke/5 dark:border-white/5 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                        <Skeleton className="h-3.5 w-36" />
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-5 w-16 rounded-lg" />
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-3.5 w-20" />
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-3.5 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-3.5 w-24 ml-auto" />
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-6 w-6 rounded-lg mx-auto" />
                    </td>
                  </tr>
                ))}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-sm text-brand-stroke/40 dark:text-slate-500 font-medium"
                  >
                    Tidak ada transaksi yang sesuai
                  </td>
                </tr>
              )}
              {!loading &&
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="group hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === "INCOME"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-brand-tertiary"
                          }`}
                        >
                          {tx.type === "INCOME" ? (
                            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>
                        <span className="text-sm font-semibold text-brand-stroke dark:text-white group-hover:text-brand-bg transition-colors">
                          {tx.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex px-2.5 py-1 bg-slate-100 dark:bg-white/10 text-brand-stroke/60 dark:text-slate-400 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                        {tx.categoryName ?? "-"}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs font-semibold text-brand-stroke/50 dark:text-slate-400">
                      {tx.accountName ?? "-"}
                    </td>
                    <td className="px-3 py-4 text-xs font-semibold text-brand-stroke/50 dark:text-slate-400">
                      {new Date(tx.date + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </td>
                    <td
                      className={`px-3 py-4 text-right text-sm font-extrabold ${
                        tx.type === "INCOME"
                          ? "text-emerald-600"
                          : "text-brand-tertiary"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}{" "}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 relative">
                      <button
                        onClick={() =>
                          setActiveMenu(activeMenu === tx.id ? null : tx.id)
                        }
                        className="p-1.5 rounded-lg text-brand-stroke/30 dark:text-slate-500 hover:text-brand-stroke dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {activeMenu === tx.id && (
                        <div className="absolute right-6 top-10 z-10 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-lg border border-brand-stroke/5 dark:border-white/5 py-1 w-36 text-xs font-semibold">
                          <button
                            onClick={() => openEdit(tx)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-brand-stroke dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-brand-tertiary hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-brand-stroke/5 dark:border-white/5 flex items-center justify-between">
            <span className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/50 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:border-brand-stroke/20 dark:hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    page === p
                      ? "bg-brand-bg text-brand-headline shadow-sm"
                      : "text-brand-stroke/50 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/50 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:border-brand-stroke/20 dark:hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pt-4 ">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={closeModal}
          />

          {/* Modal Card */}
          <div
            className="relative w-full max-w-md bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div>
                <h3 className="text-base font-bold text-brand-stroke dark:text-white">
                  {editingTx ? "Edit Transaksi" : "Tambah Transaksi"}
                </h3>
                <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">
                  {editingTx
                    ? "Ubah detail transaksi"
                    : "Catat pemasukan atau pengeluaran baru"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-brand-stroke/40 dark:text-slate-500 hover:text-brand-stroke dark:hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-5">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              {/* Type Toggle */}
              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Jenis Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-white/10 rounded-xl p-1">
                  {(["EXPENSE", "INCOME"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        setForm((f) => ({ ...f, type: t, categoryId: "" }))
                      }
                      className={`py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                        form.type === t
                          ? t === "INCOME"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-brand-tertiary text-white shadow-sm"
                          : "text-brand-stroke/50 hover:text-brand-stroke dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {t === "INCOME" ? "↓ Pemasukan" : "↑ Pengeluaran"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Nominal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-stroke/40 dark:text-slate-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={
                      form.amount
                        ? new Intl.NumberFormat("id-ID").format(
                            Number(form.amount),
                          )
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setForm((f) => ({ ...f, amount: raw }));
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gaji Bulanan..."
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all placeholder-brand-stroke/25 dark:placeholder-slate-600"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  <Tag className="w-3 h-3 inline mr-1" />
                  Kategori
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all appearance-none"
                >
                  <option value="">Pilih kategori...</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account */}
              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  <Wallet className="w-3 h-3 inline mr-1" />
                  Rekening
                </label>
                <select
                  value={form.accountId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountId: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all appearance-none"
                >
                  <option value="">Pilih rekening...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Tanggal
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/60 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:border-brand-stroke/20 dark:hover:border-white/20 text-sm font-bold transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 ${
                  form.type === "INCOME" ? "bg-emerald-500" : "bg-brand-bg"
                }`}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionsPage;
