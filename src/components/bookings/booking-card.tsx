"use client";

// Figma "Joylar" (2265:1986) — band qilingan joy kartochkasi.
// Ro'yxat endpoint'ida yo'q ma'lumotlar (rasm, telefon, manzil, chek raqami) joy va bron tafsilotlaridan olinadi.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { bookingService, venueService, type BookingListItem } from "@/lib/api";
import { useApiQuery } from "@/lib/use-api";
import { formatPhone, formatTime, parseISODate } from "@/lib/format";
import { ClockIcon, LocationIcon, PhoneIcon } from "@/components/nav-icons";

const STATUS_TEXT: Record<string, string> = {
  pending: "Tasdiq kutilmoqda",
  confirmed: "Band qilish tasdiqlandi",
  checked_in: "Mehmon keldi",
  completed: "Yakunlangan",
  cancelled: "Bekor qilingan",
  no_show: "Kelinmadi",
};

const ACTIVE = new Set(["pending", "confirmed"]);

/** "2026-12-03" → "03/12/2026" */
function slashDate(iso: string): string {
  const d = parseISODate(iso);
  return [d.getDate(), d.getMonth() + 1].map((n) => String(n).padStart(2, "0")).join("/") + "/" + d.getFullYear();
}

/** Bron boshlanishigacha qolgan vaqt: "2 soat 25 daqiqa" (o'tib ketgan bo'lsa null) */
function useTimeLeft(date: string, start: string, enabled: boolean): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [enabled]);
  if (!enabled) return null;
  const [h, m] = start.split(":").map(Number);
  const target = parseISODate(date);
  target.setHours(h, m, 0, 0);
  const mins = Math.floor((target.getTime() - now) / 60_000);
  if (mins <= 0) return null;
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  if (days > 0) return `${days} kun ${hours} soat`;
  if (hours > 0) return `${hours} soat ${rest} daqiqa`;
  return `${rest} daqiqa`;
}

function Row({ label, children, dark }: { label: string; children: React.ReactNode; dark: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-base leading-[22px]">
      <span className={`shrink-0 ${dark ? "text-white/50" : "text-[#4C4C4C]"}`}>{label}</span>
      <span className={`font-semibold text-right truncate ${dark ? "text-white" : "text-[#1F1F1F]"}`}>{children}</span>
    </div>
  );
}

export function BookingCard({ booking, dark }: { booking: BookingListItem; dark: boolean }) {
  const venueQuery = useApiQuery(`venue-${booking.venue_id}`, () => venueService.getVenueDetail(booking.venue_id));
  const detailQuery = useApiQuery(`booking-${booking.id}`, () => bookingService.getBookingDetail(booking.id));
  const venue = venueQuery.state.status === "success" ? venueQuery.state.data : null;
  const detail = detailQuery.state.status === "success" ? detailQuery.state.data.booking : null;

  const photo = venue?.photos.find((p) => p.is_cover)?.url ?? venue?.photos[0]?.url ?? null;
  const isActive = ACTIVE.has(booking.status);
  const timeLeft = useTimeLeft(booking.booking_date, booking.start_time, isActive);
  const muted = dark ? "text-white/60" : "text-[#4D4D4D]";

  return (
    <Link
      href={`/payment/${booking.id}`}
      className={`block rounded-[20px] border p-2.5 transition-transform active:scale-[0.99] ${
        dark
          ? "bg-[#393939] border-white/10"
          : isActive
          ? "bg-white border-[#E85102]"
          : "bg-[#F3F3F3] border-[#E85102]"
      }`}
    >
      {/* Joy haqida */}
      <div className="flex gap-5">
        <div className={`relative w-[92px] h-[92px] mt-1 shrink-0 overflow-hidden rounded-xl ${dark ? "bg-white/5" : "bg-[#EDEDED]"}`}>
          {photo ? (
            <Image src={photo} alt="" fill sizes="92px" className="object-cover" />
          ) : (
            <ImageOff className="absolute inset-0 m-auto h-6 w-6 text-zinc-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-5">
          <h2 className={`text-lg leading-[22px] font-bold truncate ${dark ? "text-white" : "text-[#1E1E1E]"}`}>{booking.venue_name}</h2>
          <div className={`flex flex-col gap-2.5 text-sm leading-4 ${muted}`}>
            <div className="flex items-center gap-2">
              <span className={venue?.is_open_now === false ? "text-zinc-400 font-bold" : "text-[#3ACD3F] font-bold flex items-center gap-1.5"}>
                {venue?.is_open_now !== false && <span className="w-1.5 h-1.5 rounded-full bg-[#39CC3F]" aria-hidden="true" />}
                {venue ? (venue.is_open_now ? "Ochiq" : "Yopiq") : "…"}
              </span>
            </div>
            {venue?.venue.phone && (
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{formatPhone(venue.venue.phone)}</span>
              </div>
            )}
            {venue?.venue.street && (
              <div className="flex items-center gap-2">
                <LocationIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{venue.venue.street}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bron tafsilotlari */}
      <div className="mt-[15px] flex flex-col gap-2.5">
        <Row label="Holat" dark={dark}>{STATUS_TEXT[booking.status] ?? booking.status}</Row>
        {detail?.receipt_number && <Row label="Chek raqami:" dark={dark}>{detail.receipt_number}</Row>}
        <Row label="Belgilandi:" dark={dark}>
          <span className="inline-flex items-center gap-1.5">
            {formatTime(booking.start_time)}
            <span className={`w-1 h-1 rounded-full ${dark ? "bg-white" : "bg-[#1E1E1E]"}`} aria-hidden="true" />
            {slashDate(booking.booking_date)}
          </span>
        </Row>
        {booking.table_number ? (
          <Row label="Stol raqami:" dark={dark}>{booking.table_number} - stol</Row>
        ) : (
          <Row label="Mehmonlar:" dark={dark}>{booking.guests_count} kishi</Row>
        )}
        {venue?.venue.phone && <Row label="Restoran raqami:" dark={dark}>{formatPhone(venue.venue.phone)}</Row>}

        {timeLeft && (
          <div className="mt-[5px] h-9 px-6 flex items-center justify-between rounded-[40px] border border-[#E85102] text-[#E85102] text-base leading-[22px]">
            <span>Qoldi:</span>
            <span className="flex items-center gap-2.5 font-semibold">
              <ClockIcon className="h-6 w-6" />
              {timeLeft}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
