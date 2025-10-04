import { parse } from "csv-parse/sync";

const MONTH_MAP: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

type PriceHint = { brand?: string; marketplace?: string; yyyymmdd?: string };

export type NormalizedProductRow = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  marketplace: string;
  price: number;
  yyyymmdd?: string;
  url?: string;
  sold?: number;
};

export type ProductMeta = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  marketplace: string;
  url?: string;
  sold?: number;
};

type PriceEntry = { value: number; yyyymmdd?: string; order: number };

type ProductAggregate = {
  meta: ProductMeta;
  prices: PriceEntry[];
};

export type ProductAccumulator = {
  map: Record<string, ProductAggregate>;
  sequence: number;
};

export type FinalizedProduct = {
  meta: ProductMeta;
  priceSeries: number[];
  latestPrice: number;
};

export function createAccumulator(): ProductAccumulator {
  return { map: {}, sequence: 0 };
}

export function addRow(acc: ProductAccumulator, row: NormalizedProductRow) {
  const meta: ProductMeta = {
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    category: row.category,
    marketplace: row.marketplace,
    url: row.url,
    sold: row.sold,
  };

  if (!acc.map[row.sku]) {
    acc.map[row.sku] = {
      meta: { ...meta },
      prices: [{ value: row.price, yyyymmdd: row.yyyymmdd, order: acc.sequence++ }],
    };
    return;
  }

  const existing = acc.map[row.sku];
  existing.meta = mergeMeta(existing.meta, meta);

  if (row.yyyymmdd) {
    const index = existing.prices.findIndex((p) => p.yyyymmdd === row.yyyymmdd);
    if (index >= 0) {
      existing.prices[index] = {
        value: row.price,
        yyyymmdd: row.yyyymmdd,
        order: existing.prices[index].order,
      };
      return;
    }
  }

  existing.prices.push({ value: row.price, yyyymmdd: row.yyyymmdd, order: acc.sequence++ });
}

export function finalizeProducts(acc: ProductAccumulator): FinalizedProduct[] {
  return Object.values(acc.map)
    .map((aggregate) => {
      if (!aggregate.prices.length) return null;
      const sorted = aggregate.prices
        .slice()
        .sort(comparePriceEntry);
      const series = sorted.map((p) => p.value);
      return {
        meta: aggregate.meta,
        priceSeries: series,
        latestPrice: sorted[sorted.length - 1].value,
      } satisfies FinalizedProduct;
    })
    .filter((item): item is FinalizedProduct => item !== null && item.priceSeries.length > 0);
}

export function rowsFromCsv(text: string, hint: PriceHint): NormalizedProductRow[] {
  if (!text.trim()) return [];
  const records = parseCsv(text);
  const results: NormalizedProductRow[] = [];
  for (const record of records) {
    const normalized = normalizeRecord(record, hint);
    if (normalized) results.push(normalized);
  }
  return results;
}

export function inferHintFromFsPath(filePath: string): PriceHint {
  const segments = filePath.split(/[\\/]+/).filter(Boolean);
  const idx = segments.findIndex((segment) => segment.toLowerCase() === "laptop");
  if (idx === -1) return {};
  const monthYear = segments[idx + 1] ?? "";
  const marketplace = segments[idx + 2] ?? "";
  const brand = segments[idx + 3] ?? "";
  const fileName = segments[segments.length - 1] ?? "";
  return buildHint(monthYear, marketplace, brand, fileName);
}

export function inferHintFromBlobKey(key: string, prefix: string): PriceHint {
  const safePrefix = escapeRegExp(prefix);
  const raw = key.replace(new RegExp(`^${safePrefix}/raw/`, "i"), "");
  const segments = raw.split("/").filter(Boolean);
  const idx = segments.findIndex((segment) => segment.toLowerCase() === "laptop");
  if (idx === -1) return {};
  const monthYear = segments[idx + 1] ?? "";
  const marketplace = segments[idx + 2] ?? "";
  const brand = segments[idx + 3] ?? "";
  const fileName = segments[idx + 4] ?? segments[segments.length - 1] ?? "";
  return buildHint(monthYear, marketplace, brand, fileName);
}

function parseCsv(text: string): Record<string, string>[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];
}

function normalizeRecord(record: Record<string, string>, hint: PriceHint): NormalizedProductRow | null {
  const name = pickValue(record, ["name", "product_name", "title"], "Unknown");
  const brand = pickValue(record, ["brand"], hint.brand ?? "Unknown");
  const category = pickValue(record, ["category", "kategori"], "Laptop");
  const rawPrice = pickValue(record, ["price", "harga", "min_price", "max_price"], "0");
  const price = parsePrice(rawPrice);
  if (!name || !Number.isFinite(price) || price <= 0) return null;

  const marketplace = pickValue(record, ["marketplace", "source"], hint.marketplace ?? "");

  const url = pickUrl(record);

  const soldRaw = pickValue(record, ["sold", "sold_count", "sold_quantity", "terjual"], "");
  const sold = parseSold(soldRaw);

  let yyyymmdd = hint.yyyymmdd;
  const dateFields = ["date", "tanggal", "updated_at", "last_update", "last_updated"];
  for (const field of dateFields) {
    const candidate = record[field];
    const parsed = parseDate(candidate);
    if (parsed) {
      yyyymmdd = parsed;
      break;
    }
  }

  const skuSource = record["sku"] ?? `${brand}-${name}-${yyyymmdd ?? ""}`;
  const sku = buildSku(skuSource);

  return {
    sku,
    name,
    brand,
    category,
    marketplace,
    url,
    sold,
    price,
    yyyymmdd,
  };
}

