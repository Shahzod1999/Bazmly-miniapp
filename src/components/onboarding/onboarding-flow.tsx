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
      {/* Figma "Onboarding" (2691:4851): fon rasmi va 440px doira ichidagi rasm (Figma'dan eksport) */}
      <Image src="/images/onboarding-bg.png" alt="" fill priority sizes="448px" className="object-cover pointer-events-none" aria-hidden="true" />
      <div className="relative w-full aspect-[393/440] shrink-0 mt-[var(--tg-safe-top)]">
        <Image src="/images/onboarding-hero.png" alt="" fill priority sizes="448px" className="object-cover" />
      </div>
      <div className="relative flex-1 flex flex-col justify-between px-5 pt-[30px] pb-[max(86px,calc(var(--tg-safe-bottom)+52px))]">
        <div>
          <h1 className="text-[46px] leading-[54px] font-extrabold">Bazmlarni oson rejalashtiring</h1>
          <p className="mt-5 text-xl leading-[25px] text-[#C8C8C8]">
            Qidiruv va oson band qilish uchun ilovadan to‘liq ro‘yxatdan o‘ting
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticSelection();
            onNext();
          }}
          className="mt-8 w-full h-14 rounded-[64px] bg-[#E85102] text-white text-xl leading-[22px] font-bold active:scale-[0.99] transition-transform"
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
    <div className="rounded-2xl border border-[#E3E2E2] dark:border-white/10 overflow-hidden">
      <label className="flex items-center gap-2.5 px-4 h-[55px] border-b border-[#E3E2E2] dark:border-white/10">
        <Search className="w-7 h-7 text-[#12110D] dark:text-white shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="sr-only">Tilni qidirish</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Qidirish"
          className="flex-1 min-w-0 bg-transparent text-xl font-medium outline-none text-[#12110D] dark:text-white placeholder:text-[#ACACAB]"
        />
      </label>

      <div role="radiogroup" aria-label="Til" className="pt-2.5 pb-1 px-px">
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
              className={`w-full flex items-center gap-3 px-3 text-left transition-colors ${
                active ? "h-[49px] rounded-[20px] bg-[#FBF7EB] dark:bg-[#E85102]/15" : "h-[61px]"
              }`}
            >
              <Image src={lang.flag} alt="" width={37} height={37} className="w-[37px] h-[37px] rounded-full object-cover shrink-0 bg-white" />
              <span className="flex-1 text-xl font-medium text-[#12110D] dark:text-white">{lang.name}</span>
              <span
                aria-hidden="true"
                className={`w-5 h-5 rounded-[28px] flex items-center justify-center shadow-[0_4px_20px_rgba(18,17,13,0.12)] ${
                  active ? "bg-[#FF6A00] text-white" : "border border-[#E6E6E6] dark:border-white/20"
                }`}
              >
                {active && <Check className="w-3 h-3" strokeWidth={2.5} />}
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
    <div className="fixed inset-0 z-[60] max-w-md mx-auto bg-white text-[#12110D] flex flex-col px-[18px] pt-[calc(var(--tg-safe-top)+16px)] pb-[calc(var(--tg-safe-bottom)+24px)]">
      <h1 className="text-2xl leading-[30px] font-bold text-black">Tizim tilini tanlang</h1>
      <div className="mt-5">
        <LanguageList selected={selected} onSelect={setSelected} />
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => applyLanguage(selected) && onNext()}
        className="w-full h-[55px] rounded-[20px] bg-[#E85102] text-[#FCFCFD] text-2xl font-medium active:scale-[0.99] transition-transform"
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
            className="w-full h-[55px] px-4 rounded-[20px] border border-[#D0D5DD] bg-[#FDFAFE] text-xl font-medium text-[#101828] outline-none placeholder:text-[#98A2B3] focus:border-[#E85102]"
          />
        </label>
      )}
      <div className="flex gap-2.5">
        <div className="w-[121px] h-[55px] px-4 rounded-[20px] border border-[#D0D5DD] bg-[#FDFAFE] flex items-center gap-2.5 shrink-0">
          <Image src="/icons/uzb.webp" alt="" width={29} height={29} className="w-[29px] h-[29px] rounded-full object-cover" />
          <span className="text-xl font-medium text-[#101828]">+998</span>
        </div>
        <div className="flex-1 min-w-0 h-[55px] px-4 rounded-[20px] border border-[#D0D5DD] bg-[#FDFAFE] flex items-center text-xl font-medium">
          {user.phone ? (
            <span className="text-[#101828] truncate">{formatPhone(user.phone).replace(/^\+998\s?/, "")}</span>
          ) : (
            <span className="text-[#98A2B3] truncate">Telefon raqami</span>
          )}
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
    <div className="fixed inset-0 z-[60] max-w-md mx-auto bg-white text-[#101828] flex flex-col gap-5 px-[18px] pt-[calc(var(--tg-safe-top)+20px)] pb-[calc(var(--tg-safe-bottom)+24px)]">
      <div className="mb-[23px]">
        <h1 className="text-xl leading-5 font-bold">{title}</h1>
        <p className="mt-3 text-base text-[#667085]">{subtitle}</p>
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
      className="mt-auto w-full h-[55px] rounded-[20px] bg-[#E85102] text-[#FCFCFD] text-2xl font-medium active:scale-[0.99] transition-transform disabled:opacity-50"
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
