"use client";

import { FormEvent, useMemo, useState } from "react";

import { useToast } from "./ToastProvider";

type ProductCardProps = {
  p: {
    sku: string;
    name?: string;
    brand?: string;
    category?: string;
    price?: number;
    trend?: "up" | "down" | "flat";
    direction?: "up" | "down" | "flat";
    forecast7?: number[];
    marketplace?: string;
    url?: string;
    sold?: number;
    changePercent?: number | null;
  };
};

const ARROW_BY_TREND: Record<string, string> = {
  down: "\u2193",
  up: "\u2191",
  flat: "\u2192",
};

const BADGE_BY_TREND: Record<string, string> = {
  down: "bg-emerald-400/20 text-emerald-200 border border-emerald-300/30",
  up: "bg-rose-400/20 text-rose-200 border border-rose-300/30",
  flat: "bg-slate-400/20 text-slate-200 border border-slate-300/30",
};

const LABEL_BY_TREND: Record<string, string> = {
  down: "tren turun",
  up: "tren naik",
  flat: "tren stabil",
};

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function ProductCard({ p }: ProductCardProps) {
  const rawTrend = typeof p.trend === "string" ? p.trend : "flat";
  const direction = typeof p.direction === "string" && ["up", "down", "flat"].includes(p.direction) ? p.direction : rawTrend;
  const arrow = ARROW_BY_TREND[direction] ?? ARROW_BY_TREND.flat;
  const badge = BADGE_BY_TREND[direction] ?? BADGE_BY_TREND.flat;
  const trendLabel = LABEL_BY_TREND[direction] ?? LABEL_BY_TREND.flat;
  const next = Array.isArray(p.forecast7) && p.forecast7.length ? p.forecast7[0] : null;
  const changePercent =
    typeof p.changePercent === "number" && Number.isFinite(p.changePercent)
      ? Number(p.changePercent.toFixed(1))
      : null;

  const soldLabel = useMemo(() => {
    if (typeof p.sold === "number" && p.sold >= 0) {
      return `Terjual ${p.sold.toLocaleString("id-ID")}`;
    }
    return null;
  }, [p.sold]);
  const marketplace = p.marketplace?.trim() ?? "";
  const marketplaceLabel = marketplace ? `Lihat di ${marketplace}` : "Buka Tautan";

  const [showForm, setShowForm] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(Number(p.price ?? 0));
  const [newPriceDigits, setNewPriceDigits] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const { push } = useToast();

  const formattedInputPrice = formatRupiah(newPriceDigits);

  const showFeedbackError = (description: string) => {
    setStatus("error");
    setMessage(description);
    push({ title: "Gagal mengirim update harga", description, variant: "error" });
  };

  const handleFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const priceValue = Number(newPriceDigits || 0);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      showFeedbackError("Harga baru harus berupa angka positif.");
      return;
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: p.sku,
          productName: p.name,
          marketplace: p.marketplace,
          url: p.url,
          previousPrice: p.price,
          newPrice: priceValue,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Gagal mengirim pembaruan harga.");
      }

      const data = await res.json().catch(() => ({}));
      setStatus("success");
      const successMessage = data?.message || "Terima kasih! Pembaruan harga tercatat.";
      setMessage(successMessage);
      push({ title: "Harga diperbarui", description: successMessage, variant: "success" });
      setDisplayPrice(priceValue);
      setNewPriceDigits("");
      setNote("");
      setShowForm(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Terjadi kesalahan.";
      showFeedbackError(errorMessage);
    }
  };

  const handlePriceInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    setNewPriceDigits(digits);
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] p-6 text-white shadow-xl transition duration-200 hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.09]">
      <div className="pointer-events-none absolute -top-12 right-0 h-32 w-32 rounded-full bg-indigo-500/40 blur-3xl transition group-hover:bg-indigo-400/50" />
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-lg font-semibold leading-snug line-clamp-2">{p.name ?? "Tanpa nama"}</div>
          <div className="text-xs uppercase tracking-wide text-white/60">{p.brand || "-"} | {p.category || "-"}</div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-bold">{currency.format(displayPrice)}</div>
            {soldLabel && <div className="text-xs text-white/60">{soldLabel}</div>}
            {changePercent !== null && (
              <div className="text-xs text-white/60">
                Perubahan terbaru: <span className={`font-semibold ${changePercent > 0 ? "text-emerald-200" : changePercent < 0 ? "text-rose-200" : "text-white"}`}>
                  {changePercent > 0 ? "+" : ""}
                  {changePercent.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
            {arrow} {trendLabel}
          </span>
        </div>
        {next !== null && (
          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/80">
            Prediksi harga dalam 7 hari: <span className="font-semibold text-white">{currency.format(Math.round(next))}</span>
          </div>
        )}
        {p.url && (
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/40 hover:text-white"
          >
            {marketplaceLabel}
            <span aria-hidden>{"\u2197"}</span>
          </a>
        )}
        <button
          type="button"
          className="w-fit rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/40 hover:text-white"
          onClick={() => {
            setShowForm((prev) => !prev);
            setStatus("idle");
            setMessage(null);
          }}
        >
          Update Harga
        </button>
        {message && !showForm && (
          <span className={`text-xs ${status === "error" ? "text-rose-300" : "text-emerald-300"}`} aria-live="polite">
            {message}
          </span>
        )}
      </div>

      {showForm && (
        <form className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-white" onSubmit={handleFeedback}>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-wide text-white/60">Harga terbaru</label>
            <input
              className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              placeholder="Rp 15.000.000"
              inputMode="numeric"
              value={formattedInputPrice}
              onChange={(e) => handlePriceInput(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-wide text-white/60">Catatan</label>
            <textarea
              className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              placeholder="Contoh: harga per 4 Oktober di toko resmi"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="submit"
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-indigo-500/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/20"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Mengirim..." : "Kirim"}
            </button>
            {message && (
              <span className={`text-xs ${status === "error" ? "text-rose-300" : "text-emerald-300"}`} aria-live="polite">
                {message}
              </span>
            )}
          </div>
        </form>
      )}

      <div className="mt-6 text-xs text-white/50">SKU: {p.sku}</div>
    </div>
  );
}

function formatRupiah(digits: string) {
  if (!digits) return "";
  const number = Number(digits);
  if (!Number.isFinite(number)) return digits;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
}
