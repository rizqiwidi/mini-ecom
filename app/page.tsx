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
  } catch {
    // headers() is only available in request context; ignore if not.
  }
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
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Cari barang terbaik dengan tren harga</h1>
      <SearchBar />
      <SearchFilters totalItems={totalItems} />
      {q && (
        <div className="text-sm text-gray-500">
          Hasil untuk: <b>{q}</b>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p: any) => (
          <ProductCard key={p.sku} p={p} />
        ))}
      </div>
      {q && !items.length && (
        <p className="text-sm text-gray-500">Tidak ditemukan hasil dengan filter saat ini. Coba ubah filter atau kata kunci.</p>
      )}
      {!q && <p className="text-gray-500">Mulai dengan mengetik nama produk, merek, atau spesifikasi.</p>}

      {q && totalPages > 1 && (
        <PaginationControls page={currentPage} totalPages={totalPages} totalItems={totalItems} />
      )}

      <section className="mt-4">
        <ProductSubmissionForm />
      </section>
    </div>
  );
}
