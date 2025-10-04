"use client";

import { FormEvent, useState } from "react";

type ProductCardProps = {
  p: {
    sku: string;
    name?: string;
    brand?: string;
    category?: string;
    price?: number;
    trend?: "up" | "down" | "flat";
    forecast7?: number[];
    marketplace?: string;
    url?: string;
    sold?: number;
  };
};

const ARROW_BY_TREND: Record<string, string> = {
  down: "\u2193",
  up: "\u2191",
  flat: "\u2192",
};

const BADGE_BY_TREND: Record<string, string> = {
  down: "bg-green-100 text-green-700",
  up: "bg-red-100 text-red-700",
  flat: "bg-gray-100 text-gray-700",
};

const LABEL_BY_TREND: Record<string, string> = {
  down: "tren turun",
  up: "tren naik",
  flat: "tren stabil",
};

export default function ProductCard({ p }: ProductCardProps) {
  const trend = typeof p.trend === "string" ? p.trend : "flat";
  const arrow = ARROW_BY_TREND[trend] ?? ARROW_BY_TREND.flat;
  const badge = BADGE_BY_TREND[trend] ?? BADGE_BY_TREND.flat;
  const trendLabel = LABEL_BY_TREND[trend] ?? LABEL_BY_TREND.flat;
  const next = Array.isArray(p.forecast7) && p.forecast7.length ? p.forecast7[0] : null;
  const soldLabel = typeof p.sold === "number" && p.sold >= 0 ? `Terjual ${p.sold.toLocaleString("id-ID")}` : null;
  const marketplace = p.marketplace?.trim() ?? "";
  const marketplaceLabel = marketplace ? `Lihat di ${marketplace}` : "Buka Tautan";

  const [showForm, setShowForm] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(Number(p.price ?? 0));
  const [newPriceDigits, setNewPriceDigits] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const formattedInputPrice = formatRupiah(newPriceDigits);

  const handleFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const priceValue = Number(newPriceDigits || 0);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setStatus("error");
      setMessage("Harga baru harus berupa angka positif.");
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
      setMessage(data?.message || "Terima kasih! Pembaruan harga tercatat.");
      setDisplayPrice(priceValue);
      setNewPriceDigits("");
      setNote("");
      setShowForm(false);
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Terjadi kesalahan.");
    }
  };

  const handlePriceInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    setNewPriceDigits(digits);
  };

  return (
    <div className="border rounded-2xl p-4 shadow-sm flex flex-col gap-2 bg-white">
      <div className="text-lg font-semibold line-clamp-2">{p.name ?? "Tanpa nama"}</div>
      <div className="text-sm text-gray-500">{p.brand || "-"} / {p.category || "-"}</div>
      <div className="flex items-center gap-2">
        <div className="text-xl font-bold">Rp {Number(displayPrice ?? 0).toLocaleString("id-ID")}</div>
        <span className={`text-xs px-2 py-1 rounded ${badge}`}>{arrow} {trendLabel}</span>
      </div>
      {next !== null && (
        <div className="text-sm">Prediksi besok: <b>Rp {Math.round(next).toLocaleString("id-ID")}</b></div>
      )}
      {soldLabel && <div className="text-sm text-gray-600">{soldLabel}</div>}
      {p.url && (
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {marketplaceLabel}
          <span aria-hidden>{"\u2197"}</span>
        </a>
      )}

      <button
        type="button"
        className="mt-2 w-fit rounded-xl border px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50"
        onClick={() => {
          setShowForm((prev) => !prev);
          setStatus("idle");
          setMessage(null);
        }}
      >
        Update Harga
      </button>

      {message && !showForm && (
        <span className={`text-xs ${status === "error" ? "text-red-600" : "text-green-600"}`}>
          {message}
        </span>
      )}

      {showForm && (
        <form className="mt-2 grid gap-2" onSubmit={handleFeedback}>
          <input
            className="border rounded-xl px-3 py-2 text-sm"
            placeholder="Harga terbaru (Rp)"
            inputMode="numeric"
            value={formattedInputPrice}
            onChange={(e) => handlePriceInput(e.target.value)}
            required
          />
          <textarea
            className="border rounded-xl px-3 py-2 text-sm"
            placeholder="Catatan tambahan (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:bg-indigo-300"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Mengirim..." : "Kirim"}
            </button>
            {message && (
              <span className={`text-xs ${status === "error" ? "text-red-600" : "text-green-600"}`}>
                {message}
              </span>
            )}
          </div>
        </form>
      )}

      <div className="mt-auto text-sm text-gray-400">SKU: {p.sku}</div>
    </div>
  );
}

function formatRupiah(digits: string) {
  if (!digits) return "";
  const number = Number(digits);
  if (!Number.isFinite(number)) return digits;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
}
