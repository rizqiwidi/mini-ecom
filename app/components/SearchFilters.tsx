"use client";

import { useRouter, useSearchParams } from "next/navigation";

const trendOptions = [
  { value: "all", label: "Semua Tren" },
  { value: "down", label: "Tren Turun" },
  { value: "up", label: "Tren Naik" },
  { value: "flat", label: "Tren Stabil" },
];

const priceOptions = [
  { value: "all", label: "Semua Harga" },
  { value: "lt-5000k", label: "< Rp5.000.000" },
  { value: "5000-10000k", label: "Rp5.000.000 - Rp10.000.000" },
  { value: "gt-10000k", label: "> Rp10.000.000" },
];

const sortOptions = [
  { value: "relevance", label: "Paling Relevan" },
  { value: "price-asc", label: "Harga Termurah" },
  { value: "price-desc", label: "Harga Termahal" },
  { value: "sold-desc", label: "Terjual Terbanyak" },
];

export default function SearchFilters({ totalItems }: { totalItems: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const trend = searchParams.get("trend") ?? "all";
  const price = searchParams.get("price") ?? "all";
  const sort = searchParams.get("sort") ?? "relevance";

  const updateParam = (key: string, value: string, defaultValue: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === defaultValue) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/");
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-gray-500">Tren</span>
        <select
          className="border rounded-xl px-3 py-2"
          value={trend}
          onChange={(e) => updateParam("trend", e.target.value, "all")}
        >
          {trendOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="text-gray-500">Harga</span>
        <select
          className="border rounded-xl px-3 py-2"
          value={price}
          onChange={(e) => updateParam("price", e.target.value, "all")}
        >
          {priceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="text-gray-500">Urutkan</span>
        <select
          className="border rounded-xl px-3 py-2"
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value, "relevance")}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <span className="text-xs text-gray-500">Total hasil: {totalItems.toLocaleString("id-ID")}</span>
    </div>
  );
}
