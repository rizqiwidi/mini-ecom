export type ProductDoc = {
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  forecast7?: number[];
  trend?: "up" | "down" | "flat";
  isOnSale?: boolean;
  marketplace?: string;
  url?: string;
  sold?: number;
};

export function scoreQuery(q: string, p: ProductDoc) {
  const qn = q.toLowerCase();
  const hay = `${p.name} ${p.brand ?? ""} ${p.category ?? ""}`.toLowerCase();
  let score = 0;
  if (hay.includes(qn)) score += 10;
  const tokens = qn.split(/\s+/).filter(Boolean);
  if (tokens.length) {
    const brand = (p.brand ?? "").toLowerCase();
    for (const token of tokens) {
      if (brand.includes(token)) score += 4;
    }
    if (brand && tokens.some((token) => BRAND_TOKENS.has(token)) && !tokens.some((token) => brand.includes(token))) {
      score -= 5;
    }
  }
  if (p.trend === "down") score += 2;
  if (p.isOnSale) score += 3;
  if (typeof p.sold === "number" && p.sold > 0) {
    score += Math.min(6, Math.log10(p.sold + 1) * 2);
  }
  return score;
}

export function rankProducts(q: string, arr: ProductDoc[]) {
  return arr
    .map((p) => ({ p, s: scoreQuery(q, p) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

const BRAND_TOKENS = new Set([
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
