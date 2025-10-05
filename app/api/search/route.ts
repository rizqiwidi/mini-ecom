import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";

import { readManualList } from "../../../lib/manual-dataset";
import { rankProducts } from "../../../lib/ranking";
import { getBlobUrl } from "../../../lib/blob";

type ProductsPayload = { items: unknown } | null;
type ProductItem = Record<string, any>;

const LOCAL_JSON_PATH = join(process.cwd(), "public", "processed", "products.json");
const MAX_RESULTS = 24;
const MAX_QUERY_TOKENS = 5;
const MANUAL_DATASET_KEY = "manual/manual-dataset.json";
const PRICE_FEEDBACK_KEY = "manual/price-feedback.json";

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
  const directUrl = await getBlobUrl("processed/products.json");
  if (directUrl) {
    const blob = await fetchJson(directUrl);
    if (blob) return blob;
  }

  const prefix = process.env.BLOB_PREFIX || "mini-ecom";
  const fallbackUrl = `https://blob.vercel-storage.com/${prefix}/processed/products.json`;
  const fallbackBlob = await fetchJson(fallbackUrl);
  if (fallbackBlob) return fallbackBlob;

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

function mapPriceUpdateEntry(entry: any, index: number, source: string): ProductItem | null {
  const rawSku = typeof entry?.sku === "string" ? entry.sku.trim() : "";
  const sku = rawSku || `${source}-` + (index + 1);
  if (!sku) return null;

  const rawName = typeof entry?.productName === "string" ? entry.productName.trim() : "";
  const name = rawName || `Catatan harga ${sku}`;
  const rawMarketplace = typeof entry?.marketplace === "string" ? entry.marketplace.trim() : "";
  const marketplace = rawMarketplace || "Manual";
  const rawUrl = typeof entry?.url === "string" ? entry.url.trim() : "";
  const rawNote = typeof entry?.note === "string" ? entry.note.trim() : "";
  const timestamp = typeof entry?.timestamp === "string" ? entry.timestamp : undefined;

  const newPrice = Number(entry?.newPrice ?? entry?.price ?? NaN);
  const previousPrice = Number(entry?.previousPrice ?? NaN);

  const price = Number.isFinite(newPrice) && newPrice > 0 ? newPrice : 0;
  const previous = Number.isFinite(previousPrice) && previousPrice > 0 ? previousPrice : undefined;

  return {
    sku,
    name,
    brand: "Feedback",
    category: "Manual Update",
    marketplace,
    url: rawUrl || undefined,
    price,
    previousPrice: previous,
    note: rawNote || undefined,
    timestamp,
    source,
  } as ProductItem;
}

async function loadPriceFeedbackItems(): Promise<ProductItem[]> {
  const list = await readManualList(PRICE_FEEDBACK_KEY);
  if (!Array.isArray(list)) return [];
  const mapped = list
    .map((entry, index) => mapPriceUpdateEntry(entry, index, "price-feedback"))
    .filter((item): item is ProductItem => !!item);
  return mapped;
}

async function loadManualPriceUpdates(): Promise<ProductItem[]> {
  const list = await readManualList(MANUAL_DATASET_KEY);
  if (!Array.isArray(list)) return [];
  const mapped = list
    .map((entry, index) => {
      if ((entry?.type ?? "submission") !== "price-update") return null;
      return mapPriceUpdateEntry(entry, index, "manual-price-update");
    })
    .filter((item): item is ProductItem => !!item);
  return mapped;
}

function dedupeByKey(items: ProductItem[]): ProductItem[] {
  const seen = new Set<string>();
  const result: ProductItem[] = [];
  for (const item of items) {
    const key = `${item.sku}::${item.timestamp ?? item.price ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function buildResults(
  items: ProductItem[],
  tokens: string[],
  rawQuery: string,
  trendFilter: string,
  priceFilter: string,
  sortMode: string
) {
  const withDirection = items.map(withComputedDirection);
  const tokenFiltered = filterByTokens(withDirection, tokens, rawQuery);
  const trendFiltered = applyTrendFilter(tokenFiltered, trendFilter);
  const priceFiltered = applyPriceFilter(trendFiltered, priceFilter);
  const ranked = rankProducts(rawQuery, priceFiltered as any) as ProductItem[];
  return applySorting(ranked, sortMode);
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

function withComputedDirection(item: ProductItem) {
  const rawPrice = Number(item.price ?? NaN);
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : NaN;
  const forecastSeries = Array.isArray(item.forecast7)
    ? item.forecast7.map((value: any) => Number(value)).filter((value) => Number.isFinite(value))
    : [];
  const forecast = forecastSeries.length ? forecastSeries[0]! : NaN;
  let direction: "up" | "down" | "flat" = "flat";
  const fallback = typeof item.trend === "string" && ["up", "down", "flat"].includes(item.trend)
    ? (item.trend as "up" | "down" | "flat")
    : "flat";
  direction = fallback;
  if (Number.isFinite(price) && Number.isFinite(forecast)) {
    const dynamicTolerance = Math.max(1, Math.round((price as number) * 0.001));
    const diff = (forecast as number) - (price as number);
    if (diff > dynamicTolerance) direction = "up";
    else if (diff < -dynamicTolerance) direction = "down";
    else direction = "flat";
  }
  return { ...item, direction };
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
  const baseItems = [...items, ...manualSubmissions];
  let processed = buildResults(baseItems, tokens, q, trendFilter, priceFilter, sortMode);

  if (!processed.length) {
    const [feedbackItems, manualUpdates] = await Promise.all([
      loadPriceFeedbackItems(),
      loadManualPriceUpdates(),
    ]);
    const fallbackItems = dedupeByKey([...feedbackItems, ...manualUpdates]);
    if (fallbackItems.length) {
      processed = buildResults(fallbackItems, tokens, q, trendFilter, priceFilter, sortMode);
    }
  }

  const totalItems = processed.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / MAX_RESULTS));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * MAX_RESULTS;
  const paged = processed.slice(start, start + MAX_RESULTS);

  return NextResponse.json({
    items: paged,
    page: currentPage,
    totalPages,
    totalItems,
    pageSize: MAX_RESULTS,
  });
}
