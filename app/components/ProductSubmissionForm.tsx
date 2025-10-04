"use client";

import { FormEvent, useMemo, useState } from "react";

const brandOptions = [
  "Asus",
  "Acer",
  "Lenovo",
  "HP",
  "Dell",
  "MSI",
  "Apple",
  "Samsung",
  "Razer",
  "Huawei",
  "LG",
  "Xiaomi",
  "Axioo",
  "Lainnya",
];

const marketplaceOptions = [
  { value: "Shopee", label: "Shopee" },
  { value: "Tokopedia", label: "Tokopedia" },
];

type Status = "idle" | "loading" | "success" | "error";

const fieldClasses = "rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40";

export default function ProductSubmissionForm() {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState(brandOptions[0]);
  const [customBrand, setCustomBrand] = useState("");
  const [marketplace, setMarketplace] = useState(marketplaceOptions[0].value);
  const [url, setUrl] = useState("");
  const [priceDigits, setPriceDigits] = useState("");
  const [soldDigits, setSoldDigits] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const effectiveBrand = useMemo(() => {
    if (brand === "Lainnya") {
      return customBrand.trim();
    }
    return brand;
  }, [brand, customBrand]);

  const formattedPrice = formatRupiah(priceDigits);
  const formattedSold = soldDigits ? formatNumber(soldDigits) : "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    if (!name.trim()) {
      setStatus("error");
      setMessage("Nama produk wajib diisi.");
      return;
    }

    if (!effectiveBrand) {
      setStatus("error");
      setMessage("Brand wajib diisi.");
      return;
    }

    const price = Number(priceDigits || 0);
    if (!Number.isFinite(price) || price <= 0) {
      setStatus("error");
      setMessage("Harga wajib diisi dengan angka yang valid.");
      return;
    }

    const sold = soldDigits ? Number(soldDigits) : undefined;
    if (soldDigits && (!Number.isFinite(sold!) || sold! < 0)) {
      setStatus("error");
      setMessage("Jumlah terjual harus angka >= 0.");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brand: effectiveBrand,
          category: "Laptop",
          marketplace,
          url: url.trim() || undefined,
          price,
          sold,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Gagal mengirim data");
      }

      setStatus("success");
      setMessage(data?.message || "Data produk baru berhasil ditambahkan ke database manual.");
      resetForm();
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Terjadi kesalahan.");
    }
  };

  const resetForm = () => {
    setName("");
    setBrand(brandOptions[0]);
    setCustomBrand("");
    setMarketplace(marketplaceOptions[0].value);
    setUrl("");
    setPriceDigits("");
    setSoldDigits("");
  };

  const handlePriceChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    setPriceDigits(digits);
  };

  const handleSoldChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    setSoldDigits(digits);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] p-6 text-white shadow-xl">
      <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Tambah Data Produk Baru</h2>
          <p className="text-sm text-white/70">
            Isi sesuai header CSV (name, brand, price, marketplace, url, sold). Kami menambahkan setiap entri sebagai referensi untuk forecasting berikutnya.
          </p>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wide text-white/60">Nama produk</label>
              <input
                required
                className={fieldClasses}
                placeholder="Contoh: Asus TUF F15 i7"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wide text-white/60">Brand</label>
              <select
                className={fieldClasses}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              >
                {brandOptions.map((opt) => (
                  <option key={opt} value={opt} className="text-slate-900">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {brand === "Lainnya" && (
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wide text-white/60">Nama brand lain</label>
              <input
                required
                className={fieldClasses}
                placeholder="Tulis nama brand"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wide text-white/60">Marketplace</label>
              <div className="flex gap-2">
                {marketplaceOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                      marketplace === opt.value
                        ? "border-indigo-400 bg-indigo-500/30 text-white shadow-inner shadow-indigo-500/20"
                        : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                    }`}
                    onClick={() => setMarketplace(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wide text-white/60">URL Produk</label>
              <input
                className={fieldClasses}
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wide text-white/60">Harga</label>
              <input
                required
                className={fieldClasses}
                placeholder="Rp 15.500.000"
                inputMode="numeric"
                value={formattedPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wide text-white/60">Jumlah terjual</label>
              <input
                className={fieldClasses}
                placeholder="Opsional"
                inputMode="numeric"
                value={formattedSold}
                onChange={(e) => handleSoldChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/20"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Mengirim..." : "Kirim Data"}
            </button>
            {message && (
              <span className={`text-sm ${status === "error" ? "text-rose-300" : "text-emerald-300"}`} aria-live="polite">
                {message}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function formatRupiah(digits: string) {
  if (!digits) return "";
  const number = Number(digits);
  if (!Number.isFinite(number)) return digits;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
}

function formatNumber(digits: string) {
  if (!digits) return "";
  const number = Number(digits);
  if (!Number.isFinite(number)) return digits;
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(number);
}

