"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { useToast } from "./ToastProvider";

type ClipResult = { value: string; truncated: boolean };

const MAX_WORDS = 5;

function clipSearchValue(raw: string): ClipResult {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { value: "", truncated: false };
  const clipped = words.slice(0, MAX_WORDS).join(" ");
  return { value: clipped, truncated: words.length > MAX_WORDS };
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").replace(/\u00A0/g, " ");
}

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const truncatedNoticeShown = useRef(false);
  const initialResult = clipSearchValue(searchParams.get("q") ?? "");
  const [term, setTerm] = useState(initialResult.value);

  useEffect(() => {
    const result = clipSearchValue(searchParams.get("q") ?? "");
    setTerm(result.value);
    truncatedNoticeShown.current = result.truncated;
  }, [searchParams]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    const result = clipSearchValue(term);
    if (result.value) params.set("q", result.value);
    else params.delete("q");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
    if (result.value) {
      const description = result.truncated
        ? `Kata kunci dipotong menjadi: "${result.value}"`
        : `Kata kunci: "${result.value}"`;
      push({ title: "Mencari produk", description, variant: "info", durationMs: 2500 });
    }
  };

  const handleInputChange = (raw: string) => {
    const normalized = normalizeSpaces(raw);
    const trimmed = normalized.trim();
    if (!trimmed) {
      setTerm(normalized);
      truncatedNoticeShown.current = false;
      return;
    }
    const words = trimmed.split(" ");
    if (words.length <= MAX_WORDS) {
      setTerm(normalized);
      truncatedNoticeShown.current = false;
      return;
    }
    const clipped = words.slice(0, MAX_WORDS).join(" ");
    setTerm(clipped);
    if (!truncatedNoticeShown.current) {
      truncatedNoticeShown.current = true;
      push({
        title: "Maksimal 5 kata",
        description: "Kami hanya mengambil lima kata pertama untuk menjaga pencarian tetap cepat.",
        variant: "warning",
      });
    }
  };

  return (
    <form className="group flex w-full flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
      <div className="relative flex-1">
        <span
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
          aria-hidden="true"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20 20l-3.4-3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          className="w-full rounded-2xl border border-white/20 bg-white/10 px-12 py-3 text-base text-white placeholder:text-white/50 shadow-inner transition hover:border-indigo-300 focus:border-indigo-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          placeholder="Cari produk (maks. 5 kata)"
          value={term}
          onChange={(e) => handleInputChange(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-indigo-500/40 transition hover:-translate-y-0.5 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-white/20"
        disabled={!term.trim()}
      >
        Cari
      </button>
    </form>
  );
}
