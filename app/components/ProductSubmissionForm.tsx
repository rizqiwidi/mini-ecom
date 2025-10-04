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
      setMessage(data?.message || (data?.status === "updated" ? "Data produk ditimpa." : "Data produk ditambahkan."));
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
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Tambah Data Produk Baru</h2>
      <p className="mb-4 text-sm text-gray-500">
        Isi form ini sesuai header CSV (name, brand, price, marketplace, url, sold). Data akan dicek duplikat berdasarkan nama/URL dan marketplace.
      </p>
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            required
            className="border rounded-xl px-3 py-2"
            placeholder="Nama produk"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex gap-2">
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              {brandOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {brand === "Lainnya" && (
          <input
            required
            className="border rounded-xl px-3 py-2"
            placeholder="Nama brand lainnya"
            value={customBrand}
            onChange={(e) => setCustomBrand(e.target.value)}
          />
        )}

        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm text-gray-500">Marketplace</span>
            <div className="flex gap-2">
              {marketplaceOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                    marketplace === opt.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "hover:bg-gray-50"
                  }`}
                  onClick={() => setMarketplace(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <input
            className="border rounded-xl px-3 py-2"
            placeholder="URL Produk (opsional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <input
            required
            className="border rounded-xl px-3 py-2"
            placeholder="Harga (Rp)"
            inputMode="numeric"
            value={formattedPrice}
            onChange={(e) => handlePriceChange(e.target.value)}
          />
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Jumlah terjual (opsional)"
            inputMode="numeric"
            value={formattedSold}
            onChange={(e) => handleSoldChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-indigo-300"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Mengirim..." : "Kirim Data"}
          </button>
          {message && (
            <span className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
              {message}
            </span>
          )}
        </div>
      </form>
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
