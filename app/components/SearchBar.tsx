"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SearchBar() {
  const r = useRouter();
  const sp = useSearchParams();
  const [term, setTerm] = useState(sp.get("q") ?? "");
  useEffect(() => setTerm(sp.get("q") ?? ""), [sp]);
  return (
    <form
      className="flex gap-2 items-center w-full"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams(Array.from(sp.entries()));
        const value = term.trim();
        if (value) params.set("q", value);
        else params.delete("q");
        params.delete("page");
        const query = params.toString();
        r.push(query ? `/?${query}` : "/");
      }}
    >
      <input
        className="w-full border rounded-2xl px-4 py-3 shadow"
        placeholder="Cari produk (mis. 'asus i5 ssd')"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <button className="px-5 py-3 rounded-2xl shadow border">Cari</button>
    </form>
  );
}
