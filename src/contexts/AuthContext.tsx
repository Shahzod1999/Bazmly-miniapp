"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PhoneCheckResult, PhoneLogin, PhoneRegister, UserProfileUpdate, UserRead } from "@/lib/api/types";
import { authService, userService, getAccessToken, getRefreshToken, clearTokens, isApiError } from "@/lib/api";
import { getTelegramWebApp } from "@/lib/telegram";

interface AuthContextType {
  /** Joriy foydalanuvchi (yagona haqiqat manbai) */
  user: UserRead | null;
  /** Sessiya tekshirilmoqda */
  loading: boolean;
  isAuthenticated: boolean;
  /** Telegram orqali avtomatik kirish xato bilan tugadi */
  telegramError: string | null;
  checkPhone: (phone: string) => Promise<PhoneCheckResult>;
  login: (data: PhoneLogin) => Promise<UserRead>;
  register: (data: PhoneRegister) => Promise<UserRead>;
  /** Telegram initData orqali qayta kirish */
  loginWithTelegram: () => Promise<UserRead>;
  shareTelegramContact: (contactData: string) => Promise<UserRead>;
  completeProfile: (data: UserProfileUpdate) => Promise<UserRead>;
  updateProfile: (data: UserProfileUpdate) => Promise<UserRead>;
  refreshUser: () => Promise<UserRead | null>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Avvalgi versiyalar localStorage'da saqlagan, endi ishlatilmaydigan kalitlar
const LEGACY_KEYS = [
  "isRegistered",
  "fullName",
  "phone",
  "userRole",
  "venueHours",
  "my_local_bookings",
  "my_booking_tokens",
];

function cleanupLegacyStorage() {
  try {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage mavjud bo'lmasa (masalan, maxfiy rejim) — tozalash shart emas
  }
}

interface SessionResult {
  user: UserRead | null;
  telegramError: string | null;
}

/** Ilova ochilganda sessiyani tiklaydi: saqlangan token yoki Telegram initData orqali. */
async function restoreSession(): Promise<SessionResult> {
  if (getAccessToken()) {
    try {
      return { user: await userService.getMe(), telegramError: null };
    } catch (err) {
      if (isApiError(err) && (err.status === 401 || err.status === 403)) {
        clearTokens();
      } else {
        // Tarmoq xatosi: token saqlanadi, foydalanuvchi qayta urinishi mumkin
        return { user: null, telegramError: null };
      }
    }
  }

  const webApp = getTelegramWebApp();
  if (webApp) {
    try {
      await authService.loginTelegram(webApp.initData);
      return { user: await userService.getMe(), telegramError: null };
    } catch (err) {
      clearTokens();
      return {
        user: null,
        telegramError: err instanceof Error ? err.message : "Telegram orqali kirib bo'lmadi",
      };
    }
  }

  return { user: null, telegramError: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    cleanupLegacyStorage();
    restoreSession().then((result) => {
      if (!alive) return;
      setUser(result.user);
      setTelegramError(result.telegramError);
      setLoading(false);
    });

    const handleLogoutEvent = () => setUser(null);
    window.addEventListener("auth:logout", handleLogoutEvent);
    return () => {
      alive = false;
      window.removeEventListener("auth:logout", handleLogoutEvent);
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return null;
    }
    const profile = await userService.getMe();
    setUser(profile);
    return profile;
  }, []);

  const checkPhone = useCallback((phone: string) => authService.checkPhone(phone), []);

  const login = useCallback(async (data: PhoneLogin) => {
    await authService.login(data);
    const profile = await userService.getMe();
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(async (data: PhoneRegister) => {
    await authService.register(data);
    const profile = await userService.getMe();
    setUser(profile);
    return profile;
  }, []);

  const loginWithTelegram = useCallback(async () => {
    const webApp = getTelegramWebApp();
    if (!webApp) throw new Error("Ilova Telegram ichida ochilmagan");
    await authService.loginTelegram(webApp.initData);
    const profile = await userService.getMe();
    setUser(profile);
    setTelegramError(null);
    return profile;
  }, []);

  const shareTelegramContact = useCallback(async (contactData: string) => {
    const profile = await authService.shareTelegramContact(contactData);
    setUser(profile);
    return profile;
  }, []);

  const completeProfile = useCallback(async (data: UserProfileUpdate) => {
    const profile = await authService.completeProfile(data);
    setUser(profile);
    return profile;
  }, []);

  const updateProfile = useCallback(async (data: UserProfileUpdate) => {
    const profile = await userService.updateMe(data);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) await authService.logout(refresh);
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    // Xato bo'lsa chaqiruvchi xabar ko'rsatadi; akkaunt o'chirilmagan bo'lsa sessiya saqlanadi
    await userService.deleteMe();
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        telegramError,
        checkPhone,
        login,
        register,
        loginWithTelegram,
        shareTelegramContact,
        completeProfile,
        updateProfile,
        refreshUser,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/** Foydalanuvchining to'liq ismi */
export function fullNameOf(user: UserRead | null): string {
  if (!user) return "";
  return `${user.first_name || ""} ${user.last_name || ""}`.trim();
}
