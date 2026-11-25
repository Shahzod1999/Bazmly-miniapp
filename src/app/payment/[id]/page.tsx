"use client";

import { useTelegramBackButton } from "@/lib/telegram";
import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import { BookingQr } from "@/components/booking/booking-qr";
import { showToast } from "@/components/app-toast";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, isApiError } from "@/lib/api";
import { bookingStatus, canCancel, showsQr } from "@/lib/booking";
import { formatDate, formatSom, formatTime } from "@/lib/format";
import { errorMessage, useApiQuery } from "@/lib/use-api";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Bron chiptasi. Ma'lumot faqat backend'dan (`GET /bookings/{id}`).
 * Onlayn to'lov endpointi hali yo'q — depozit bo'lsa "to'lov kutilmoqda" ko'rsatiladi, karta formasi yo'q.
 */
export default function BookingTicketPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const bookingId = Number(id);
  const valid = Number.isInteger(bookingId) && bookingId > 0;
  const query = useApiQuery(user && valid ? `booking:${bookingId}` : null, () => bookingService.getBookingDetail(bookingId));
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useTelegramBackButton(() => router.push("/tickets"));

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=${encodeURIComponent(`/payment/${id}`)}`);
  }, [authLoading, user, router, id]);

  const cancel = async () => {
    if (query.state.status !== "success") return;
    setCancelling(true);
    try {
      const updated = await bookingService.cancelBooking(bookingId);
      query.setData((prev) => ({ ...prev, booking: updated }));
      setConfirmCancel(false);
      showToast("Bron bekor qilindi");
    } catch (err) {
      showToast(errorMessage(err, "Bronni bekor qilib bo'lmadi"), "error");
    } finally {
      setCancelling(false);
    }
  };

  let content: React.ReactNode;
  if (!valid || (query.state.status === "error" && isApiError(query.state.error) && (query.state.error.status === 404 || query.state.error.status === 403))) {
    content = <Message title="Bron topilmadi" text="Bu bron mavjud emas yoki sizga tegishli emas." />;
  } else if (query.state.status === "error") {
    content = <Message title="Ma'lumotni yuklab bo'lmadi" text={query.state.error.message} onRetry={query.retry} />;
  } else if (query.state.status === "loading" || authLoading || !user) {
    content = <div className="h-96 rounded-3xl bg-foreground/5 animate-pulse" aria-label="Yuklanmoqda" />;
  } else {
    const detail = query.state.data;
    const { booking } = detail;
    const status = bookingStatus(booking.status);
    const deposit = Number(booking.deposit_amount || 0);
    content = (
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div
            className={`inline-flex h-20 w-20 items-center justify-center rounded-full border text-5xl ${
              status.tone === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-500"
                : status.tone === "danger"
                ? "bg-red-500/10 border-red-500/20 text-red-500"
                : "bg-primary/10 border-primary/20 text-primary"
            }`}
            aria-hidden="true"
          >
            {status.tone === "danger" ? "✕" : "✓"}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{booking.status === "pending" ? "Bron yuborildi" : status.label}</h1>
          <p className="text-sm text-foreground/60">
            {booking.status === "pending"
              ? "Muassasa broningizni tasdiqlagach sizga xabar keladi."
              : booking.status === "confirmed"
              ? "Broningiz tasdiqlandi. Muassasaga kelganingizda QR kodni ko'rsating."
              : "Bron holati yangilandi."}
          </p>
        </div>

        <div className="rounded-3xl border border-brand-light-border dark:border-brand-dark-border bg-brand-light-card dark:bg-brand-dark-card shadow-2xl overflow-hidden relative">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">{booking.kind === "hall" ? "Zal broni" : "Stol broni"}</span>
              <span className="text-xs font-bold font-mono text-foreground/40">#{booking.ticket_code}</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-foreground">{detail.venue_name}</h3>
              <p className="text-xs text-foreground/50">Holat: {status.label}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <p className="text-foreground/40 uppercase font-bold">Sana</p>
                <p className="font-extrabold text-foreground">{formatDate(booking.booking_date)}</p>
              </div>
              <div>
                <p className="text-foreground/40 uppercase font-bold">Vaqt</p>
                <p className="font-extrabold text-foreground">
                  {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                </p>
              </div>
              <div>
                <p className="text-foreground/40 uppercase font-bold">Mehmonlar</p>
                <p className="font-extrabold text-foreground">{booking.guests_count} kishi</p>
              </div>
              <div>
                <p className="text-foreground/40 uppercase font-bold">Jami summa</p>
                <p className="font-extrabold text-primary">{formatSom(booking.total_amount)}</p>
              </div>
            </div>

            {detail.price_lines.length > 0 && (
              <ul className="space-y-1.5 text-xs pt-2">
                {[...detail.price_lines]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((line) => (
                    <li key={line.id} className="flex justify-between gap-3">
                      <span className="text-foreground/60">
                        {line.label_snapshot}
                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                      </span>
                      <span className="font-bold text-foreground">{formatSom(line.amount)}</span>
                    </li>
                  ))}
              </ul>
            )}

            {deposit > 0 && (booking.status === "pending" || booking.status === "confirmed") && (
              <p className="rounded-2xl bg-primary/10 border border-primary/20 p-3 text-xs font-semibold text-foreground">
                Depozit: {formatSom(deposit)} — to&apos;lov kutilmoqda. Onlayn to&apos;lov tez orada qo&apos;shiladi, hozircha muassasa bilan kelishiladi.
              </p>
            )}
          </div>

          <div className="relative flex items-center justify-between my-2">
            <div className="h-6 w-3 bg-brand-light dark:bg-brand-dark rounded-r-full border-r border-y border-brand-light-border dark:border-brand-dark-border -ml-px" />
            <div className="flex-1 border-t-2 border-dashed border-brand-light-border dark:border-brand-dark-border mx-2" />
            <div className="h-6 w-3 bg-brand-light dark:bg-brand-dark rounded-l-full border-l border-y border-brand-light-border dark:border-brand-dark-border -mr-px" />
          </div>

          <div className="p-6 flex flex-col items-center justify-center space-y-4">
            {showsQr(booking.status) && detail.qr_token ? (
              <>
                <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100 flex items-center justify-center">
                  <BookingQr token={detail.qr_token} size={128} />
                </div>
                <span className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Tadbirga kirish kodi</span>
              </>
            ) : (
              <span className="text-xs font-bold text-foreground/40">Chek raqami: {booking.receipt_number}</span>
            )}
          </div>
        </div>

        {canCancel(booking.status) &&
          (confirmCancel ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Bronni bekor qilasizmi? Bekor qilish shartlari muassasaga bog&apos;liq.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmCancel(false)} disabled={cancelling} className="flex-1 rounded-2xl border border-brand-light-border dark:border-brand-dark-border py-3 text-sm font-bold">
                  Qoldirish
                </button>
                <button type="button" onClick={cancel} disabled={cancelling} className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {cancelling ? "Bekor qilinmoqda..." : "Bekor qilish"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmCancel(true)} className="w-full rounded-2xl border border-red-500/30 py-3.5 text-sm font-bold text-red-600">
              Bronni bekor qilish
            </button>
          ))}

        <div className="flex gap-4">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center rounded-2xl bg-foreground/5 dark:bg-white/5 border border-brand-light-border dark:border-brand-dark-border py-4 text-base font-bold text-foreground hover:bg-foreground/10 dark:hover:bg-white/10 transition-all duration-200"
          >
            Bosh sahifaga
          </Link>
          <Link
            href="/tickets"
            className="flex-1 inline-flex items-center justify-center rounded-2xl bg-primary py-4 text-base font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all duration-200"
          >
            Chiptalarim
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">{content}</main>
    </div>
  );
}

function Message({ title, text, onRetry }: { title: string; text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="text-center space-y-3">
      <h1 className="text-xl font-extrabold text-foreground">{title}</h1>
      <p className="text-sm text-foreground/60">{text}</p>
      <div className="flex justify-center gap-3 pt-2">
        <Link href="/tickets" className="rounded-2xl border border-brand-light-border dark:border-brand-dark-border px-5 py-3 text-sm font-bold">
          Chiptalarim
        </Link>
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white">
            Qayta urinish
          </button>
        )}
      </div>
    </div>
  );
}
