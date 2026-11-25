"use client";

import { useEffect } from "react";
import { getTelegramWebApp } from "@/lib/telegram";

/**
 * Telegram Mini App bilan bog'lanish: ready/expand, balandlik va safe area'ni CSS o'zgaruvchilariga yozish.
 * Ilova oddiy brauzerda ochilsa hech narsa qilmaydi.
 */
export function TelegramProvider() {
  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    const root = document.documentElement;
    root.dataset.telegram = "true";

    webApp.ready();
    webApp.expand();
    if (webApp.isVersionAtLeast("7.7")) webApp.disableVerticalSwipes?.();

    const syncViewport = () => {
      const height = webApp.viewportStableHeight || webApp.viewportHeight;
      if (height) root.style.setProperty("--tg-viewport-height", `${height}px`);
      const safe = webApp.safeAreaInset;
      const content = webApp.contentSafeAreaInset;
      const top = (safe?.top ?? 0) + (content?.top ?? 0);
      const bottom = (safe?.bottom ?? 0) + (content?.bottom ?? 0);
      root.style.setProperty("--tg-safe-top", `${top}px`);
      root.style.setProperty("--tg-safe-bottom", `${bottom}px`);
    };

    const syncColors = () => {
      const styles = getComputedStyle(root);
      const background = styles.getPropertyValue("--background").trim();
      const surface = background;
      if (webApp.isVersionAtLeast("6.1")) {
        if (surface) webApp.setHeaderColor?.(surface);
        if (background) webApp.setBackgroundColor?.(background);
      }
    };

    syncViewport();
    // Mavzu klassi ThemeProvider'da yangilanadi — ranglarni keyingi kadrda o'qiymiz
    const onTheme = () => requestAnimationFrame(syncColors);
    onTheme();

    webApp.onEvent("viewportChanged", syncViewport);
    webApp.onEvent("safeAreaChanged", syncViewport);
    webApp.onEvent("contentSafeAreaChanged", syncViewport);
    webApp.onEvent("themeChanged", onTheme);
    return () => {
      webApp.offEvent("viewportChanged", syncViewport);
      webApp.offEvent("safeAreaChanged", syncViewport);
      webApp.offEvent("contentSafeAreaChanged", syncViewport);
      webApp.offEvent("themeChanged", onTheme);
    };
  }, []);

  return null;
}
