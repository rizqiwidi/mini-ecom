"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("q") ?? "");

  useEffect(() => setTerm(searchParams.get("q") ?? ""), [searchParams]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    const value = term.trim();
    if (value) params.set("q", value);
    else params.delete("q");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  };

  return (
    <form className="group flex w-full flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/60">??</span>
        <input
          className="w-full rounded-2xl border border-white/20 bg-white/10 px-12 py-3 text-base text-white placeholder:text-white/50 shadow-inner transition hover:border-indigo-300 focus:border-indigo-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          placeholder="Cari produk (mis. 'asus tuf rtx' atau 'macbook m2')"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-indigo-500/40 transition hover:-translate-y-0.5 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-white/20"
        disabled={!term.trim() && !searchParams.get("q")}
      >
        Cari
      </button>
    </form>
  );
}


