"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Search } from "lucide-react";
import { comingSoon } from "@/components/app-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhone } from "@/lib/format";
import { hapticNotify, hapticSelection, openExternalLink, requestTelegramContact, useIsTelegram } from "@/lib/telegram";
import { errorMessage } from "@/lib/use-api";

/*
 * Birinchi ochilish oqimi (Figma bo'yicha):
 * logo → tanishtiruv → til tanlash → Telegram orqali kirish → (kerak bo'lsa) telefon raqamini Telegram'dan ulashish.
 * Kirish faqat Telegram orqali; telefon raqami Telegram kontaktidan olinadi, SMS-kod kerak emas.
 */

export const ONBOARDED_KEY = "bazmly-onboarded";
const LANG_KEY = "bazmly-lang";
const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || "";

type Step = "logo" | "intro" | "language" | "auth";

const LANGUAGES = [
  { code: "uz", name: "O‘zbekcha", flag: "/icons/uzb.webp" },
  { code: "ru", name: "Русский", flag: "/icons/ru.webp" },
  { code: "en", name: "English", flag: "/icons/eng.webp" },
];

function readFlag(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Saqlab bo'lmasa, oqim keyingi ochilishda qayta ko'rsatiladi
  }
}

export function OnboardingFlow({ onboarded, onFinishIntro }: { onboarded: boolean; onFinishIntro: () => void }) {
  const [step, setStep] = useState<Step>(onboarded ? "auth" : "logo");

  // Logo ekrani qisqa ko'rinib, tanishtiruvga o'tadi
  useEffect(() => {
    if (step !== "logo") return;
    const timer = setTimeout(() => setStep("intro"), 3200); // splash (1.8 s) tugagach ~1.4 s ko'rinadi
    return () => clearTimeout(timer);
  }, [step]);

  if (step === "logo") return <LogoScreen />;
  if (step === "intro") return <IntroScreen onNext={() => setStep("language")} />;
  if (step === "language")
    return (
      <LanguageScreen
        onNext={() => {
          writeFlag(ONBOARDED_KEY, "1");
          onFinishIntro();
          setStep("auth");
        }}
      />
    );
  return <AuthScreen />;
}

function LogoScreen() {
  return (
    <div className="fixed inset-0 z-[60] max-w-md mx-auto bg-white flex items-center justify-center animate-fade-in">
      <Image src="/logo.webp" alt="Bazmly" width={289} height={71} priority className="w-[72%] h-auto" />
    </div>
  );
}

function IntroScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] max-w-md mx-auto bg-black text-white flex flex-col overflow-hidden">
      <Image src="/images/topo-bg.webp" alt="" fill sizes="448px" className="object-cover opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="relative w-full aspect-[786/725] shrink-0">
        <Image src="/images/onboarding.webp" alt="" fill priority sizes="448px" className="object-cover" />
      </div>
      <div className="relative flex-1 flex flex-col justify-between px-5 pt-8 pb-[calc(var(--tg-safe-bottom)+24px)]">
        <div>
          <h1 className="text-[40px] leading-[1.1] font-extrabold tracking-tight">Bazmlarni oson rejalashtiring</h1>
          <p className="mt-4 text-lg leading-snug text-white/75">
            Qidiruv va oson band qilish uchun ilovadan to‘liq ro‘yxatdan o‘ting
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticSelection();
            onNext();
          }}
          className="mt-8 w-full h-14 rounded-full bg-[#E85102] hover:bg-[#D44607] text-white text-lg font-bold active:scale-[0.99] transition-all"
        >
          Ro‘yxatdan o‘tish
        </button>
      </div>
    </div>
  );
}

/** Figma bo'yicha til ro'yxati: qidiruv va 3 ta til (onboarding va profil uchun umumiy) */
export function LanguageList({ selected, onSelect }: { selected: string; onSelect: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const list = LANGUAGES.filter((l) => l.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
      <label className="flex items-center gap-3 px-4 h-14 border-b border-zinc-200 dark:border-white/10">
        <Search className="w-6 h-6 text-zinc-900 dark:text-white shrink-0" aria-hidden="true" />
        <span className="sr-only">Tilni qidirish</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Qidirish"
          className="flex-1 bg-transparent text-lg outline-none placeholder:text-zinc-400"
        />
      </label>

      <div role="radiogroup" aria-label="Til" className="p-2 space-y-1">
        {list.map((lang) => {
          const active = lang.code === selected;
          return (
            <button
              key={lang.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                onSelect(lang.code);
                hapticSelection();
              }}
              className={`w-full flex items-center gap-3 px-3 h-14 rounded-2xl text-left transition-colors ${
                active ? "bg-[#FBF5EA] dark:bg-[#E85102]/15" : "hover:bg-zinc-50 dark:hover:bg-white/5"
              }`}
            >
              <Image src={lang.flag} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" />
              <span className="flex-1 text-lg">{lang.name}</span>
              <span
                aria-hidden="true"
                className={`w-6 h-6 rounded-full flex items-center justify-center ${active ? "bg-[#E85102] text-white" : "border border-zinc-200 dark:border-white/20"}`}
              >
                {active && <Check className="w-4 h-4 stroke-[3]" />}
              </span>
            </button>
          );
        })}
        {list.length === 0 && <p className="px-3 py-4 text-sm text-zinc-500">Hech narsa topilmadi</p>}
      </div>
    </div>
  );
}

