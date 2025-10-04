"use client";

import { useEffect, useRef } from "react";

import { useToast } from "./ToastProvider";

type Props = {
  query: string;
  totalItems: number;
};

export default function SearchNotifier({ query, totalItems }: Props) {
  const { push } = useToast();
  const lastNotificationKey = useRef<string>("");

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      lastNotificationKey.current = "";
      return;
    }
    const key = `${trimmed}|${totalItems}`;
    if (lastNotificationKey.current === key) return;
    lastNotificationKey.current = key;

    if (totalItems > 0) {
      push({
        title: "Hasil ditemukan",
        description: `${totalItems.toLocaleString("id-ID")} produk cocok dengan kata kunci Anda`,
        variant: "success",
      });
    } else {
      push({
        title: "Tidak ada hasil",
        description: "Coba gunakan kata kunci lain atau kurangi filter aktif.",
        variant: "warning",
      });
    }
  }, [push, query, totalItems]);

  return null;
}

