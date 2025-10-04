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

const baseSelectClasses = "rounded-xl border border-white/10 bg-white/10 px-4 py-2 pr-10 text-sm text-white shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40";

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

  const resetFilters = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    ["trend", "price", "sort", "page"].forEach((key) => params.delete(key));
    router.replace("/?" + params.toString());
  };

  const hasCustomFilters = trend !== "all" || price !== "all" || sort !== "relevance";

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-white/60">Tren</span>
        <select className={baseSelectClasses} value={trend} onChange={(e) => updateParam("trend", e.target.value, "all")}>
          {trendOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-white/60">Harga</span>
        <select className={baseSelectClasses} value={price} onChange={(e) => updateParam("price", e.target.value, "all")}>
          {priceOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-white/60">Urutkan</span>
        <select className={baseSelectClasses} value={sort} onChange={(e) => updateParam("sort", e.target.value, "relevance")}>
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <span className="ml-auto text-xs text-white/60">Total hasil: {totalItems.toLocaleString("id-ID")}</span>

      {hasCustomFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Reset filter
        </button>
      )}
    </div>
  );
}