/** Tanlangan tilni saqlash. Hozircha ilova faqat o'zbek tilida — boshqalari "Tez orada". */
export function applyLanguage(code: string): boolean {
  if (code !== "uz") {
    comingSoon("Bu til");
    return false;
  }
  writeFlag(LANG_KEY, code);
  return true;
}

export function savedLanguage(): string {
  return readFlag(LANG_KEY) || "uz";
}

function LanguageScreen({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState(savedLanguage);

  return (
    <div className="fixed inset-0 z-[60] max-w-md mx-auto bg-white text-zinc-900 flex flex-col px-4 pt-[calc(var(--tg-safe-top)+24px)] pb-[calc(var(--tg-safe-bottom)+24px)]">
      <h1 className="text-2xl font-bold tracking-tight">Tizim tilini tanlang</h1>
      <div className="mt-5">
        <LanguageList selected={selected} onSelect={setSelected} />
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => applyLanguage(selected) && onNext()}
        className="w-full h-14 rounded-full bg-[#E85102] hover:bg-[#D44607] text-white text-lg font-semibold active:scale-[0.99] transition-all"
      >
        Davom etish
      </button>
    </div>
  );
}

/** Telegram orqali kirish va telefon raqamini Telegram kontaktidan olish */
function AuthScreen() {
  const { user, loading, telegramError, loginWithTelegram, shareTelegramContact, completeProfile } = useAuth();
  const isTelegram = useIsTelegram();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      hapticNotify("success");
    } catch (err) {
      hapticNotify("error");
      setError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] max-w-md mx-auto bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85102]" aria-label="Yuklanmoqda" />
      </div>
    );
  }

  // Telegram tashqarisida — kirish imkoni yo'q
  if (!isTelegram && !user) {
    return (
      <ScreenShell title="Telegram orqali kiring" subtitle="Bazmly Telegram ilovasi ichida ishlaydi. Kirish uchun ilovani Telegram'da oching.">
        {BOT_URL && (
          <PrimaryButton onClick={() => openExternalLink(BOT_URL)} disabled={false}>
            Telegram&apos;da ochish
          </PrimaryButton>
        )}
      </ScreenShell>
    );
  }

  // Telegram ichida, lekin kirish amalga oshmadi
  if (!user) {
    return (
      <ScreenShell title="Telegram orqali kirish" subtitle="Bron qilish uchun Telegram akkauntingiz bilan kiring.">
        {(error || telegramError) && <ErrorText>{error || telegramError}</ErrorText>}
        <PrimaryButton disabled={busy} onClick={() => run(loginWithTelegram, "Telegram orqali kirib bo'lmadi")}>
          {busy ? "Kirilmoqda..." : "Telegram orqali kirish"}
        </PrimaryButton>
      </ScreenShell>
    );
  }

  const needsName = !user.first_name;
  const needsPhone = !user.phone;

  const sharePhone = async () => {
    const contact = await requestTelegramContact();
    if (!contact) throw new Error("Telefon raqami ulashilmadi. Bron qilish uchun raqam kerak.");
    await shareTelegramContact(contact);
  };

  // "Akkaunt yaratish": ism (kerak bo'lsa) va telefon raqami Telegram'dan
  return (
    <ScreenShell title="Akkaunt yaratish" subtitle="Muassasa bron bo‘yicha siz bilan bog‘lanishi uchun telefon raqamingiz kerak.">
      {needsName && (
        <label className="block">
          <span className="sr-only">Ismingiz</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ismingiz"
            className="w-full h-14 px-4 rounded-2xl border border-zinc-200 bg-zinc-50 text-lg outline-none focus:border-[#E85102]"
          />
        </label>
      )}
      <div className="flex gap-2">
        <div className="h-14 px-4 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center gap-2 shrink-0">
          <Image src="/icons/uzb.webp" alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
          <span className="text-lg">+998</span>
        </div>
        <div className="flex-1 h-14 px-4 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center text-lg">
          {user.phone ? <span>{formatPhone(user.phone).replace(/^\+998\s?/, "")}</span> : <span className="text-zinc-400">Telefon raqami</span>}
        </div>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex-1" />
      <PrimaryButton
        disabled={busy || (needsName && !firstName.trim())}
        onClick={() =>
          run(async () => {
            if (needsName) await completeProfile({ first_name: firstName.trim() });
            if (needsPhone) await sharePhone();
          }, "Akkaunt yaratib bo'lmadi")
        }
      >
        {busy ? "Kuting..." : needsPhone ? "Telegram raqamini ulashish" : "Davom etish"}
      </PrimaryButton>
    </ScreenShell>
  );
}

function ScreenShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] max-w-md mx-auto bg-white text-zinc-900 flex flex-col gap-4 px-4 pt-[calc(var(--tg-safe-top)+24px)] pb-[calc(var(--tg-safe-bottom)+24px)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-base text-zinc-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-auto w-full h-14 rounded-full bg-[#E85102] hover:bg-[#D44607] text-white text-lg font-semibold active:scale-[0.99] transition-all disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-sm font-semibold text-red-600">
      {children}
    </p>
  );
}
