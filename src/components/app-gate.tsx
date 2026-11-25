"use client";

import React, { useSyncExternalStore } from "react";
import { OnboardingFlow, ONBOARDED_KEY } from "@/components/onboarding/onboarding-flow";
import { useAuth } from "@/contexts/AuthContext";

// "Tanishtiruv ko'rilgan" belgisi (localStorage) — hydration xavfsiz o'qish
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}
function markOnboarded() {
  listeners.forEach((l) => l());
}

/**
 * Ilovaga kirish darvozasi: birinchi ochilishda logo, tanishtiruv va til,
 * so'ng faqat Telegram orqali kirish va telefon raqami. Hammasi tayyor bo'lsa — ilova.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const onboarded = useSyncExternalStore(subscribe, readOnboarded, () => false);

  // Sessiya tekshirilayotganda splash ekrani ko'rinib turadi
  if (loading && onboarded) return null;

  const ready = onboarded && !!user && !!user.first_name && !!user.phone && user.status !== "pending_profile";
  if (ready) return <>{children}</>;

  return <OnboardingFlow key={onboarded ? "auth" : "intro"} onboarded={onboarded} onFinishIntro={markOnboarded} />;
}
