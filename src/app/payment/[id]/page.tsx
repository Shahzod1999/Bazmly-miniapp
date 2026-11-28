"use client";

// Figma "Confirmed" (57:2059): to'q sariq fon, chipta kartochkasi (yon o'yiqlar), narx, chipta kodi, QR, "Pdf yuborish".
import { useTelegramBackButton } from "@/lib/telegram";
import React, { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, X } from "lucide-react";
import { BookingQr } from "@/components/booking/booking-qr";
import { comingSoon, showToast } from "@/components/app-toast";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, isApiError, venueService } from "@/lib/api";
import { canCancel, showsQr } from "@/lib/booking";
import { formatPhone, formatSom, formatTime } from "@/lib/format";
import { errorMessage, useApiQuery } from "@/lib/use-api";
import { STATUS_TEXT, slashDate } from "@/components/bookings/booking-card";
import {
  ArrowLeftIcon,
  BazmlyLogo,
  CardIcon,
  LocationIcon,
  PhoneIcon,
  QrGlyph,
  SendIcon,
} from "@/components/nav-icons";

interface Props {
  params: Promise<{ id: string }>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-base leading-[22px]">
      <span className="shrink-0 text-[#4C4C4C]">{label}</span>
      <span className="font-semibold text-[#1F1F1F] text-right truncate">{children}</span>
    </div>
  );
}

/** "1234987667895432" → "1234 9876 6789 5432" */
function groupCode(code: string): string {
  return code.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}

