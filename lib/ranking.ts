export type ProductDoc = {
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  trend?: "up" | "down" | "flat";
  direction?: "up" | "down" | "flat";
  forecast7?: number[];
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
    const brandTokens = tokens.filter((token) => BRAND_TOKENS.has(token));
    if (brandTokens.length) {
      if (brandTokens.some((token) => brand.includes(token))) score += 12;
      else score -= 20;
      const conflictingBrandInName = [...BRAND_TOKENS]
        .filter((token) => !brandTokens.includes(token))
        .some((token) => hay.includes(token));
      if (conflictingBrandInName) score -= 25;
    }
    const nameTokensMatched = tokens.filter((token) => (p.name ?? "").toLowerCase().includes(token)).length;
    score += nameTokensMatched * 4;
    if (p.sku) {
      const sku = p.sku.toLowerCase();
      if (sku.includes(qn)) score += 20;
      const condensedQuery = qn.replace(/[^a-z0-9]/g, "");
      if (condensedQuery && sku.replace(/[^a-z0-9]/g, "").includes(condensedQuery)) score += 10;
    }
  }
  const priceDirection = p.direction ?? p.trend;
  if (priceDirection === "down") score += 2;
  if (priceDirection === "up") score -= 1;
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
