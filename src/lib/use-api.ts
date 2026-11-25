"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ApiState<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "success"; data: T; error: undefined }
  | { status: "error"; data: undefined; error: Error };

export interface ApiQuery<T> {
  state: ApiState<T>;
  /** So'rovni qaytadan yuboradi ("Qayta urinish" tugmasi uchun) */
  retry: () => void;
  /** Ma'lumotni qo'lda yangilash (masalan, bekor qilishdan keyin) */
  setData: (updater: (prev: T) => T) => void;
}

const LOADING = { status: "loading", data: undefined, error: undefined } as const;

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error("Noma'lum xatolik yuz berdi");
}

/**
 * Ma'lumot yuklash uchun umumiy hook.
 * `key` o'zgarganda so'rov qaytadan yuboriladi; `key = null` bo'lsa so'rov yuborilmaydi.
 */
export function useApiQuery<T>(key: string | null, fetcher: () => Promise<T>): ApiQuery<T> {
  const [result, setResult] = useState<{ key: string | null; nonce: number; state: ApiState<T> }>({
    key,
    nonce: 0,
    state: LOADING,
  });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    fetcherRef
      .current()
      .then((data) => {
        if (alive) setResult({ key, nonce, state: { status: "success", data, error: undefined } });
      })
      .catch((err: unknown) => {
        if (alive) setResult({ key, nonce, state: { status: "error", data: undefined, error: toError(err) } });
      });
    return () => {
      alive = false;
    };
  }, [key, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  const setData = useCallback((updater: (prev: T) => T) => {
    setResult((prev) =>
      prev.state.status === "success"
        ? { ...prev, state: { status: "success", data: updater(prev.state.data), error: undefined } }
        : prev
    );
  }, []);

  // Javob joriy kalit va urinishga tegishli bo'lmasa — hali yuklanmoqda
  const isCurrent = result.key === key && result.nonce === nonce;
  return { state: isCurrent ? result.state : LOADING, retry, setData };
}

/** Xatodan foydalanuvchiga ko'rsatiladigan matn */
export function errorMessage(err: unknown, fallback = "Xatolik yuz berdi. Qaytadan urinib ko'ring."): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
