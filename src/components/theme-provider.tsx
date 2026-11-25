"use client";

import React, { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { getTelegramWebApp } from "@/lib/telegram";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const STORAGE_KEY = "bazmly-theme";
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Mavzu manbai: Telegram ichida — Telegram'ning colorScheme, tashqarida — saqlangan tanlov yoki tizim sozlamasi.
const listeners = new Set<() => void>();
let manualTheme: Theme | null = null;

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  if (manualTheme) return manualTheme;
  const webApp = getTelegramWebApp();
  if (webApp) return webApp.colorScheme === "dark" ? "dark" : "light";
  const stored = readStoredTheme();
  if (stored) return stored;
  // Avvalgidek: saqlangan tanlov bo'lmasa yorug' mavzu
  return "light";
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const webApp = getTelegramWebApp();
  webApp?.onEvent("themeChanged", emit);
  return () => {
    listeners.delete(listener);
    webApp?.offEvent("themeChanged", emit);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribe, currentTheme, () => "light");

  // DOM'dagi `dark` klassini mavzu bilan sinxronlash (tashqi tizimni yangilash)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    manualTheme = currentTheme() === "dark" ? "light" : "dark";
    if (!getTelegramWebApp()) {
      try {
        localStorage.setItem(STORAGE_KEY, manualTheme);
      } catch {
        // Saqlab bo'lmasa ham mavzu joriy sessiyada almashadi
      }
    }
    emit();
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
