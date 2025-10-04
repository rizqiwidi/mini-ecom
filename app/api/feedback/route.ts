import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { uploadBlob } from "../../../lib/blob";

const FEEDBACK_PATH = join(process.cwd(), "data", "price-feedback.json");
const MANUAL_DATASET_PATH = join(process.cwd(), "data", "manual-dataset.json");

type FeedbackEntry = {
  id: string;
  timestamp: string;
  sku: string;
  newPrice: number;
  note?: string;
  productName?: string;
  marketplace?: string;
  url?: string;
  previousPrice?: number;
};

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body harus berupa JSON" }, { status: 400 });
  }

  const sku = normalizeString(payload?.sku);
  const newPrice = Number(payload?.newPrice);
  const note = normalizeString(payload?.note);

  if (!sku || !Number.isFinite(newPrice) || newPrice <= 0) {
    return NextResponse.json(
      { ok: false, message: "SKU dan harga baru wajib diisi dengan benar." },
      { status: 400 }
    );
  }

  const entry: FeedbackEntry = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    sku,
    newPrice,
    note: note || undefined,
    productName: normalizeString(payload?.productName) || undefined,
    marketplace: normalizeString(payload?.marketplace) || undefined,
    url: normalizeString(payload?.url) || undefined,
    previousPrice: Number.isFinite(Number(payload?.previousPrice)) ? Number(payload?.previousPrice) : undefined,
  };

  const feedbackEntries = await appendArrayFile(FEEDBACK_PATH, entry);
  try {
    await uploadBlob("feedback/price-feedback.json", JSON.stringify(feedbackEntries));
  } catch (err) {
    console.warn("upload feedback blob failed", err);
  }

  const datasetRecord = {
    type: "price-update",
    timestamp: entry.timestamp,
    sku: entry.sku,
    newPrice: entry.newPrice,
    previousPrice: entry.previousPrice ?? null,
    marketplace: entry.marketplace ?? null,
    url: entry.url ?? null,
    note: entry.note ?? null,
  };
  const dataset = await appendArrayFile(MANUAL_DATASET_PATH, datasetRecord);
  try {
    await uploadBlob("manual/manual-dataset.json", JSON.stringify(dataset));
  } catch (err) {
    console.warn("upload manual dataset blob failed", err);
  }

  const message = "Masukan harga tercatat. Data tambahan akan diproses pada ETL berikutnya.";

  return NextResponse.json({ ok: true, entry, status: "created", message });
}

async function appendArrayFile(path: string, entry: any) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const entries = await loadArrayFile(path);
  entries.push(entry);
  await writeFile(path, JSON.stringify(entries, null, 2), "utf8");
  return entries;
}

async function loadArrayFile(path: string) {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
