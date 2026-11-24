"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, ChevronLeft, Columns3, Minus, Plus } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import ToyxonaFlowModal from "@/components/toyxona-flow-modal";
import PackageCard from "@/components/toyxona-menu/package-card";
import PackageGallery from "@/components/toyxona-menu/package-gallery";
import PackageCompareSheet from "@/components/toyxona-menu/package-compare-sheet";
import {
  GUEST_STEP,
  MAX_GUESTS,
  TOYXONA_MENU_PACKAGES,
  formatSom,
} from "@/data/toyxona-menu";
import { hapticImpact, hapticSelection, useTelegramBackButton } from "@/lib/telegram";

// Hozircha to'yxona ma'lumoti detal sahifasidagi kabi statik.
const VENUE_NAME = "The Royal Grand";

export default function ToyxonaMenuPage() {
  const router = useRouter();
  const { theme } = useTheme();

  const packages = TOYXONA_MENU_PACKAGES;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guests, setGuests] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(packages[0]?.id ?? null);
  const [gallery, setGallery] = useState<{ packageId: string; index: number } | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const selectedPkg = packages.find((p) => p.id === selectedId) ?? null;
  const galleryPkg = gallery ? packages.find((p) => p.id === gallery.packageId) ?? null : null;
  const belowMinimum = !!selectedPkg && guests > 0 && guests < selectedPkg.minGuests;
  const canBook = !!selectedPkg && guests > 0 && !belowMinimum;

  // Telegram "Orqaga": avval ochiq oynani yopadi, keyin sahifadan chiqadi
  const handleBack = () => {
    if (gallery) setGallery(null);
    else if (compareOpen) setCompareOpen(false);
    else router.back();
  };
  useTelegramBackButton(handleBack);

  const clampGuests = (value: number) => Math.max(0, Math.min(MAX_GUESTS, value));

  const changeGuests = (delta: number) => {
    setGuests((prev) => {
      // Bo'sh maydonda "+" bosilsa, tanlangan paketning minimal soni qo'yiladi
      if (prev === 0) return delta > 0 ? selectedPkg?.minGuests ?? 150 : 0;
      return clampGuests(prev + delta);
    });
    hapticSelection();
  };

  const selectPackage = (packageId: string, { toggle = true } = {}) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;
    setSelectedId((prev) => (toggle && prev === packageId ? null : packageId));
    setGuests((prev) => (prev > 0 ? prev : pkg.minGuests));
    hapticImpact("light");
  };

  let guestsHint = "Jami summa avtomatik hisoblanadi";
  if (selectedPkg) {
    guestsHint = belowMinimum
      ? `${selectedPkg.name} uchun kamida ${selectedPkg.minGuests} mehmon kerak`
      : `${selectedPkg.name} uchun kamida ${selectedPkg.minGuests} kishi`;
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#F7F5F3] dark:bg-[#1E1E1E] text-zinc-900 dark:text-white select-none">
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[95] px-4 py-2.5 rounded-2xl bg-zinc-900/90 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/10 backdrop-blur-md animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#1E1E1E] border-b border-zinc-100 dark:border-white/5">
        <div className="h-14 px-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Orqaga"
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-[17px] leading-[22px] font-bold">Menyu paketlari</h1>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">{VENUE_NAME}</p>
          </div>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            aria-label="Paketlarni solishtirish"
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            <Columns3 className="w-[22px] h-[22px]" />
          </button>
        </div>
      </header>

      <main className={`flex-1 px-4 pt-4 ${selectedPkg ? "pb-32" : "pb-8"}`}>
        {/* Mehmonlar soni */}
        <section
          aria-label="Mehmonlar soni"
          className="flex items-center gap-3 py-3 pl-4 pr-3 rounded-2xl bg-white dark:bg-[#252528] shadow-[0_2px_12px_rgba(28,20,16,0.06)]"
        >
          <div className="flex-1 min-w-0">
            <label htmlFor="guest-count" className="block text-[15px] leading-5 font-bold">
              Mehmonlar soni
            </label>
            <p
              role={belowMinimum ? "alert" : undefined}
              className={`text-xs leading-4 ${
                belowMinimum ? "font-semibold text-[#C62828] dark:text-[#FF6B6B]" : "font-medium text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {guestsHint}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeGuests(-GUEST_STEP)}
              aria-label={`${GUEST_STEP} kishiga kamaytirish`}
              className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              <Minus className="w-[18px] h-[18px] stroke-[2.5]" />
            </button>
            <input
              id="guest-count"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_GUESTS}
              step={GUEST_STEP}
              placeholder="300"
              value={guests > 0 ? guests : ""}
              onChange={(e) => setGuests(clampGuests(parseInt(e.target.value, 10) || 0))}
              className="w-[68px] h-11 rounded-xl border-[1.5px] border-zinc-200 dark:border-white/10 bg-white dark:bg-transparent text-center text-[17px] font-bold outline-none focus:border-[#FF5A00] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => changeGuests(GUEST_STEP)}
              aria-label={`${GUEST_STEP} kishiga ko'paytirish`}
              className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-[18px] h-[18px] stroke-[2.5]" />
            </button>
          </div>
        </section>

        {/* Ro'yxat sarlavhasi */}
        <div className="flex items-center justify-between gap-3 mt-5 mb-2">
          <div>
            <h2 className="text-[17px] leading-6 font-bold">{packages.length} ta paket</h2>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Narxlar 1 kishi uchun, xizmat haqi bilan</p>
          </div>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="shrink-0 h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#252528] flex items-center gap-1.5 text-sm font-semibold active:scale-95 transition-all cursor-pointer"
          >
            <Columns3 className="w-[18px] h-[18px]" />
            Solishtirish
          </button>
        </div>

        <div className="space-y-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              guests={guests}
              selected={selectedId === pkg.id}
              expanded={expandedId === pkg.id}
              onSelect={() => selectPackage(pkg.id)}
              onToggleItems={() => setExpandedId((prev) => (prev === pkg.id ? null : pkg.id))}
              onOpenPhoto={(index) => setGallery({ packageId: pkg.id, index })}
            />
          ))}
        </div>
      </main>

      {/* Pastki "Bron qilish" paneli */}
      {selectedPkg && !gallery && !compareOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 max-w-md mx-auto">
          <div className="flex items-center gap-3 px-4 pt-3.5 pb-[max(env(safe-area-inset-bottom),20px)] rounded-t-3xl bg-white dark:bg-[#252528] shadow-[0_-4px_24px_rgba(28,20,16,0.10)]">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                {selectedPkg.name}
                {guests > 0 ? ` · ${guests} mehmon × ${formatSom(selectedPkg.pricePerGuest)}` : ""}
              </p>
              <p aria-live="polite" className="text-[17px] leading-6 font-extrabold truncate">
                {guests > 0 ? formatSom(selectedPkg.pricePerGuest * guests) : "Mehmonlar sonini kiriting"}
              </p>
            </div>
            <button
              type="button"
              disabled={!canBook}
              onClick={() => {
                hapticImpact("medium");
                setBookingOpen(true);
              }}
              className="shrink-0 h-14 px-5 rounded-2xl bg-[#FF5A00] hover:bg-[#E05000] disabled:bg-[#FFD6BF] dark:disabled:bg-[#382218] disabled:cursor-not-allowed text-white text-base font-bold flex items-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              Bron qilish
              <ArrowRight className="w-[18px] h-[18px] stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {compareOpen && (
        <PackageCompareSheet
          packages={packages}
          onClose={() => setCompareOpen(false)}
          onOpenGallery={(packageId) => {
            setCompareOpen(false);
            setGallery({ packageId, index: 0 });
          }}
          onSelectPackage={(packageId) => {
            selectPackage(packageId, { toggle: false });
            setCompareOpen(false);
          }}
        />
      )}

      {galleryPkg && gallery && (
        <PackageGallery
          key={`${gallery.packageId}-${gallery.index}`}
          pkg={galleryPkg}
          initialIndex={gallery.index}
          onClose={() => setGallery(null)}
          onSelectPackage={() => {
            selectPackage(galleryPkg.id, { toggle: false });
            setGallery(null);
          }}
        />
      )}

      {bookingOpen && (
        <ToyxonaFlowModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          initialStep="step1"
          theme={theme}
          onSuccess={() => {
            setBookingOpen(false);
            setToastMessage("To'yxona muvaffaqiyatli band qilindi!");
          }}
        />
      )}
    </div>
  );
}
