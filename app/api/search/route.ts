import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";

import { rankProducts } from "../../../lib/ranking";

type ProductsPayload = { items: unknown } | null;
type ProductItem = Record<string, any>;

const LOCAL_JSON_PATH = join(process.cwd(), "public", "processed", "products.json");
const MAX_RESULTS = 24;

const BRAND_KEYWORDS = new Set([
  "asus",
  "acer",
  "lenovo",
  "hp",
  "dell",
  "msi",
  "apple",
  "samsung",
  "huawei",
  "lg",
  "xiaomi",
  "razer",
  "axioo",
  "zyrex",
  "infinix",
  "gigabyte",
  "surface",
]);

const STOP_WORDS = new Set([
  "with",
  "dan",
  "dengan",
  "yang",
  "and",
  "the",
  "atau",
  "ke",
  "di",
]);

const FUSE_OPTIONS: IFuseOptions<ProductItem> = {
  includeScore: true,
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: "name", weight: 0.5 },
    { name: "brand", weight: 0.3 },
    { name: "category", weight: 0.15 },
    { name: "marketplace", weight: 0.05 },
    { name: "sku", weight: 0.35 },
  ],
};

let cachedData: ProductsPayload = null;
let cachedLocalMtime: number | null = null;

async function loadProducts() {
  const fromLocal = await loadFromLocalFile();
  if (fromLocal) {
    cachedData = fromLocal;
    return fromLocal;
  }

  if (cachedData) return cachedData;

  const fromRemote = await loadFromRemote();
  if (fromRemote) {
    cachedData = fromRemote;
    return fromRemote;
  }

  return { items: [] };
}

async function loadFromLocalFile(): Promise<ProductsPayload> {
  try {
    const fileStat = await stat(LOCAL_JSON_PATH);
    if (cachedLocalMtime && cachedLocalMtime === fileStat.mtimeMs && cachedData) {
      return cachedData;
    }
    const raw = await readFile(LOCAL_JSON_PATH, "utf8");
    const parsed = parsePayload(raw);
    if (parsed) {
      cachedLocalMtime = fileStat.mtimeMs;
      return parsed;
    }
  } catch {}
  return null;
}

async function loadFromRemote(): Promise<ProductsPayload> {
  const prefix = process.env.BLOB_PREFIX || "mini-ecom";
  const blobUrl = `https://blob.vercel-storage.com/${prefix}/processed/products.json`;
  const blob = await fetchJson(blobUrl);
  if (blob) return blob;

  const base = resolveBaseUrl();
  if (!base) return null;
  return fetchJson(`${base}/processed/products.json`);
}

function resolveBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const projectDomain = process.env.VERCEL_PROJECT_DOMAIN?.trim();
  if (projectDomain) return `https://${projectDomain.replace(/\/$/, "")}`;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "";
}

async function fetchJson(url: string): Promise<ProductsPayload> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const parsed = parsePayload(await res.text());
    return parsed;
  } catch {
    return null;
  }
}

function parsePayload(raw: string): ProductsPayload {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.items)) {
      return { items: parsed.items };
    }
  } catch {}
  return null;
}

function tokenizeQuery(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function filterByTokens(items: ProductItem[], tokens: string[], rawQuery: string) {
  if (!tokens.length) return items;
  const brandTokens = tokens.filter((token) => BRAND_KEYWORDS.has(token));
  const normalizedQuery = rawQuery.toLowerCase();
  return items.filter((item) => {
    const haystack = `${item.name ?? ""} ${item.brand ?? ""} ${item.category ?? ""} ${item.marketplace ?? ""} ${item.sku ?? ""}`.toLowerCase();
    if (!tokens.every((token) => haystack.includes(token))) return false;
    if (normalizedQuery && item.sku) {
      const skuLower = item.sku.toLowerCase();
      if (normalizedQuery.includes("-")) {
        const condensed = normalizedQuery.replace(/[^a-z0-9]/g, "");
        if (!skuLower.replace(/[^a-z0-9]/g, "").includes(condensed)) return false;
      } else if (!skuLower.includes(normalizedQuery) && normalizedQuery.length > 4) {
        return false;
      }
    }
    if (brandTokens.length) {
      const brand = String(item.brand ?? "").toLowerCase();
      if (!brandTokens.some((token) => brand.includes(token))) return false;
      const conflictingBrands = [...BRAND_KEYWORDS].filter((token) => !brandTokens.includes(token));
      if (conflictingBrands.some((token) => haystack.includes(token))) return false;
    }
    return true;
  });
}

function applyTrendFilter(items: ProductItem[], trend: string) {
  if (!items.length || trend === "all") return items;
  const normalized = trend.toLowerCase();
  return items.filter((item) => (item.trend ?? "").toLowerCase() === normalized);
}

function applyPriceFilter(items: ProductItem[], filter: string) {
  if (!items.length || filter === "all") return items;
  return items.filter((item) => {
    const price = Number(item.price ?? NaN);
    if (!Number.isFinite(price)) return false;
    switch (filter) {
      case "lt-5000k":
        return price < 5_000_000;
      case "5000-10000k":
        return price >= 5_000_000 && price <= 10_000_000;
      case "gt-10000k":
        return price > 10_000_000;
      default:
        return true;
    }
  });
}

function applySorting(items: ProductItem[], mode: string) {
  if (!items.length) return items;
  switch (mode) {
    case "price-asc":
      return [...items].sort((a, b) => getPrice(a, Infinity) - getPrice(b, Infinity));
    case "price-desc":
      return [...items].sort((a, b) => getPrice(b, -Infinity) - getPrice(a, -Infinity));
    case "sold-desc":
      return [...items].sort((a, b) => getSold(b) - getSold(a));
    default:
      return items;
  }
}

function getPrice(item: ProductItem, fallback: number) {
  const value = Number(item.price);
  return Number.isFinite(value) ? value : fallback;
}

function getSold(item: ProductItem) {
  const value = Number(item.sold);
  return Number.isFinite(value) ? value : -1;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ items: [], page: 1, totalPages: 1, totalItems: 0, pageSize: MAX_RESULTS });
  }

  const tokens = tokenizeQuery(q);
  const trendFilter = (req.nextUrl.searchParams.get("trend") || "all").toLowerCase();
  const priceFilter = (req.nextUrl.searchParams.get("price") || "all").toLowerCase();
  const sortMode = (req.nextUrl.searchParams.get("sort") || "relevance").toLowerCase();
  const pageParam = Number.parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const data = await loadProducts();
  const items = Array.isArray(data?.items) ? (data.items as ProductItem[]) : [];

  const fuse = new Fuse(items, FUSE_OPTIONS);
  const fuseResults = fuse.search(q).map((res) => res.item);
  const baseCandidates = fuseResults.length ? fuseResults : items;

  const tokenFiltered = filterByTokens(baseCandidates, tokens, q);
  const trendFiltered = applyTrendFilter(tokenFiltered, trendFilter);
  const priceFiltered = applyPriceFilter(trendFiltered, priceFilter);
  const ranked = rankProducts(q, priceFiltered as any) as ProductItem[];
  const sorted = applySorting(ranked, sortMode);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / MAX_RESULTS));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * MAX_RESULTS;
  const paged = sorted.slice(start, start + MAX_RESULTS);

  return NextResponse.json({
    items: paged,
    page: currentPage,
    totalPages,
    totalItems,
    pageSize: MAX_RESULTS,
  });
}





