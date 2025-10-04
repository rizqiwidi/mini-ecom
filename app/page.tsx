import { headers } from "next/headers";

import SearchBar from "./components/SearchBar";
import SearchFilters from "./components/SearchFilters";
import ProductCard from "./components/ProductCard";
import ProductSubmissionForm from "./components/ProductSubmissionForm";
import PaginationControls from "./components/PaginationControls";

function resolveBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const projectDomain = process.env.VERCEL_PROJECT_DOMAIN?.trim();
  if (projectDomain) return `https://${projectDomain.replace(/\/$/, "")}`;
  try {
    const hdrs = headers();
    const host = hdrs.get("host");
    if (host) {
      const proto = hdrs.get("x-forwarded-proto") ?? "https";
      return `${proto}://${host.replace(/\/$/, "")}`;
    }
  } catch {}
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  return `http://localhost:${port}`;
}

type SearchOptions = {
  q: string;
  trend?: string;
  price?: string;
  sort?: string;
  page?: number;
};

type SearchResponse = {
  items: any[];
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

async function searchServer({ q, trend, price, sort, page }: SearchOptions): Promise<SearchResponse> {
  const trimmed = q.trim();
  if (!trimmed) {
    return { items: [], page: 1, totalPages: 1, totalItems: 0, pageSize: 24 };
  }
  const params = new URLSearchParams({ q: trimmed });
  if (trend && trend !== "all") params.set("trend", trend);
  if (price && price !== "all") params.set("price", price);
  if (sort && sort !== "relevance") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));

  const base = resolveBaseUrl();
  try {
    const res = await fetch(`${base}/api/search?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      return { items: [], page: 1, totalPages: 1, totalItems: 0, pageSize: 24 };
    }
    const data = await res.json();
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      page: Number.isFinite(Number(data?.page)) ? Number(data.page) : 1,
      totalPages: Number.isFinite(Number(data?.totalPages)) ? Number(data.totalPages) : 1,
      totalItems: Number.isFinite(Number(data?.totalItems)) ? Number(data.totalItems) : 0,
      pageSize: Number.isFinite(Number(data?.pageSize)) ? Number(data.pageSize) : 24,
    };
  } catch (err) {
    console.error("searchServer failed", err);
    return { items: [], page: 1, totalPages: 1, totalItems: 0, pageSize: 24 };
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: { q?: string; trend?: string; price?: string; sort?: string; page?: string };
}) {
  const q = searchParams.q ?? "";
  const trend = searchParams.trend ?? "all";
  const price = searchParams.price ?? "all";
  const sort = searchParams.sort ?? "relevance";
  const page = Number.parseInt(searchParams.page ?? "1", 10) || 1;

  const { items, totalItems, totalPages, page: currentPage } = await searchServer({ q, trend, price, sort, page });
  const filtersApplied = [
    trend !== "all" ? `Tren: ${trend}` : null,
    price !== "all" ? "Filter harga aktif" : null,
    sort !== "relevance" ? `Urut: ${sort}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const heroStats = [
    { label: "Total hasil", value: totalItems.toLocaleString("id-ID") },
    { label: "Halaman", value: `${currentPage}/${Math.max(totalPages, 1)}` },
    { label: "Filter aktif", value: filtersApplied || "Semua data" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/40 via-transparent to-transparent p-10 text-white shadow-2xl">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_55%)]" />
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            ? Insight Harga Laptop Indonesia
          </span>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end">
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                Cari laptop terbaik, pantau tren harga, dan buat keputusan beli lebih cerdas.
              </h1>
              <p className="max-w-2xl text-sm text-white/80 md:text-base">
                Data dikurasi setiap hari dari marketplace populer. Gunakan filter tren, harga, dan urutan untuk menemukan produk yang paling relevan.
              </p>
            </div>
            <dl className="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-6 backdrop-blur-sm sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <dt className="text-xs uppercase tracking-widest text-white/70">{stat.label}</dt>
                  <dd className="text-lg font-semibold text-white md:text-xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <div className="space-y-4">
          <SearchBar />
          <SearchFilters totalItems={totalItems} />
        </div>
      </section>

      {q && (
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur">
          <div className="font-semibold text-white">
            Menampilkan hasil untuk: <span className="text-indigo-300">{q}</span>
          </div>
          <div>{filtersApplied || "Tidak ada filter tambahan yang aktif."}</div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((p: any) => (
          <ProductCard key={p.sku} p={p} />
        ))}
      </div>

      {q && !items.length && (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
          Tidak ditemukan hasil dengan filter saat ini. Coba ubah kata kunci atau reset filter harga/tren.
        </div>
      )}

      {!q && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Mulai dengan mengetik nama produk, merek, atau spesifikasi. Contoh: <span className="font-semibold text-white">"asus tuf rtx"</span> atau <span className="font-semibold text-white">"macbook m2"</span>.
        </div>
      )}

      {q && totalPages > 1 && (
        <PaginationControls page={currentPage} totalPages={totalPages} totalItems={totalItems} />
      )}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <ProductSubmissionForm />
      </section>
    </div>
  );
}

