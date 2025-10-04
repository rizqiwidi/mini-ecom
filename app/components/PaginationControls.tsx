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
    const clamped = Math.min(Math.max(target, 1), totalPages);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (clamped <= 1) params.delete("page");
    else params.set("page", clamped.toString());
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/");
  };

  const goPrev = () => setPage(page - 1);
  const goNext = () => setPage(page + 1);

  return (
    <div className="flex flex-col items-center gap-2 text-sm text-center">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-xl border px-3 py-1 disabled:opacity-50"
          onClick={goPrev}
          disabled={page <= 1}
        >
          Sebelumnya
        </button>
        <span className="text-gray-600">
          Halaman {page} dari {totalPages}
        </span>
        <button
          type="button"
          className="rounded-xl border px-3 py-1 disabled:opacity-50"
          onClick={goNext}
          disabled={page >= totalPages}
        >
          Selanjutnya
        </button>
      </div>
      <span className="text-xs text-gray-500">Total hasil menemukan {totalItems.toLocaleString("id-ID")} produk.</span>
    </div>
  );
}