export default function BookingTicketPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const bookingId = Number(id);
  const valid = Number.isInteger(bookingId) && bookingId > 0;
  const query = useApiQuery(user && valid ? `booking:${bookingId}` : null, () => bookingService.getBookingDetail(bookingId));
  const venueId = query.state.status === "success" ? query.state.data.booking.venue_id : null;
  const venueQuery = useApiQuery(venueId ? `venue-${venueId}` : null, () => venueService.getVenueDetail(venueId!));
  const [showQr, setShowQr] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useTelegramBackButton(() => router.push("/feed"));

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

  const header = (
    <div className="h-8 mt-4 px-5 flex items-center justify-between">
      <button
        type="button"
        onClick={() => router.push("/feed")}
        aria-label="Orqaga"
        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center active:scale-90 transition-transform"
      >
        <ArrowLeftIcon className="w-5 h-5" />
      </button>
      <BazmlyLogo className="w-[101px] h-[25px]" />
      <span className="w-8 h-8" aria-hidden="true" />
    </div>
  );

  let content: React.ReactNode;
  if (!valid || (query.state.status === "error" && isApiError(query.state.error) && (query.state.error.status === 404 || query.state.error.status === 403))) {
    content = <Message title="Bron topilmadi" text="Bu bron mavjud emas yoki sizga tegishli emas." />;
  } else if (query.state.status === "error") {
    content = <Message title="Ma'lumotni yuklab bo'lmadi" text={query.state.error.message} onRetry={query.retry} />;
  } else if (query.state.status === "loading" || authLoading || !user) {
    content = <div className="mx-6 mt-7 h-[591px] rounded-3xl bg-white/20 animate-pulse" aria-label="Yuklanmoqda" />;
  } else {
    const detail = query.state.data;
    const { booking } = detail;
    const venue = venueQuery.state.status === "success" ? venueQuery.state.data : null;
    const photo = venue?.photos.find((p) => p.is_cover)?.url ?? venue?.photos[0]?.url ?? null;
    const qrAvailable = showsQr(booking.status) && !!detail.qr_token;

    content = (
      <>
        {/* Chipta kartochkasi: 345px, r24, yon o'yiqlar (r20) */}
        <div className="relative mx-6 mt-7 rounded-3xl bg-white shadow-[0_10px_20px_8px_rgba(164,79,24,0.4)] text-left">
          <div className="p-5 pb-0">
            {/* Joy */}
            <div className="flex gap-4">
              <div className="relative w-[92px] h-[92px] shrink-0 overflow-hidden rounded-xl bg-[#EDEDED]">
                {photo ? (
                  <Image src={photo} alt="" fill sizes="92px" className="object-cover" />
                ) : (
                  <ImageOff className="absolute inset-0 m-auto h-6 w-6 text-zinc-400" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-4">
                <h1 className="text-lg leading-[22px] font-bold text-[#1E1E1E] truncate">{detail.venue_name}</h1>
                <div className="flex flex-col gap-2 text-xs leading-4 text-[#4D4D4D]">
                  {venue && (
                    <span className={`flex items-center gap-1.5 font-bold ${venue.is_open_now ? "text-[#3ACD3F]" : "text-zinc-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${venue.is_open_now ? "bg-[#39CC3F]" : "bg-zinc-400"}`} />
                      {venue.is_open_now ? "Ochiq" : "Yopiq"}
                    </span>
                  )}
                  {venue?.venue.phone && (
                    <span className="flex items-center gap-2">
                      <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                      {formatPhone(venue.venue.phone)}
                    </span>
                  )}
                  {venue?.venue.street && (
                    <span className="flex items-center gap-2 min-w-0">
                      <LocationIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{venue.venue.street}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <hr className="mt-5 border-[#8D8D8D]" />

            {/* Tafsilotlar */}
            <div className="mt-[15px] flex flex-col gap-3.5">
              <Row label="Holat">{STATUS_TEXT[booking.status] ?? booking.status}</Row>
              <Row label="Chek raqami:">{booking.receipt_number}</Row>
              <Row label="Belgilandi:">
                <span className="inline-flex items-center gap-1.5">
                  {formatTime(booking.start_time)}
                  <span className="w-1 h-1 rounded-full bg-[#1E1E1E]" aria-hidden="true" />
                  {slashDate(booking.booking_date)}
                </span>
              </Row>
              <Row label="Mehmonlar:">{booking.guests_count} kishi</Row>
              {venue?.venue.phone && <Row label="Restoran raqami:">{formatPhone(venue.venue.phone)}</Row>}
            </div>

            <div className="mt-[19px] h-[39px] px-2.5 rounded-[40px] border border-[#E85102] bg-[#FFF7F2] flex items-center justify-between text-base text-[#E85102]">
              <span>Narx:</span>
              <span className="flex items-center gap-2.5 font-semibold">
                <CardIcon className="w-6 h-6" />
                {formatSom(booking.total_amount)}
              </span>
            </div>

            <p className="mt-4 text-center text-2xl leading-[22px] font-semibold text-[#1F1F1F]">{groupCode(booking.ticket_code)}</p>
          </div>

          {/* O'yiq chizig'i: yon o'yiqlar (r20) shu chiziq bilan bir qatorda */}
          <div className="relative mt-[16px]">
            <hr className="mx-5 border-[#8D8D8D]" />
            <span className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#E85102]" aria-hidden="true" />
            <span className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#E85102]" aria-hidden="true" />
          </div>

          <div className="pt-[31px] pb-6 flex flex-col items-center gap-[22px]">
            <button
              type="button"
              onClick={() => (qrAvailable ? setShowQr(true) : showToast("QR kod bron tasdiqlangach ochiladi"))}
              aria-label="QR kodni ko'rsatish"
              className={`w-[81px] h-[78px] rounded-[21.7px] flex items-center justify-center active:scale-95 transition-transform ${
                qrAvailable ? "bg-[#E85102]" : "bg-[#E85102]/40"
              }`}
            >
              <QrGlyph className="w-14 h-[50px]" />
            </button>
            <span className="text-xl leading-[22px] font-semibold text-[#1F1F1F]">QR</span>
          </div>
        </div>

        {canCancel(booking.status) && (
          <div className="mt-5 text-center">
            {confirmCancel ? (
              <div className="mx-6 rounded-2xl bg-white/15 p-3 flex flex-col gap-2.5 text-white">
                <p className="text-sm font-medium">Bronni bekor qilasizmi?</p>
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => setConfirmCancel(false)} disabled={cancelling} className="flex-1 h-10 rounded-xl bg-white/20 text-sm font-semibold">
                    Yo&apos;q
                  </button>
                  <button type="button" onClick={cancel} disabled={cancelling} className="flex-1 h-10 rounded-xl bg-white text-[#E85102] text-sm font-bold disabled:opacity-60">
                    {cancelling ? "Bekor qilinmoqda..." : "Ha, bekor qilish"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmCancel(true)} className="text-sm font-medium text-white/80 underline underline-offset-4">
                Bronni bekor qilish
              </button>
            )}
          </div>
        )}

        {showQr && detail.qr_token && (
          <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-6" onClick={() => setShowQr(false)}>
            <div className="relative bg-white rounded-3xl p-6 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setShowQr(false)} aria-label="Yopish" className="absolute top-3 right-3 p-1.5 rounded-full bg-[#F2F2F2] text-black">
                <X className="h-4 w-4" />
              </button>
              <BookingQr token={detail.qr_token} size={220} />
              <span className="text-sm font-semibold text-[#4C4C4C]">Kirishda shu kodni ko&apos;rsating</span>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#E85102] pb-[calc(var(--tg-safe-bottom)+96px)]">
      {/* Telegram tizim tugmalari ostidagi zona ham to'q sariq bo'lsin */}
      <div className="fixed top-0 inset-x-0 max-w-md mx-auto h-[var(--tg-safe-top)] bg-[#E85102] z-[41]" aria-hidden="true" />
      {header}
      {content}

      {/* Pastki tugma (Figma: oq, r64, matn #F27423) */}
      {query.state.status === "success" && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-6 pb-[max(var(--tg-safe-bottom),16px)] pt-3 z-40">
          <button
            type="button"
            onClick={() => comingSoon("PDF yuborish")}
            className="w-full h-14 rounded-[64px] bg-white text-[#F27423] text-xl leading-[22px] font-bold flex items-center justify-center gap-3.5 shadow-[0_10px_20px_rgba(183,86,23,0.4)] active:scale-[0.98] transition-transform"
          >
            Pdf yuborish
            <SendIcon className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

function Message({ title, text, onRetry }: { title: string; text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-6 mt-10 rounded-3xl bg-white p-6 text-center flex flex-col gap-3">
      <h1 className="text-xl font-bold text-[#1F1F1F]">{title}</h1>
      <p className="text-sm text-[#4C4C4C]">{text}</p>
      <div className="flex justify-center gap-3 pt-2">
        <Link href="/feed" className="rounded-2xl border border-[#E85102] text-[#E85102] px-5 py-3 text-sm font-bold">
          Bronlarim
        </Link>
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-2xl bg-[#E85102] px-5 py-3 text-sm font-bold text-white">
            Qayta urinish
          </button>
        )}
      </div>
    </div>
  );
}
