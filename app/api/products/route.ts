import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { uploadBlob } from "../../../lib/blob";

const SUBMISSION_PATH = join(process.cwd(), "data", "user-submissions.json");
const MANUAL_DATASET_PATH = join(process.cwd(), "data", "manual-dataset.json");

type SubmissionEntry = {
  id: string;
  timestamp: string;
  name: string;
  brand: string;
  category: string;
  marketplace: string;
  url?: string;
  price: number;
  sold?: number;
};

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body harus berupa JSON" }, { status: 400 });
  }

  const name = normalizeString(payload?.name);
  const brand = normalizeString(payload?.brand);
  const category = normalizeString(payload?.category ?? "Laptop");
  const marketplace = normalizeString(payload?.marketplace);
  const url = normalizeString(payload?.url);
  const price = Number(payload?.price);
  const sold = payload?.sold !== undefined && payload?.sold !== null ? Number(payload?.sold) : undefined;

  if (!name || !brand || !marketplace || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { ok: false, message: "Field name, brand, marketplace, dan price wajib diisi." },
      { status: 400 }
    );
  }

  if (sold !== undefined && (!Number.isFinite(sold) || sold < 0)) {
    return NextResponse.json({ ok: false, message: "Field sold harus berupa angka >= 0." }, { status: 400 });
  }

  const entry: SubmissionEntry = {
    id: `submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    name,
    brand,
    category,
    marketplace,
    url: url || undefined,
    price,
    sold,
  };

  const submissions = await appendArrayFile(SUBMISSION_PATH, entry);
  try {
    await uploadBlob("submissions/user-submissions.json", JSON.stringify(submissions));
  } catch (err) {
    console.warn("upload submission blob failed", err);
  }

  const datasetRecord = {
    type: "submission",
    timestamp: entry.timestamp,
    name: entry.name,
    brand: entry.brand,
    category: entry.category,
    marketplace: entry.marketplace,
    price: entry.price,
    sold: entry.sold ?? null,
    url: entry.url ?? null,
  };
  const dataset = await appendArrayFile(MANUAL_DATASET_PATH, datasetRecord);
  try {
    await uploadBlob("manual/manual-dataset.json", JSON.stringify(dataset));
  } catch (err) {
    console.warn("upload manual dataset blob failed", err);
  }

  const message = "Data produk baru berhasil ditambahkan ke database manual.";

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
