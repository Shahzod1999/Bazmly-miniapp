"use client";

// Figma "Sharhlar" (3905:44343) — "User Review" kartochkasi.
// Figma'dagi komponent 1.65 baravar kichraytirilgan (matn 8.5–9px), shuning uchun shrift o'qiladigan
// o'lchamga qaytarilgan; ranglar, joylashuv va tuzilish Figma'dagidek.
import Image from "next/image";
import { useState } from "react";
import type { ReviewListItem } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { ReviewStarIcon } from "@/components/nav-icons";

export function ReviewCard({ review, dark }: { review: ReviewListItem; dark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const text = review.comment?.trim() ?? "";
  const long = text.length > 160;
  const name = [review.author.first_name, review.author.last_name].filter(Boolean).join(" ") || "Foydalanuvchi";
  const ink = dark ? "text-white" : "text-[#323232]";

  return (
    <article
      className={`rounded-xl border p-3 flex flex-col gap-3 text-left shadow-[0_0_16px_rgba(0,0,0,0.15)] ${
        dark ? "bg-[#393939] border-white/5" : "bg-white border-[#F3F3F3]/50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <span className="relative w-7 h-7 shrink-0 rounded-full overflow-hidden bg-[#F3F3F3]">
            {review.author.avatar_url ? (
              <Image src={review.author.avatar_url} alt="" fill sizes="28px" unoptimized className="object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#E85102]">
                {name[0]?.toUpperCase()}
              </span>
            )}
          </span>
          <span className={`min-w-0 flex items-center gap-2 text-[13px] leading-[1.5] ${ink}`}>
            <span className="font-medium truncate min-w-[48px]">{name}</span>
            {review.published_at && (
              <>
                <span className={`w-0.5 h-0.5 rounded-full shrink-0 ${dark ? "bg-white" : "bg-[#323232]"}`} aria-hidden="true" />
                <span className="shrink-0">{formatDate(review.published_at.slice(0, 10), false)}</span>
              </>
            )}
            {review.is_verified && (
              <span
                title="Tasdiqlangan"
                aria-label="Tasdiqlangan"
                className={`shrink-0 h-5 px-1.5 rounded-[4px] text-xs flex items-center ${dark ? "bg-[#5C5C5C] text-white" : "bg-[#DDDAED] text-[#323232]"}`}
              >
                ✓
              </span>
            )}
          </span>
        </div>
        <span className="flex items-center gap-0.5 shrink-0" aria-label={`${review.rating} / 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <ReviewStarIcon key={i} className={`w-4 h-4 ${i < review.rating ? "text-[#ECBA0B]" : dark ? "text-white/20" : "text-[#E5E5E5]"}`} />
          ))}
        </span>
      </div>

      {text && (
        <div className="flex flex-col gap-2.5">
          <p className={`text-sm leading-[1.5] ${ink} ${long && !expanded ? "line-clamp-3" : ""}`}>{text}</p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={`self-end text-[13px] font-medium ${dark ? "text-[#B79CD6]" : "text-[#72479C]"}`}
            >
              {expanded ? "Yopish" : "Ko‘proq o‘qish"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
