"use client";

import Image from "next/image";
import React, { useState } from "react";
import { Check, ChevronDown, Images, Users } from "lucide-react";
import { formatSom } from "@/lib/format";
import type { MenuPackage } from "./types";

interface PackageCardProps {
  pkg: MenuPackage;
  selected: boolean;
  expanded: boolean;
  guests: number;
  onSelect: () => void;
  onToggleItems: () => void;
  onOpenPhoto: (index: number) => void;
}

export default function PackageCard({
  pkg,
  selected,
  expanded,
  guests,
  onSelect,
  onToggleItems,
  onOpenPhoto,
}: PackageCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const itemsId = `package-items-${pkg.id}`;

  const handlePhotoScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (next !== photoIndex) setPhotoIndex(next);
  };

  return (
    <article
      className={`relative rounded-2xl overflow-hidden bg-white dark:bg-[#252528] shadow-[0_2px_12px_rgba(28,20,16,0.06)] transition-shadow ${
        selected ? "ring-2 ring-[#E85102]" : "ring-1 ring-zinc-100 dark:ring-white/5"
      }`}
    >
      {/* Rasm karuseli */}
      <div className="relative h-[200px] bg-zinc-100 dark:bg-white/5">
        <div
          onScroll={handlePhotoScroll}
          className="flex h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pkg.photos.map((photo, idx) => (
            <button
              key={`${photo.src}-${idx}`}
              type="button"
              onClick={() => onOpenPhoto(idx)}
              aria-label={`${pkg.name} paketi — ${idx + 1}-rasmni kattalashtirish`}
              className="relative w-full h-full shrink-0 snap-start cursor-zoom-in"
            >
              <Image src={photo.src} alt={photo.caption} fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" />
            </button>
          ))}
        </div>

        <span className="pointer-events-none absolute left-3 bottom-3 h-[26px] px-2.5 rounded-lg bg-[#1C1410]/70 text-white text-xs font-semibold flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          10 kishilik stol
        </span>
        <span className="pointer-events-none absolute right-3 bottom-3 h-[26px] px-2.5 rounded-lg bg-[#1C1410]/70 text-white text-xs font-semibold flex items-center gap-1.5">
          <Images className="w-3.5 h-3.5" />
          {photoIndex + 1} / {pkg.photos.length}
        </span>
      </div>

      <div className="px-4 pt-4 pb-1">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] leading-6 font-bold text-zinc-900 dark:text-white">{pkg.name}</h3>
              {pkg.popular && (
                <span className="h-5 px-2 inline-flex items-center rounded-md bg-[#FFF2EA] text-[#E85102] dark:bg-[#E85102]/15 dark:text-[#E85102] text-xs font-semibold">
                  Ommabop
                </span>
              )}
            </div>
            <p className="text-[13px] leading-[18px] text-zinc-500 dark:text-zinc-400">{pkg.tagline}</p>
          </div>

          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={`${pkg.name} paketini tanlash`}
            className="w-11 h-11 -mt-2 -mr-2.5 shrink-0 flex items-center justify-center cursor-pointer"
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                selected
                  ? "bg-[#E85102] text-white"
                  : "border-2 border-zinc-300 dark:border-white/25 bg-white dark:bg-transparent"
              }`}
            >
              {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </span>
          </button>
        </div>

        <div className="flex items-baseline gap-1.5 mt-3">
          <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">1 kishi —</span>
          <span className="text-[22px] leading-7 font-extrabold tracking-tight text-[#E85102] dark:text-[#E85102]">
            {formatSom(pkg.pricePerGuest)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1.5 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
          <Users className="w-4 h-4" />
          <span>Kamida {pkg.minGuests} mehmon</span>
          <span aria-hidden="true">·</span>
          <span>{pkg.items.length} band</span>
        </div>

        {guests > 0 && (
          <div className="mt-3 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{guests} mehmon uchun</span>
            <span className="text-[15px] font-extrabold text-zinc-900 dark:text-white whitespace-nowrap">
              {formatSom(pkg.pricePerGuest * guests)}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleItems}
          aria-expanded={expanded}
          aria-controls={itemsId}
          className="mt-3 w-full h-12 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-white cursor-pointer"
        >
          <span>Ichidagi taomlar</span>
          <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && (
          <ul id={itemsId} className="pb-4 space-y-2.5">
            {pkg.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                <Check className="w-[18px] h-[18px] mt-px shrink-0 stroke-[2.5] text-[#0E6F4F] dark:text-[#3FC495]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
