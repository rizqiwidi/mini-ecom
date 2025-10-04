import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { uploadBlob } from "./blob";

const DATA_DIR = join(process.cwd(), "data");

function getBlobKey(relative: string) {
  const prefix = process.env.BLOB_PREFIX || "mini-ecom";
  return `${prefix}/${relative}`;
}

export async function readManualList(relative: string) {
  const blobKey = getBlobKey(relative);
  try {
    const res = await fetch(`https://blob.vercel-storage.com/${blobKey}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) return json;
    }
  } catch (err) {
    console.warn(`manual dataset: fetch ${blobKey} failed`, err);
  }

  try {
    const path = join(DATA_DIR, relative);
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  return [] as any[];
}

export async function writeManualList(relative: string, list: any[]) {
  const blobKey = getBlobKey(relative);
  try {
    await uploadBlob(relative, JSON.stringify(list));
  } catch (err) {
    console.warn(`manual dataset: upload ${relative} failed`, err);
  }

  if (process.env.VERCEL) return; // filesystem read-only on Vercel

  try {
    const filePath = join(DATA_DIR, relative);
    const dir = dirname(filePath);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.warn(`manual dataset: write local ${relative} failed`, err);
  }
}

export async function appendManualEntry(relative: string, entry: any) {
  const list = await readManualList(relative);
  list.push(entry);
  await writeManualList(relative, list);
  return list;
}