function buildHint(monthYear: string, marketplace: string, brand: string, fileName: string): PriceHint {
  const result: PriceHint = {};
  if (brand) result.brand = brand.trim();
  if (marketplace) result.marketplace = marketplace.trim();

  const base = parseMonthYear(monthYear);
  const fromFile = parseDateFromFileName(fileName);

  if (fromFile?.year) {
    const year = fromFile.year;
    const month = fromFile.month ?? base?.month;
    const day = fromFile.day ?? "01";
    result.yyyymmdd = combineDateParts(year, month, day);
  } else if (base?.year && base.month) {
    result.yyyymmdd = `${base.year}${base.month}`;
  }

  return result;
}

function parseMonthYear(value: string): { year: string; month?: string } | null {
  if (!value) return null;
  const match = value.match(/([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const month = MONTH_MAP[match[1].toLowerCase()] ?? "";
  if (!month) return { year: match[2] };
  return { year: match[2], month };
}

function parseDateFromFileName(fileName: string): { year?: string; month?: string; day?: string } | null {
  if (!fileName) return null;
  const normalized = fileName.toLowerCase();
  const match = normalized.match(/(\d{1,2})_(\d{1,2})_(\d{4})/);
  if (match) {
    return {
      day: match[1].padStart(2, "0"),
      month: match[2].padStart(2, "0"),
      year: match[3],
    };
  }
  const iso = normalized.match(/(\d{4})[-_](\d{1,2})[-_](\d{1,2})/);
  if (iso) {
    return {
      year: iso[1],
      month: iso[2].padStart(2, "0"),
      day: iso[3].padStart(2, "0"),
    };
  }
  return null;
}

function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const iso = trimmed.match(/^\d{4}[-/]\d{2}[-/]\d{2}$/);
  if (iso) {
    const parts = trimmed.split(/[\/-]/);
    return combineDateParts(parts[0], parts[1], parts[2]);
  }

  const dmy = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) {
    return combineDateParts(dmy[3], dmy[2].padStart(2, "0"), dmy[1].padStart(2, "0"));
  }

  const mdY = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (mdY) {
    const month = MONTH_MAP[mdY[1].toLowerCase()];
    if (month) return combineDateParts(mdY[3], month, mdY[2].padStart(2, "0"));
  }

  return undefined;
}

function combineDateParts(year: string, month?: string, day?: string): string {
  const mm = (month ?? "01").padStart(2, "0");
  const dd = (day ?? "01").padStart(2, "0");
  return `${year}${mm}${dd}`;
}

function parsePrice(value: string): number {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function buildSku(raw: string): string {
  const sanitized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (sanitized) return sanitized.slice(0, 80);
  return `sku-${Math.random().toString(36).slice(2, 10)}`;
}

function pickValue(record: Record<string, string>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record[key];
    if (value) {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return fallback;
}

function pickUrl(record: Record<string, string>): string | undefined {
  const candidates = ["url", "product_url", "link", "productLink", "product_link", "link_produk"];
  for (const key of candidates) {
    const value = record[key];
    if (value) {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function parseSold(value: string): number | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeMeta(current: ProductMeta, incoming: ProductMeta): ProductMeta {
  return {
    sku: current.sku,
    name: preferMetaValue(current.name, incoming.name),
    brand: preferMetaValue(current.brand, incoming.brand),
    category: preferMetaValue(current.category, incoming.category),
    marketplace: preferMetaValue(current.marketplace, incoming.marketplace),
    url: preferUrl(current.url, incoming.url),
    sold: mergeSold(current.sold, incoming.sold),
  };
}

function preferMetaValue(current: string, incoming: string): string {
  const isMeaningful = (value: string) => !!value && value !== "Unknown" && value !== "-";
  if (!isMeaningful(current) && isMeaningful(incoming)) return incoming;
  if (isMeaningful(incoming) && incoming.length > current.length) return incoming;
  return current;
}

function comparePriceEntry(a: PriceEntry, b: PriceEntry): number {
  const dateA = a.yyyymmdd ? parseInt(a.yyyymmdd, 10) : undefined;
  const dateB = b.yyyymmdd ? parseInt(b.yyyymmdd, 10) : undefined;
  if (dateA !== undefined && dateB !== undefined) return dateA - dateB;
  if (dateA !== undefined) return -1;
  if (dateB !== undefined) return 1;
  return a.order - b.order;
}

function preferUrl(current?: string, incoming?: string): string | undefined {
  const normalize = (value?: string) => (value ? value.trim() : "");
  const cur = normalize(current);
  const inc = normalize(incoming);
  if (!cur && inc) return inc;
  if (!inc) return cur || undefined;
  if (inc.length > cur.length) return inc;
  return cur || undefined;
}

function mergeSold(current?: number, incoming?: number): number | undefined {
  if (typeof incoming === "number" && incoming >= 0) {
    if (typeof current === "number" && current >= 0) {
      return Math.max(current, incoming);
    }
    return incoming;
  }
  return current;
}
