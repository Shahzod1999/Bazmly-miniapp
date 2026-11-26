"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { bookingService, engagementService, type BookingListItem, type NotificationRead } from "@/lib/api";
import { bookingStatus } from "@/lib/booking";
import { formatDate, formatDateTime, formatSom, formatTime } from "@/lib/format";
import { useApiQuery } from "@/lib/use-api";

/* Profil ichidagi "Xabarlar" va "Tarix" ro'yxatlari — dizayn avvalgidek, ma'lumot API'dan. */

function StateMessage({ dark, text, onRetry }: { dark: boolean; text: string; onRetry?: () => void }) {
  return (
    <div className={`py-10 text-center space-y-3 rounded-3xl border border-dashed ${dark ? "border-white/10" : "border-zinc-200"}`}>
      <p className={`text-sm font-semibold ${dark ? "text-white/60" : "text-zinc-500"}`}>{text}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="px-4 py-2.5 rounded-xl bg-[#E85102] text-white text-xs font-bold">
          Qayta urinish
        </button>
      )}
    </div>
  );
}

function Skeletons({ dark }: { dark: boolean }) {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Yuklanmoqda">
      {[0, 1].map((i) => (
        <div key={i} className={`h-28 rounded-3xl ${dark ? "bg-[#393939]" : "bg-zinc-100"}`} />
      ))}
    </div>
  );
}

function NotificationCard({ n, dark }: { n: NotificationRead; dark: boolean }) {
  const unread = !n.read_at;
  return (
    <div
      className={`w-full border rounded-3xl p-5 flex items-start gap-4 relative shadow-lg ${
        unread ? (dark ? "bg-[#221A15] border-white/5" : "bg-[#E85102]/5 border-[#E85102]/15") : dark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"
      }`}
    >
      {unread && <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#E53E3E]" aria-label="O'qilmagan" />}
      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
        <Image src="/logo-loading.webp" alt="" width={28} height={28} className="w-7 h-7 object-contain" />
      </div>
      <div className="space-y-1 pr-2">
        <h4 className={`text-sm font-bold leading-snug ${dark ? "text-white" : "text-zinc-900"}`}>{n.title}</h4>
        {n.body && <p className={`text-xs leading-normal ${dark ? "text-white/80" : "text-zinc-600"}`}>{n.body}</p>}
        <p className={`text-xs font-semibold pt-1 ${dark ? "text-white/45" : "text-zinc-400"}`}>{formatDateTime(n.sent_at)}</p>
      </div>
    </div>
  );
}

/** "Xabarlar" bo'limi: bildirishnomalar API'dan */
export function NotificationsList({ dark }: { dark: boolean }) {
  const query = useApiQuery("profile-notifications", () => engagementService.getNotifications(30));
  const { state } = query;
  if (state.status === "loading") return <Skeletons dark={dark} />;
  if (state.status === "error") return <StateMessage dark={dark} text={state.error.message} onRetry={query.retry} />;
  if (state.data.items.length === 0) return <StateMessage dark={dark} text="Hozircha xabarlar yo'q" />;
  return (
    <div className="space-y-3.5">
      {state.data.items.map((n) => (
        <NotificationCard key={n.id} n={n} dark={dark} />
      ))}
    </div>
  );
}

function HistoryCard({ booking, dark }: { booking: BookingListItem; dark: boolean }) {
  const status = bookingStatus(booking.status);
  const label = dark ? "text-white/40" : "text-zinc-400";
  const value = dark ? "text-white/90" : "text-zinc-900";
  return (
    <Link
      href={`/payment/${booking.id}`}
      className={`w-full rounded-3xl p-5 flex flex-col gap-4 transition-all duration-300 ${
        dark ? "bg-[#393939] border border-white/5 shadow-xl hover:border-white/10" : "bg-white border border-[#E85102] shadow-md hover:shadow-lg hover:border-primary/80"
      }`}
    >
      <div className="space-y-1 pr-1 w-full min-w-0">
        <h2 className={`text-base font-bold tracking-wide truncate ${dark ? "text-white" : "text-zinc-900"}`}>{booking.venue_name}</h2>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${dark ? "text-white/50" : "text-zinc-500"}`}>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <span>{booking.kind === "hall" ? "Zal broni" : "Stol broni"}</span>
        </div>
      </div>

      <hr className={`border-t ${dark ? "border-white/5" : "border-zinc-100"}`} />

      <div className="space-y-2.5 text-xs font-semibold">
        <div className="flex justify-between items-center">
          <span className={label}>Holat</span>
          <span className={`font-bold ${dark ? "text-white" : "text-zinc-900"}`}>{status.label}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className={label}>Belgilandi:</span>
          <span className={value}>
            {formatTime(booking.start_time)} • {formatDate(booking.booking_date)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className={label}>Mehmonlar:</span>
          <span className={value}>{booking.guests_count} kishi</span>
        </div>
        {booking.table_number !== null && (
          <div className="flex justify-between items-center">
            <span className={label}>Stol raqami:</span>
            <span className={value}>{booking.table_number} - stol</span>
          </div>
        )}
        {Number(booking.total_amount) > 0 && (
          <div className="flex justify-between items-center">
            <span className={label}>Summa:</span>
            <span className={value}>{formatSom(booking.total_amount)}</span>
          </div>
        )}
      </div>

      {(booking.status === "pending" || booking.status === "confirmed") && (
        <div
          className={`w-full rounded-2xl py-3.5 px-4 flex items-center justify-between text-sm font-bold ${
            dark ? "bg-[#E85102] text-white shadow-md" : "bg-white border border-[#E85102] text-[#E85102]"
          }`}
        >
          <span className={dark ? "text-white" : "text-[#E85102] opacity-80 font-medium"}>Sana:</span>
          <div className="flex items-center gap-2">
            <Clock className={`h-4.5 w-4.5 shrink-0 ${dark ? "text-white" : "text-[#E85102]"}`} />
            <span>
              {formatDate(booking.booking_date)}, {formatTime(booking.start_time)}
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

/** "Tarix" bo'limi: foydalanuvchining bronlari API'dan */
export function BookingHistoryList({ dark }: { dark: boolean }) {
  const query = useApiQuery("profile-bookings", () => bookingService.getMyBookings());
  const { state } = query;
  if (state.status === "loading") return <Skeletons dark={dark} />;
  if (state.status === "error") return <StateMessage dark={dark} text={state.error.message} onRetry={query.retry} />;
  if (state.data.length === 0) return <StateMessage dark={dark} text="Hali bronlar yo'q" />;
  const items = [...state.data].sort((a, b) => b.booking_date.localeCompare(a.booking_date));
  return (
    <>
      {items.map((booking) => (
        <HistoryCard key={booking.id} booking={booking} dark={dark} />
      ))}
    </>
  );
}
