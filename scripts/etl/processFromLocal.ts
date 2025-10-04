import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { put } from "@vercel/blob";


const ROOT_DIR = process.cwd();
const DATA_DIR = join(ROOT_DIR, "data");
const OUT_DIR = join(ROOT_DIR, "public", "processed");
const OUT_JSON = join(OUT_DIR, "products.json");
const BLOB_PREFIX = process.env.BLOB_PREFIX || "mini-ecom";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function* walk(dir: string): Generator<string> {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".csv") {
      yield fullPath;
    }
  }
}

async function main() {
  if (!existsSync(DATA_DIR)) {
    throw new Error("Folder data/ tidak ditemukan. Struktur: data/laptop/<Month Year>/<Marketplace>/<Brand>/*.csv");
  }

  if (!BLOB_TOKEN) {
    console.warn("Peringatan: BLOB_READ_WRITE_TOKEN tidak ada di .env.local. Upload ke Blob akan dilewati.");
  }

  const [{ forecastNext7, trendFlag }, etl] = await Promise.all([
    importForecastHelpers(),
    importEtlHelpers(),
  ]);
  const { createAccumulator, addRow, finalizeProducts, inferHintFromFsPath, rowsFromCsv } = etl;

  const acc = createAccumulator();

  for (const csvPath of walk(DATA_DIR)) {
    const segments = csvPath.toLowerCase().split(/[\\/]+/);
    if (!segments.includes("laptop")) continue;

    const hint = inferHintFromFsPath(csvPath);
    const text = readFileSync(csvPath, "utf8");
    let rows;
    try {
      rows = rowsFromCsv(text, hint);
    } catch (err) {
      console.error(`Skip ${csvPath} karena gagal parse CSV`, err);
      continue;
    }
    for (const row of rows) addRow(acc, row);
  }

  const aggregates = finalizeProducts(acc);
  const items = aggregates.map(({ meta, priceSeries, latestPrice }) => ({
    ...meta,
    price: latestPrice,
    trend: trendFlag(priceSeries),
    forecast7: forecastNext7(priceSeries),
  }));

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  writeFileSync(OUT_JSON, JSON.stringify({ items }, null, 2), "utf8");
  console.log(`[ok] Saved ${OUT_JSON} with ${items.length} products.`);

  if (BLOB_TOKEN) {
    await put(`${BLOB_PREFIX}/processed/products.json`, JSON.stringify({ items }), {
      access: "public",
      token: BLOB_TOKEN,
      allowOverwrite: true,
    });
    console.log(`[ok] Uploaded to Vercel Blob: ${BLOB_PREFIX}/processed/products.json`);
  } else {
    console.log("[skip] Upload to Blob dilewati karena BLOB_READ_WRITE_TOKEN tidak tersedia.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function importForecastHelpers() {
  const url = pathToFileURL(join(ROOT_DIR, "lib", "forecast.ts"));
  return (await import(url.href)) as typeof import("../../lib/forecast");
}

async function importEtlHelpers() {
  const url = pathToFileURL(join(ROOT_DIR, "lib", "etl.ts"));
  return (await import(url.href)) as typeof import("../../lib/etl");
}
