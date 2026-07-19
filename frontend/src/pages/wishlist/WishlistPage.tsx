import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  MoreHorizontal,
  GripVertical,
  AlertTriangle,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { WishlistItem, WishlistPriority } from "../../types";
import {
  getWishlists,
  createWishlist,
  updateWishlist,
  purchaseWishlist,
  deleteWishlist,
  reorderWishlists,
  WishlistPayload,
} from "../../services/wishlistService";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v);

const PRIORITY_CONFIG = {
  HIGH: {
    label: "Tinggi",
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
  },
  MEDIUM: {
    label: "Sedang",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  LOW: {
    label: "Rendah",
    bg: "bg-slate-100 dark:bg-white/5",
    text: "text-slate-500 dark:text-slate-400",
  },
};

const PRIORITY_WEIGHTS: Record<WishlistPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function formatEstimatedDate(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function generateProjection(item: WishlistItem, avgSavings: number) {
  const now = new Date();
  const points: { bulan: string; terkumpul: number; target: number }[] = [];
  let cumulative = item.currentSavings;
  const maxMonths = item.monthsNeeded ? item.monthsNeeded + 1 : 13;

  for (let m = 0; m < maxMonths; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const label = d.toLocaleDateString("id-ID", {
      month: "short",
      year: "2-digit",
    });
    points.push({
      bulan: label,
      terkumpul: Math.min(
        Math.round(cumulative / 1000) * 1000,
        item.targetPrice,
      ),
      target: item.targetPrice,
    });
    cumulative += avgSavings;
    if (cumulative >= item.targetPrice) break;
  }
  return points;
}

function calcAllocations(items: WishlistItem[], avgSavings: number) {
  const active = items.filter((i) => !i.isPurchased && i.remaining > 0);
  if (!active.length || avgSavings <= 0) return [];
  const totalWeight = active.reduce(
    (s, i) => s + PRIORITY_WEIGHTS[i.priority],
    0,
  );
  return active.map((i) => ({
    id: i.id,
    name: i.name,
    priority: i.priority,
    allocated:
      Math.ceil(
        ((PRIORITY_WEIGHTS[i.priority] / totalWeight) * avgSavings) / 1000,
      ) * 1000,
  }));
}

interface FormState {
  name: string;
  target_price: string;
  current_savings: string;
  priority: WishlistPriority;
  notes: string;
}

const emptyForm: FormState = {
  name: "",
  target_price: "",
  current_savings: "",
  priority: "MEDIUM",
  notes: "",
};

// ── Sortable card ────────────────────────────────────────────────────────────
interface CardProps {
  item: WishlistItem;
  avgMonthlySavings: number;
  onCardClick: (item: WishlistItem) => void;
  onEdit: (item: WishlistItem) => void;
  onPurchase: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortableCard({
  item,
  avgMonthlySavings,
  onCardClick,
  onEdit,
  onPurchase,
  onDelete,
}: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const [menuOpen, setMenuOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const pct = Math.min(100, (item.currentSavings / item.targetPrice) * 100);
  const cfg = PRIORITY_CONFIG[item.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-50 dark:bg-white/5 rounded-2xl overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-2">
          {/* Drag handle — stopPropagation agar klik card tidak terpicu saat drag */}
          <button
            {...attributes}
            {...listeners}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-1 p-1 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Seluruh area ini bisa diklik untuk buka grafik */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onCardClick(item)}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}
                >
                  {cfg.label}
                </span>
                <h3 className="font-bold text-[#001e1d] dark:text-white text-sm leading-snug mt-1">
                  {item.name}
                </h3>
                <p className="text-base font-bold text-brand-stroke dark:text-white mt-0.5">
                  {formatCurrency(item.targetPrice)}
                </p>
              </div>
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[5]"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-8 z-10 bg-white dark:bg-[#252b3b] rounded-xl shadow-lg border border-slate-100 dark:border-white/5 py-1 min-w-[140px]">
                        <button
                          onClick={() => {
                            onEdit(item);
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#001e1d] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            onPurchase(item.id);
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Beli
                        </button>
                        <button
                          onClick={() => {
                            onDelete(item.id);
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                <span>Terkumpul: {formatCurrency(item.currentSavings)}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-stroke dark:bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Affordability */}
            <div className="space-y-2">
              {item.remaining <= 0 ? (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Siap dibeli! 🎉
                </p>
              ) : avgMonthlySavings <= 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tambah data transaksi untuk estimasi
                </p>
              ) : item.monthsNeeded != null ? (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-[#001e1d] dark:text-white">
                      ~{item.monthsNeeded} bulan lagi
                    </span>
                    {item.estimatedDate && (
                      <span className="text-slate-400 dark:text-slate-500">
                        {" "}
                        · estimasi {formatEstimatedDate(item.estimatedDate)}
                      </span>
                    )}
                  </p>
                </>
              ) : null}
            </div>

            {item.notes && (
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 italic">
                {item.notes}
              </p>
            )}

            {/* Hint klik untuk grafik */}
            {!item.isPurchased && (
              <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-300 dark:text-slate-600">
                <TriangleAlert className="w-3 h-3" />
                <span>Ketuk untuk lihat grafik proyeksi</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [avgMonthlySavings, setAvgMonthlySavings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartItem, setChartItem] = useState<WishlistItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  async function load() {
    setLoading(true);
    try {
      const res = await getWishlists();
      setItems(res.items);
      setAvgMonthlySavings(res.avgMonthlySavings);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditingItem(null);
    setForm(emptyForm);
    setError(null);
    setIsOpen(true);
  }

  function openEdit(item: WishlistItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      target_price: String(item.targetPrice),
      current_savings: String(item.currentSavings),
      priority: item.priority,
      notes: item.notes ?? "",
    });
    setError(null);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError("Nama barang wajib diisi");
      return;
    }
    const targetPrice = Number(form.target_price);
    if (!targetPrice || targetPrice <= 0) {
      setError("Harga target harus lebih dari 0");
      return;
    }
    const payload: WishlistPayload = {
      name: form.name.trim(),
      target_price: targetPrice,
      current_savings: Number(form.current_savings || "0"),
      priority: form.priority,
      notes: form.notes.trim() || null,
    };
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingItem) await updateWishlist(editingItem.id, payload);
      else await createWishlist(payload);
      closeModal();
      load();
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePurchase(id: string) {
    try {
      await purchaseWishlist(id);
      load();
    } catch {
      /* silent */
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWishlist(id);
      load();
    } catch {
      /* silent */
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeItems = items.filter((i) => !i.isPurchased);
    const oldIdx = activeItems.findIndex((i) => i.id === active.id);
    const newIdx = activeItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(activeItems, oldIdx, newIdx);
    setItems([...reordered, ...items.filter((i) => i.isPurchased)]);
    try {
      await reorderWishlists(reordered.map((i) => i.id));
    } catch {
      /* silent */
    }
  }

  const active = items.filter((i) => !i.isPurchased);
  const purchased = items.filter((i) => i.isPurchased);
  const allocations = calcAllocations(active, avgMonthlySavings);

  return (
    <div className="min-h-screen dark:bg-[#0f1117]">
      {/* Header */}
      <div className="pt-2 pb-5 mb-4">
        <p className="text-xs text-black dark:text-white">
          Rencanakan impian finansialmu
        </p>

        <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#006b65] via-[#004643] to-[#002523] p-4">
          <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
            Rata-rata tabungan / bulan
          </p>
          <p className="text-lg font-bold text-white mt-0.5">
            {avgMonthlySavings > 0 ? formatCurrency(avgMonthlySavings) : "—"}
          </p>
          <p className="text-[10px] text-white/50 mt-0.5">
            Berdasarkan 6 bulan terakhir
          </p>
        </div>

        {/* Peringatan realistis */}
        {!loading && avgMonthlySavings <= 0 && active.length > 0 && (
          <div className="mt-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                Tabungan rata-rata negatif
              </p>
              <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-0.5">
                Pengeluaranmu melebihi pemasukan. Kurangi pengeluaran agar bisa
                menabung untuk impianmu.
              </p>
            </div>
          </div>
        )}

        {/* Alokasi tabungan otomatis */}
        {!loading && avgMonthlySavings > 0 && allocations.length > 0 && (
          <div className="mt-3 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TriangleAlert className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-xs font-bold text-black dark:text-white uppercase tracking-widest">
                Saran Alokasi Bulan Ini
              </p>
            </div>
            <p className="text-[11px] text-black dark:text-white mb-3">
              Dari {formatCurrency(avgMonthlySavings)}/bulan, disarankan
              alokasikan:
            </p>
            <div className="space-y-2">
              {allocations.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.priority === "HIGH" ? "bg-red-500" : a.priority === "MEDIUM" ? "bg-amber-500" : "bg-slate-400"}`}
                    />
                    <span className="text-xs text-black dark:text-white truncate">
                      {a.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-black dark:text-white shrink-0 ml-2">
                    {formatCurrency(a.allocated)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 pb-28">
        {/* Active — sortable */}
        <section>
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-3">
            Impian Saya ({active.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-slate-50 dark:bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-200 dark:text-white/10 mb-3" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Belum ada wishlist
              </p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                Tambah barang impianmu!
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={active.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {active.map((item) => (
                    <SortableCard
                      key={item.id}
                      item={item}
                      avgMonthlySavings={avgMonthlySavings}
                      onCardClick={setChartItem}
                      onEdit={openEdit}
                      onPurchase={handlePurchase}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {/* Purchased */}
        {purchased.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-3">
              Sudah Terbeli ({purchased.length})
            </h2>
            <div className="space-y-2">
              {purchased.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-3 opacity-60"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#001e1d] dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatCurrency(item.targetPrice)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[#006b65]  text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Chart modal */}
      {chartItem && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center px-0 sm:px-4">
          <div
            className="absolute inset-0 bg-black/50"
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={() => setChartItem(null)}
          />
          <div className="relative w-full sm:max-w-md bg-white dark:bg-[#1a1f2e] rounded-t-3xl sm:rounded-3xl shadow-2xl pb-safe">
            {/* Handle bar (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-4 pb-3">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingUp className="w-4 h-4 text-brand-stroke dark:text-emerald-400 shrink-0" />
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Grafik Proyeksi
                  </p>
                </div>
                <h3 className="text-base font-bold text-[#001e1d] dark:text-white leading-snug truncate">
                  {chartItem.name}
                </h3>
                <p className="text-sm font-semibold text-brand-stroke dark:text-emerald-400 mt-0.5">
                  {formatCurrency(chartItem.targetPrice)}
                </p>
              </div>
              <button
                onClick={() => setChartItem(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chart */}
            <div className="px-4 pb-6">
              {chartItem.remaining <= 0 ? (
                <div className="py-8 text-center">
                  <p className="text-2xl mb-2">🎉</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Target sudah tercapai!
                  </p>
                </div>
              ) : avgMonthlySavings <= 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Butuh tabungan positif untuk melihat grafik
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-4 mb-4 px-2">
                    <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                        Estimasi
                      </p>
                      <p className="text-sm font-bold text-[#001e1d] dark:text-white mt-0.5">
                        {chartItem.monthsNeeded
                          ? `~${chartItem.monthsNeeded} bulan`
                          : "—"}
                      </p>
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                        Sisihkan/bln
                      </p>
                      <p className="text-sm font-bold text-[#001e1d] dark:text-white mt-0.5">
                        {chartItem.monthsNeeded
                          ? formatCurrency(
                              Math.ceil(
                                chartItem.remaining /
                                  chartItem.monthsNeeded /
                                  1000,
                              ) * 1000,
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart
                      data={generateProjection(chartItem, avgMonthlySavings)}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="chartGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#006b65"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#006b65"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(0,0,0,0.05)"
                      />
                      <XAxis
                        dataKey="bulan"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v: number) => [formatCurrency(v), ""]}
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 10,
                          border: "none",
                          background: "rgba(0,0,0,0.78)",
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#fff" }}
                        labelStyle={{ color: "#aaa", marginBottom: 2 }}
                      />
                      <ReferenceLine
                        y={chartItem.targetPrice}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        label={{
                          value: "Target",
                          position: "insideTopRight",
                          fontSize: 10,
                          fill: "#ef4444",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="terkumpul"
                        stroke="#006b65"
                        fill="url(#chartGrad)"
                        strokeWidth={2.5}
                        dot={false}
                        name="Terkumpul"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  {chartItem.estimatedDate && (
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
                      Estimasi tercapai:{" "}
                      <span className="font-semibold text-[#001e1d] dark:text-white">
                        {formatEstimatedDate(chartItem.estimatedDate)}
                      </span>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pt-4">
          <div
            className="absolute inset-0 bg-black/40"
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={closeModal}
          />
          <div
            className="relative w-full max-w-md bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#001e1d] dark:text-white">
                  {editingItem ? "Edit Wishlist" : "Tambah Wishlist"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingItem
                    ? "Ubah detail barang impian"
                    : "Catat barang yang ingin dibeli"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-5">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Nama Barang
                </label>
                <input
                  type="text"
                  placeholder="Contoh: iPhone 15, Laptop Gaming..."
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-[#001e1d] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-stroke/30 dark:focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Harga Target
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={
                      form.target_price
                        ? new Intl.NumberFormat("id-ID").format(
                            Number(form.target_price),
                          )
                        : ""
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        target_price: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-10 pr-4 py-3 text-sm text-[#001e1d] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-stroke/30 dark:focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Sudah Ditabung (opsional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={
                      form.current_savings
                        ? new Intl.NumberFormat("id-ID").format(
                            Number(form.current_savings),
                          )
                        : ""
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        current_savings: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-10 pr-4 py-3 text-sm text-[#001e1d] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-stroke/30 dark:focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Prioritas
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-white/10 rounded-xl p-1">
                  {(["LOW", "MEDIUM", "HIGH"] as WishlistPriority[]).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setForm((f) => ({ ...f, priority: p }))}
                        className={`py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                          form.priority === p
                            ? p === "HIGH"
                              ? "bg-red-500 text-white shadow-sm"
                              : p === "MEDIUM"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-slate-500 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        }`}
                      >
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Catatan (opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Alasan, spesifikasi, atau info lainnya..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-[#001e1d] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-stroke/30 dark:focus:ring-emerald-500/30 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-brand-stroke dark:bg-emerald-500 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60"
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
