"use client";

import { useCallback, useSyncExternalStore } from "react";

// localStorage'dagi kichik sozlamalar (masalan, tanlangan tuman) uchun.
// Faqat qulaylik uchun: ma'lumot yo'qolsa ilova ishlashda davom etadi.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useStoredValue(key: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );

  const setValue = useCallback(
    (next: string | null) => {
      try {
        if (next === null) localStorage.removeItem(key);
        else localStorage.setItem(key, next);
      } catch {
        // Saqlab bo'lmasa — tanlov faqat joriy ekranda qoladi
      }
      listeners.forEach((listener) => listener());
    },
    [key]
  );

  return [value, setValue];
}
