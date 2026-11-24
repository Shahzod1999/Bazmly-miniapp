"use client";

import { useEffect, useRef } from "react";

// Telegram Mini App SDK (telegram-web-app.js) ulangan bo'lsa ishlaydi.
// Oddiy brauzerda yoki SDK ulanmagan bo'lsa, hech narsa qilmaydi.

type HapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";

interface TelegramBackButton {
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

interface TelegramHapticFeedback {
  impactOccurred: (style: HapticImpactStyle) => void;
  selectionChanged: () => void;
}

interface TelegramWebApp {
  BackButton?: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
  return tg?.WebApp ?? null;
}

export function hapticSelection() {
  getTelegramWebApp()?.HapticFeedback?.selectionChanged();
}

export function hapticImpact(style: HapticImpactStyle = "light") {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style);
}

/** Telegram'ning tizim "Orqaga" tugmasini ko'rsatadi va bosilganda handler'ni chaqiradi. */
export function useTelegramBackButton(handler: () => void) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const backButton = getTelegramWebApp()?.BackButton;
    if (!backButton) return;
    const onClick = () => handlerRef.current();
    backButton.onClick(onClick);
    backButton.show();
    return () => {
      backButton.offClick(onClick);
      backButton.hide();
    };
  }, []);
}
