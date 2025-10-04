"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  page: number;
  totalPages: number;
  totalItems: number;
};

export default function PaginationControls({ page, totalPages, totalItems }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setPage = (target: number) => {
    const clamped = Math.min(Math.max(target, 1), Math.max(totalPages, 1));
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (clamped <= 1) params.delete("page");
    else params.set("page", clamped.toString());
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/");
  };

  const goPrev = () => setPage(page - 1);
  const goNext = () => setPage(page + 1);

  const buttonClasses = "inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/80 backdrop-blur">
      <div className="flex items-center justify-center gap-3">
        <button type="button" className={buttonClasses} onClick={goPrev} disabled={page <= 1}>
          Sebelumnya
        </button>
        <span className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          Halaman {page} / {Math.max(totalPages, 1)}
        </span>
        <button type="button" className={buttonClasses} onClick={goNext} disabled={page >= totalPages}>
          Selanjutnya
        </button>
      </div>
      <span className="text-xs text-white/60">Total hasil: {totalItems.toLocaleString("id-ID")} produk</span>
    </div>
  );
}

