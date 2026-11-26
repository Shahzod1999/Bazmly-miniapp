"use client";

import Image from "next/image";
import React from "react";
import { Check, X } from "lucide-react";
import type { CompareRow, MenuPackage } from "./types";

interface PackageCompareSheetProps {
  packages: MenuPackage[];
  /** Taqqoslash qatorlari */
  rows: CompareRow[];
  onClose: () => void;
  onOpenGallery: (packageId: string) => void;
  onSelectPackage: (packageId: string) => void;
}

export default function PackageCompareSheet({
  packages,
  rows,
  onClose,
  onOpenGallery,
  onSelectPackage,
}: PackageCompareSheetProps) {
  const highlightIndex = packages.findIndex((p) => p.popular);
  const highlighted = highlightIndex >= 0 ? packages[highlightIndex] : null;

  const cellBg = (i: number) => (i === highlightIndex ? "bg-[#FFF2EA] dark:bg-[#E85102]/10" : "");

  return (
    <div className="fixed inset-0 z-[85] max-w-md mx-auto animate-fade-in">
      <button
        type="button"
        aria-label="Yopish"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-[#1C1410]/50 cursor-pointer"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Paketlarni solishtirish"
        className="absolute inset-x-0 bottom-0 max-h-[92%] flex flex-col rounded-t-3xl bg-white dark:bg-[#1E1E1E] shadow-[0_-4px_24px_rgba(28,20,16,0.10)] animate-scale-up"
      >
        <div className="shrink-0 pt-2 px-4">
          <div className="mx-auto w-9 h-1 rounded-full bg-zinc-200 dark:bg-white/15" aria-hidden="true" />
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Paketlarni solishtirish</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="w-11 h-11 -mr-2.5 rounded-full flex items-center justify-center text-zinc-900 dark:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">Menyu paketlari taqqoslamasi</caption>
            <colgroup>
              <col className="w-[33%]" />
              {packages.map((p) => (
                <col key={p.id} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10">
                <th scope="col" className="pb-2 text-left align-bottom text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Narx: so&apos;m
                </th>
                {packages.map((p, i) => (
                  <th
                    key={p.id}
                    scope="col"
                    className={`pt-1.5 pb-2 px-1 align-bottom rounded-t-xl ${cellBg(i)}`}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenGallery(p.id)}
                      aria-label={`${p.name} stolini kattalashtirish`}
                      className="relative block w-full h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-white/5 cursor-zoom-in"
                    >
                      {p.photos[0] && <Image src={p.photos[0].src} alt="" fill sizes="120px" className="object-cover" />}
                    </button>
                    <span className="block mt-1 text-sm font-bold text-zinc-900 dark:text-white">{p.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-zinc-100 dark:border-white/5">
                  <th scope="row" className="py-2.5 pr-2 text-left text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
                    {row.label}
                  </th>
                  {row.values.map((value, i) => (
                    <td key={i} className={`py-2.5 text-center ${cellBg(i)}`}>
                      {value === true ? (
                        <Check
                          role="img"
                          aria-label="Bor"
                          className="inline-block w-5 h-5 stroke-[2.5] text-[#0E6F4F] dark:text-[#3FC495]"
                        />
                      ) : value === false ? (
                        <span aria-label="Yo'q" className="text-[15px] font-semibold text-zinc-300 dark:text-white/25">
                          —
                        </span>
                      ) : (
                        <span className="text-[13px] font-bold text-zinc-900 dark:text-white">{value}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {highlighted && (
          <div className="shrink-0 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),20px)]">
            <button
              type="button"
              onClick={() => onSelectPackage(highlighted.id)}
              className="w-full h-14 rounded-2xl bg-[#E85102] hover:bg-[#C94600] text-white text-base font-bold active:scale-[0.99] transition-all cursor-pointer"
            >
              {highlighted.name} paketni tanlash
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
