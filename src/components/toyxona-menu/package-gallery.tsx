"use client";

import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CircleCheck, X } from "lucide-react";
import type { MenuPackage } from "@/data/toyxona-menu";
import { hapticSelection } from "@/lib/telegram";

interface PackageGalleryProps {
  pkg: MenuPackage;
  initialIndex?: number;
  onClose: () => void;
  onSelectPackage: () => void;
}

export default function PackageGallery({
  pkg,
  initialIndex = 0,
  onClose,
  onSelectPackage,
}: PackageGalleryProps) {
  const [index, setIndex] = useState(initialIndex);
  const [activeSpot, setActiveSpot] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const photos = pkg.photos;
  const photo = photos[index];
  const spots = photo.spots ?? [];

  const goTo = (next: number) => {
    if (next < 0 || next >= photos.length || next === index) return;
    setIndex(next);
    setActiveSpot(null);
    hapticSelection();
  };

  const toggleSpot = (n: number) => {
    setActiveSpot((prev) => (prev === n ? null : n));
    hapticSelection();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    goTo(delta < 0 ? index + 1 : index - 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${pkg.name} paketi rasmlari`}
      className="fixed inset-0 z-[90] max-w-md mx-auto flex flex-col bg-[#110D0B] text-[#F5F1EE] animate-fade-in"
    >
      {/* Yuqori panel */}
      <div className="shrink-0 h-14 px-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Galereyani yopish"
          className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h2 className="text-[17px] leading-[22px] font-bold text-white">{pkg.name} paketi</h2>
          <p className="text-xs font-medium text-[#B3A79F]">
            {index + 1} / {photos.length} rasm
          </p>
        </div>
        <div className="w-11" aria-hidden="true" />
      </div>

      {/* Rasm va raqamli belgilar */}
      <div
        className="relative shrink-0 w-full aspect-[10/7] bg-black mt-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img src={photo.src} alt={photo.caption} className="absolute inset-0 w-full h-full object-cover" />

        {spots.map((spot, i) => {
          const n = i + 1;
          const isActive = activeSpot === n;
          return (
            <div key={n} className="absolute w-0 h-0" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
              <button
                type="button"
                onClick={() => toggleSpot(n)}
                aria-pressed={isActive}
                aria-label={`${n} — ${spot.label}`}
                className="absolute -left-[22px] -top-[22px] w-11 h-11 flex items-center justify-center cursor-pointer"
              >
                <span
                  className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] font-extrabold shadow-[0_2px_8px_rgba(0,0,0,0.45)] ${
                    isActive
                      ? "bg-[#1C1410] text-white ring-[3px] ring-[#FF5A00]"
                      : "bg-white text-[#1C1410]"
                  }`}
                >
                  {n}
                </span>
              </button>
              {isActive && (
                <span className="pointer-events-none absolute left-0 bottom-[22px] -translate-x-1/2 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-white text-[#1C1410] text-[13px] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
                  {spot.label}
                </span>
              )}
            </div>
          );
        })}

        {index > 0 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Oldingi rasm"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#110D0B]/60 text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Keyingi rasm"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#110D0B]/60 text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Izoh, taomlar ro'yxati, kichik rasmlar */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <p className="text-[15px] leading-[22px] font-bold text-white">{photo.caption}</p>

        {spots.length > 0 ? (
          <>
            <p className="mt-0.5 mb-3 text-xs font-medium text-[#B3A79F]">
              Raqamni bosing — taom nomi rasmda ko&apos;rinadi
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {spots.map((spot, i) => {
                const n = i + 1;
                const isActive = activeSpot === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleSpot(n)}
                    aria-pressed={isActive}
                    className={`h-10 px-2 rounded-[10px] flex items-center gap-2 text-left text-[13px] cursor-pointer transition-colors ${
                      isActive ? "bg-white text-[#1C1410] font-bold" : "bg-white/[0.06] text-[#F5F1EE] font-medium"
                    }`}
                  >
                    <span
                      className={`w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                        isActive ? "bg-[#1C1410] text-white" : "border-[1.5px] border-white/55"
                      }`}
                    >
                      {n}
                    </span>
                    <span className="min-w-0 truncate">{spot.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          photo.note && <p className="mt-1 text-[13px] leading-[18px] text-[#B3A79F]">{photo.note}</p>
        )}

        <div className="flex gap-2 mt-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((thumb, i) => (
            <button
              key={`${thumb.src}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}-rasm`}
              aria-current={i === index}
              className={`relative w-14 h-14 shrink-0 rounded-[10px] overflow-hidden bg-[#2A2522] cursor-pointer ${
                i === index ? "outline-2 outline-solid outline-[#FF5A00] -outline-offset-2" : ""
              }`}
            >
              <img
                src={thumb.src}
                alt=""
                loading="lazy"
                className={`w-full h-full object-cover ${i === index ? "" : "opacity-55"}`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Pastki panel */}
      <div className="shrink-0 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
        <div className="flex items-center justify-center gap-1.5 mb-2.5 text-xs font-medium text-[#B3A79F]">
          <CircleCheck className="w-3.5 h-3.5 text-[#3FC495]" />
          <span>Haqiqiy foto · to&apos;yxonaning o&apos;zi yuklagan</span>
        </div>
        <button
          type="button"
          onClick={onSelectPackage}
          className="w-full h-14 rounded-2xl bg-[#FF5A00] hover:bg-[#E05000] text-white text-base font-bold active:scale-[0.99] transition-all cursor-pointer"
        >
          {pkg.name} paketini tanlash
        </button>
      </div>
    </div>
  );
}
