"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, UtensilsCrossed } from "lucide-react";
import { venueService } from "@/lib/api";
import { useTelegramBackButton } from "@/lib/telegram";
import { useApiQuery } from "@/lib/use-api";

/**
 * To'yxona menyu paketlari.
 * Backend'da paketlar endpointi hali yo'q — ekran "Tez orada" holatida.
 * Paket kartasi, galereya va taqqoslash komponentlari `src/components/toyxona-menu/` da tayyor turadi.
 */
export default function ToyxonaMenuPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const venueId = Number(id);
  const detail = useApiQuery(venueId > 0 ? `venue:${venueId}` : null, () => venueService.getVenueDetail(venueId));
  const venueName = detail.state.status === "success" ? detail.state.data.venue.name : "";

  useTelegramBackButton(() => router.back());

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#F7F5F3] dark:bg-[#1E1E1E] text-zinc-900 dark:text-white select-none">
      {/* Header */}
      <header className="sticky top-[var(--tg-safe-top)] z-30 bg-white dark:bg-[#1E1E1E] border-b border-zinc-100 dark:border-white/5">
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
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">{venueName}</p>
          </div>
          <div className="w-11 h-11" />
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-8">
        <section className="flex flex-col items-center text-center gap-3 px-6 py-12 rounded-2xl bg-white dark:bg-[#252528] shadow-[0_2px_12px_rgba(28,20,16,0.06)]">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF2EA] dark:bg-[#E85102]/10 text-[#E85102] flex items-center justify-center" aria-hidden="true">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold">Tez orada</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
            Menyu paketlari va narxlari tez orada shu yerda chiqadi. Hozircha dasturxonni to&apos;yxona bilan bron qilgach kelishib olasiz.
          </p>
          <Link
            href={`/toyxona/${id}`}
            className="mt-2 h-12 px-6 rounded-full bg-[#E85102] hover:bg-[#C94600] text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-[#E85102]/25"
          >
            Sanani band qilish
          </Link>
        </section>
      </main>
    </div>
  );
}
