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
  const price = Number(item.price ?? NaN);
  const forecast = Array.isArray(item.forecast7) && item.forecast7.length ? Number(item.forecast7[0]) : NaN;
  let direction: "up" | "down" | "flat" = "flat";
  if (typeof item.direction === "string" && ["up", "down", "flat"].includes(item.direction)) {
    direction = item.direction as "up" | "down" | "flat";
  } else if (typeof item.trend === "string" && ["up", "down", "flat"].includes(item.trend)) {
    direction = item.trend as "up" | "down" | "flat";
  }
  const tolerance = 1; // IDR
  if (Number.isFinite(price) && Number.isFinite(forecast)) {
    if (price > forecast + tolerance) direction = "down";
    else if (price + tolerance < forecast) direction = "up";
    else direction = "flat";
  }
  return { ...item, direction };
}


