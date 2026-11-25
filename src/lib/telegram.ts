"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// Telegram Mini App SDK (https://telegram.org/js/telegram-web-app.js) bilan ishlash.
// SDK yuklanmagan yoki ilova oddiy brauzerda ochilgan bo'lsa, funksiyalar hech narsa qilmaydi.

type HapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type HapticNotificationType = "error" | "success" | "warning";

interface SafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

export interface MainButtonParams {
  text?: string;
  color?: string;
  text_color?: string;
  is_active?: boolean;
  is_visible?: boolean;
}

interface TelegramMainButton {
  text: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setParams: (params: MainButtonParams) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

interface TelegramHapticFeedback {
  impactOccurred: (style: HapticImpactStyle) => void;
  notificationOccurred: (type: HapticNotificationType) => void;
  selectionChanged: () => void;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface RequestContactResult {
  status: "sent" | "cancelled";
  /** Backend tekshiradigan imzolangan xom satr */
  response?: string;
}

type TelegramEvent = "themeChanged" | "viewportChanged" | "safeAreaChanged" | "contentSafeAreaChanged";

export interface TelegramWebApp {
  initData: string;
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  viewportHeight: number;
  viewportStableHeight: number;
  safeAreaInset?: SafeAreaInset;
  contentSafeAreaInset?: SafeAreaInset;
  BackButton: TelegramBackButton;
  MainButton: TelegramMainButton;
  HapticFeedback: TelegramHapticFeedback;
  ready: () => void;
  expand: () => void;
  isVersionAtLeast: (version: string) => boolean;
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openLink: (url: string) => void;
  requestContact?: (callback: (shared: boolean, result?: RequestContactResult) => void) => void;
  onEvent: (event: TelegramEvent, handler: () => void) => void;
  offEvent: (event: TelegramEvent, handler: () => void) => void;
}

/** SDK yuklangan va ilova haqiqatan Telegram ichida ochilgan bo'lsa WebApp, aks holda null. */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const webApp = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  if (!webApp || !webApp.initData) return null;
  return webApp;
}

function subscribeNoop() {
  return () => {};
}

/** Ilova Telegram ichida ochilganmi (server render paytida false). */
export function useIsTelegram(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => getTelegramWebApp() !== null,
    () => false
  );
}

export function hapticSelection() {
  getTelegramWebApp()?.HapticFeedback.selectionChanged();
}

export function hapticImpact(style: HapticImpactStyle = "light") {
  getTelegramWebApp()?.HapticFeedback.impactOccurred(style);
}

export function hapticNotify(type: HapticNotificationType) {
  getTelegramWebApp()?.HapticFeedback.notificationOccurred(type);
}

/** Tashqi havolani ochadi: Telegram ichida tizim brauzerida, aks holda yangi oynada. */
export function openExternalLink(url: string) {
  const webApp = getTelegramWebApp();
  if (webApp) webApp.openLink(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}

/** Telegram kontaktini so'raydi. Foydalanuvchi rad etsa yoki SDK yo'q bo'lsa null qaytaradi. */
export function requestTelegramContact(): Promise<string | null> {
  const webApp = getTelegramWebApp();
  if (!webApp?.requestContact) return Promise.resolve(null);
  return new Promise((resolve) => {
    webApp.requestContact?.((shared, result) => {
      resolve(shared && result?.status === "sent" && result.response ? result.response : null);
    });
  });
}

// "Orqaga" tugmasi uchun handler'lar steki: faqat eng oxirgi ochilgan (masalan, sheet) ishlaydi.
const backStack: { current: () => void }[] = [];

function dispatchBack() {
  backStack[backStack.length - 1]?.current();
}

/** Telegram'ning tizim "Orqaga" tugmasini ko'rsatadi va bosilganda handler'ni chaqiradi. */
export function useTelegramBackButton(handler: () => void, enabled = true) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const backButton = getTelegramWebApp()?.BackButton;
    if (!backButton || !enabled) return;
    if (backStack.length === 0) backButton.onClick(dispatchBack);
    backStack.push(handlerRef);
    backButton.show();
    return () => {
      const index = backStack.lastIndexOf(handlerRef);
      if (index >= 0) backStack.splice(index, 1);
      if (backStack.length === 0) {
        backButton.offClick(dispatchBack);
        backButton.hide();
      }
    };
  }, [enabled]);
}

// Sheet yoki modal ochiq bo'lganda sahifaning MainButton'i vaqtincha yashiriladi.
let mainButtonSuspendCount = 0;
const suspendListeners = new Set<() => void>();

function subscribeSuspend(listener: () => void) {
  suspendListeners.add(listener);
  return () => {
    suspendListeners.delete(listener);
  };
}

/** `active` bo'lganda sahifadagi MainButton yashiriladi (sheet o'z tugmalarini ko'rsatadi). */
export function useSuspendMainButton(active: boolean) {
  useEffect(() => {
    if (!active) return;
    mainButtonSuspendCount += 1;
    suspendListeners.forEach((l) => l());
    return () => {
      mainButtonSuspendCount -= 1;
      suspendListeners.forEach((l) => l());
    };
  }, [active]);
}

export interface MainButtonOptions {
  text: string;
  onClick: () => void;
  visible?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Telegram ichida pastdagi tizim tugmasini (MainButton) boshqaradi.
 * Qaytgan qiymat true bo'lsa, sahifa o'z pastki tugmasini yashirishi kerak.
 */
export function useMainButton({ text, onClick, visible = true, disabled = false, loading = false }: MainButtonOptions): boolean {
  const isTelegram = useIsTelegram();
  const suspended = useSyncExternalStore(subscribeSuspend, () => mainButtonSuspendCount > 0, () => false);
  const shown = visible && !suspended;
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onClickRef.current = onClick;
  });

  useEffect(() => {
    const button = getTelegramWebApp()?.MainButton;
    if (!button) return;
    const handler = () => onClickRef.current();
    button.onClick(handler);
    return () => {
      button.offClick(handler);
      button.hideProgress();
      button.hide();
    };
  }, []);

  useEffect(() => {
    const button = getTelegramWebApp()?.MainButton;
    if (!button) return;
    if (!shown) {
      button.hide();
      return;
    }
    button.setParams({ text, is_active: !disabled && !loading, is_visible: true });
    if (loading) button.showProgress(false);
    else button.hideProgress();
  }, [text, shown, disabled, loading]);

  return isTelegram && visible;
}
