"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, ImageOff, Map, MapPin, Star } from "lucide-react";
import type { VenueListItem } from "@/lib/api";
import { formatDistance, formatRating, formatSom } from "@/lib/format";

/* Bosh sahifadagi muassasa kartalari: dizayn avvalgidek, barcha qiymatlar API'dan. */

interface CardProps {
  venue: VenueListItem;
  isToyxona: boolean;
  dark: boolean;
}

function venueLink(venue: VenueListItem, isToyxona: boolean) {
  return isToyxona ? `/toyxona/${venue.id}` : `/venue/${venue.id}`;
}

function Cover({ venue, rounded, hoverScale }: { venue: VenueListItem; rounded: string; hoverScale: string }) {
  if (!venue.cover_url) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-white/5 text-zinc-400 ${rounded}`}>
        <ImageOff className="h-8 w-8" aria-hidden="true" />
      </div>
    );
  }
  return (
    <Image
      src={venue.cover_url}
      alt={venue.name}
      fill
      unoptimized
      sizes="(max-width: 448px) 100vw, 448px"
      className={`object-cover transition-transform duration-500 ${hoverScale}`}
    />
  );
}

function StatusRow({ venue, small }: { venue: VenueListItem; small?: boolean }) {
  const open = venue.is_open_now;
  return (
    <div className={`flex items-center gap-1.5 ${small ? "text-xs" : "text-sm"} font-semibold ${open ? "text-[#16A34A] dark:text-[#22C55E]" : "text-zinc-500 dark:text-zinc-400"}`}>
      <span className={`${small ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full ${open ? "bg-[#16A34A] dark:bg-[#22C55E]" : "bg-zinc-400"}`} />
      <span>{open ? "Ochiq" : "Yopiq"}</span>
    </div>
  );
}

function DiscountBadge({ venue }: { venue: VenueListItem }) {
  const discount = Number(venue.discount_percent || 0);
  if (discount <= 0) return null;
  return (
    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16A34A] text-white text-xs font-bold shadow-md">
      <span className="w-3.5 h-3.5 rounded border border-white flex items-center justify-center text-xs leading-none font-black">%</span>
      <span>{Math.round(discount)}% chegirma</span>
    </div>
  );
}

/** Ro'yxatdagi birinchi (katta) karta */
export function FeaturedVenueCard({ venue, isToyxona, dark }: CardProps) {
  const rating = formatRating(venue.rating_avg);
  const distance = formatDistance(venue.distance_m);
  const price = venue.base_price ? formatSom(venue.base_price) : null;

  return (
    <Link
        href={venueLink(venue, isToyxona)}
        className={`w-full border rounded-[28px] p-4 flex flex-col gap-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all block text-left group cursor-pointer ${
          dark ? "bg-[#252525] border-white/5 hover:border-white/10" : "bg-white border-zinc-100 hover:border-zinc-200"
        }`}
      >
        <div className={`w-full ${isToyxona ? "h-52 sm:h-56" : "h-48 sm:h-52"} rounded-2xl overflow-hidden relative`}>
          <Cover venue={venue} rounded="rounded-2xl" hoverScale="group-hover:scale-105" />
          <DiscountBadge venue={venue} />
        </div>

        <div className={isToyxona ? "space-y-2.5" : "space-y-2"}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={`${isToyxona ? "text-[18px]" : "text-[17px] sm:text-lg"} font-bold tracking-tight truncate ${dark ? "text-white" : "text-zinc-900"}`}>
              {venue.name}
            </h3>
            {rating && (
              <div className="flex items-center gap-1.5 text-sm shrink-0">
                <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                <span className={`font-semibold ${dark ? "text-white" : "text-zinc-900"}`}>{rating}</span>
                <span className={dark ? "text-zinc-400" : "text-zinc-500"}>({venue.reviews_count} ta sharh)</span>
              </div>
            )}
          </div>

          <StatusRow venue={venue} />

          {(distance || venue.requires_deposit) && (
            <div className="flex items-center gap-2.5 flex-wrap">
              {distance && (
                <div className={`flex items-center gap-1.5 text-sm font-normal ${dark ? "text-zinc-300" : "text-zinc-600"}`}>
                  <Map className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{distance} uzoqda</span>
                </div>
              )}
              {distance && venue.requires_deposit && <span className="text-zinc-300 dark:text-zinc-600 select-none">|</span>}
              {venue.requires_deposit && (
                <div className="inline-flex items-center gap-1.5 bg-[#22C55E] text-white px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs">
                  <div className="w-3.5 h-3.5 rounded-[4px] border-[1.2px] border-white flex items-center justify-center text-xs font-bold leading-none shrink-0">%</div>
                  <span>Depozitlik</span>
                </div>
              )}
            </div>
          )}

          {venue.tagline && (
            <div className={`flex items-center gap-1.5 text-sm font-normal truncate ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
              <MapPin className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span className="truncate">{venue.tagline}</span>
            </div>
          )}

          {isToyxona && (
            <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3">
              <div>
                {price && (
                  <>
                    <span className="text-xs text-zinc-400 block font-medium">Narx (1 kishi):</span>
                    <span className="text-base font-extrabold text-[#FF6B00]">{price}</span>
                  </>
                )}
              </div>
              <div className="py-2.5 px-5 rounded-full bg-[#FF6B00] hover:bg-[#E05000] text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-[#FF6B00]/25">
                <span>Band qilish</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          )}
        </div>
    </Link>
  );
}

/** 2x2 to'rdagi kichik karta */
export function GridVenueCard({ venue, isToyxona, dark }: CardProps) {
  const rating = formatRating(venue.rating_avg);
  const distance = formatDistance(venue.distance_m);

  return (
    <Link
        href={venueLink(venue, isToyxona)}
        className={`border rounded-[24px] p-3 flex flex-col gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-left relative group transition-all cursor-pointer ${
          dark ? "bg-[#252525] border-white/5 shadow-lg" : "bg-white border-zinc-100"
        }`}
      >
        <div className="w-full aspect-square rounded-[18px] overflow-hidden relative">
          <Cover venue={venue} rounded="rounded-[18px]" hoverScale="group-hover:scale-105" />
        </div>

        <div className="space-y-1.5 pr-0.5">
          <div className="flex items-center justify-between gap-1">
            <h4 className={`text-sm sm:text-[15px] font-bold tracking-tight truncate ${dark ? "text-white" : "text-zinc-900"}`}>{venue.name}</h4>
            {rating && (
              <div className="flex items-center gap-1 text-xs sm:text-sm font-bold shrink-0">
                <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                <span className={dark ? "text-white" : "text-zinc-900"}>{rating}</span>
              </div>
            )}
          </div>

          <StatusRow venue={venue} small />

          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium min-h-5">
            <div className="flex items-center gap-1 truncate">
              {distance && (
                <>
                  <Map className="h-3 w-3 shrink-0" />
                  <span>{distance}</span>
                </>
              )}
            </div>
            {isToyxona
              ? venue.base_price && <span className="font-bold text-xs text-zinc-900 dark:text-white shrink-0 ml-1">{formatSom(venue.base_price)}</span>
              : venue.requires_deposit && (
                  <div className="inline-flex items-center gap-1 bg-[#22C55E] text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                    <span>%</span>
                    <span>Depozit</span>
                  </div>
                )}
          </div>

          <div className="w-full py-2 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-95 transition-all shadow-sm shadow-[#FF6B00]/20 mt-1">
            <span>{isToyxona ? "Band qilish" : "Ko'rish"}</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5] text-white" />
          </div>
        </div>
    </Link>
  );
}
