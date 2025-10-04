import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";

import { readManualList } from "../../../lib/manual-dataset";
import { rankProducts } from "../../../lib/ranking";

type ProductsPayload = { items: unknown } | null;
type ProductItem = Record<string, any>;

const LOCAL_JSON_PATH = join(process.cwd(), "public", "processed", "products.json");
const MAX_RESULTS = 24;
const MAX_QUERY_TOKENS = 5;
const MANUAL_DATASET_KEY = "manual/manual-dataset.json";

const STOP_WORDS = new Set([
  "dan",
  "yang",
  "atau",
  "untuk",
  "dengan",
  "the",
  "and",
  "with",
  "di",
  "ke",
]);

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

async function loadManualSubmissions(): Promise<ProductItem[]> {
  try {
    const list = await readManualList(MANUAL_DATASET_KEY);
    if (!Array.isArray(list)) return [];
    return list
      .filter((entry: any) => (entry?.type ?? "submission") === "submission")
      .map((entry: any, index: number) => {
        const name = typeof entry?.name === "string" && entry.name.trim() ? entry.name.trim() : "Produk manual";
        const brand = typeof entry?.brand === "string" ? entry.brand.trim() : "";
        const category = typeof entry?.category === "string" ? entry.category.trim() : "Manual";
        const rawPrice = Number(entry?.price ?? NaN);
        const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
        const marketplace = typeof entry?.marketplace === "string" ? entry.marketplace.trim() : "Manual";
        const base = `${entry?.timestamp ?? "manual"}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const sku = `manual-${base || index}`;
        return {
          sku,
          name,
          brand,
          category,
          price,
          marketplace,
          url: typeof entry?.url === "string" ? entry.url.trim() || undefined : undefined,
          sold: Number.isFinite(Number(entry?.sold)) ? Number(entry.sold) : undefined,
          trend: "flat",
          direction: "flat",
          changePercent: null,
          accuracy: null,
          forecast7: [],
          source: "manual",
        } as ProductItem;
      });
  } catch (err) {
    console.warn("manual submissions load failed", err);
    return [];
  }
}

function tokenizeQuery(raw: string) {
  const normalized = raw.toLowerCase();
  const primary = normalized
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
  const unique = primary.filter((token, index) => primary.indexOf(token) === index).slice(0, MAX_QUERY_TOKENS);
  if (unique.length) return unique;
  return normalized
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, MAX_QUERY_TOKENS);
}

function filterByTokens(items: ProductItem[], tokens: string[], rawQuery: string) {
  if (!tokens.length) return items;
  const normalizedQuery = rawQuery.toLowerCase();
  return items.filter((item) => {
    const haystack = `${item.name ?? ""} ${item.brand ?? ""} ${item.category ?? ""} ${item.marketplace ?? ""} ${item.sku ?? ""}`.toLowerCase();
    if (normalizedQuery && item.sku && normalizedQuery.includes("-")) {
      const condensed = normalizedQuery.replace(/[^a-z0-9]/g, "");
      const skuLower = item.sku.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!skuLower.includes(condensed)) return false;
    }
    return tokens.some((token) => haystack.includes(token));
  });
}

function applyTrendFilter(items: ProductItem[], trend: string) {
  if (!items.length || trend === "all") return items;
  const normalized = trend.toLowerCase();
  return items.filter((item) => {
    const current = (item.direction ?? item.trend ?? "").toLowerCase();
    return current === normalized;
  });
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
  const manualSubmissions = await loadManualSubmissions();
  const combinedItems = [...items, ...manualSubmissions];

  const tokenFiltered = filterByTokens(combinedItems, tokens, q);
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
