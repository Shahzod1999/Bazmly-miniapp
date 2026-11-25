"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Ticket, Calendar, Loader2, QrCode, X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, BookingListItem } from "@/lib/api";
import { showToast } from "@/components/app-toast";
import { BookingQr } from "@/components/booking/booking-qr";
import { bookingStatus, canCancel, showsQr } from "@/lib/booking";
import { formatDate, formatTime } from "@/lib/format";
import { errorMessage, useApiQuery } from "@/lib/use-api";

export default function VouchersAndTicketsPage() {
  const { theme } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  // Promokodlar backend'da hali yo'q — shu sababli chiptalar bo'limi birinchi ochiladi
  const [activeTab, setActiveTab] = useState<"vouchers" | "tickets">("tickets");
  const [selectedBookingQr, setSelectedBookingQr] = useState<BookingListItem | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Bronlar faqat backend'dan
  const listQuery = useApiQuery(isAuthenticated ? "my-bookings" : null, () => bookingService.getMyBookings());
  const bookings = listQuery.state.status === "success" ? [...listQuery.state.data].sort((a, b) => b.booking_date.localeCompare(a.booking_date)) : [];
  const loadingBookings = authLoading || (isAuthenticated && listQuery.state.status === "loading");
  const qrQuery = useApiQuery(selectedBookingQr ? `booking:${selectedBookingQr.id}` : null, () => bookingService.getBookingDetail(selectedBookingQr!.id));

  const handleCancelBooking = async (bookingId: number) => {
    if (confirmCancelId !== bookingId) {
      setConfirmCancelId(bookingId);
      return;
    }
    setCancellingId(bookingId);
    try {
      const updated = await bookingService.cancelBooking(bookingId, "Mijoz talabiga binoan");
      listQuery.setData((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: updated.status } : b)));
      showToast("Bron bekor qilindi");
    } catch (err) {
      showToast(errorMessage(err, "Bekor qilishda xatolik yuz berdi"), "error");
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`absolute inset-0 pb-16 overflow-y-auto bg-[var(--background)] flex flex-col font-sans select-none transition-all duration-300 ${
        selectedBookingQr ? "z-[80]" : "z-40"
      }`}
    >
      {/* Header with Switcher */}
      <div className="py-4 px-6 pt-6 flex flex-col gap-4">
        <h1 className={`text-[22px] font-extrabold tracking-wide text-center ${isDark ? "text-white" : "text-zinc-900"}`}>
          Chiptalar va Promokodlar
        </h1>

        {/* Tab switcher */}
        <div className={`flex p-1 rounded-2xl border ${isDark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"}`}>
          <button
            onClick={() => setActiveTab("vouchers")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "vouchers"
                ? "bg-[#FF6B00] text-white shadow-md"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Promokodlar
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "tickets"
                ? "bg-[#FF6B00] text-white shadow-md"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Mening Chiptalarim
          </button>
        </div>
      </div>

      {/* Tab 1: Vouchers List */}
      {activeTab === "vouchers" && (
        <div className="flex-1 px-4 py-3 space-y-4">
          <div
            className={`p-4 flex items-center gap-4 border shadow-sm ${
              isDark ? "border-[#2A2A2A]/40 bg-[#393939] rounded-[22px]" : "border-transparent bg-zinc-100 rounded-[22px]"
            }`}
          >
            <div
              className={`w-[50px] h-[50px] shrink-0 rounded-[14px] bg-[#FF6B00] flex flex-col items-center justify-center font-black text-white text-xs tracking-tighter leading-none ${
                isDark ? "shadow-[0_4px_12px_rgba(255,90,0,0.3)]" : "shadow-md shadow-[#FF6B00]/10"
              }`}
            >
              <span className="scale-x-95">Bazmly</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className={`text-xs font-bold leading-normal ${isDark ? "text-white" : "text-zinc-900"}`}>Promokodlar tez orada</h3>
              <p className="mt-1 text-[#8E8E93] text-xs font-semibold">Chegirma kodlari paydo bo&apos;lganda shu yerda ko&apos;rinadi.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Tickets List */}
      {activeTab === "tickets" && (
        <div className="flex-1 px-4 py-3 space-y-4 text-left">
          {!authLoading && !isAuthenticated ? (
            <div className="text-center py-16 space-y-3">
              <Ticket className="h-12 w-12 text-zinc-500 mx-auto" />
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>Chiptalarni ko&apos;rish uchun akkauntga kiring</p>
              <Link href="/login?next=%2Ftickets" className="inline-block mt-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-xs font-bold shadow-lg">
                Kirish
              </Link>
            </div>
          ) : listQuery.state.status === "error" ? (
            <div role="alert" className="text-center py-16 space-y-3">
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>Chiptalarni yuklab bo&apos;lmadi</p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">{listQuery.state.error.message}</p>
              <button type="button" onClick={listQuery.retry} className="inline-block mt-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-xs font-bold shadow-lg">
                Qayta urinish
              </button>
            </div>
          ) : loadingBookings ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`p-5 rounded-3xl border flex flex-col gap-4 shadow-sm ${
                    isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="h-5 w-40 rounded-lg bg-zinc-200 dark:bg-white/10" />
                      <div className="h-3.5 w-28 rounded-md bg-zinc-200/80 dark:bg-white/10" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-zinc-200 dark:bg-white/10" />
                  </div>
                  <div className="h-10 w-full rounded-2xl bg-zinc-100 dark:bg-white/5" />
                  <div className="h-12 w-full rounded-2xl bg-zinc-200 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : bookings.length > 0 ? (
            bookings.map((b) => (
              <div
                key={b.id}
                className={`p-5 rounded-3xl border flex flex-col gap-4 shadow-md transition-all ${
                  isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {b.venue_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{formatDate(b.booking_date)} • {formatTime(b.start_time)}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                      b.status === "confirmed" || b.status === "checked_in"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    {bookingStatus(b.status).label}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs font-semibold">
                  <div>
                    <span className="text-zinc-400">Mehmonlar: </span>
                    <span className={isDark ? "text-white" : "text-zinc-800"}>{b.guests_count} kishi</span>
                    {b.table_number && <span> ({b.table_number}-stol)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {canCancel(b.status) && (
                      <button
                        type="button"
                        disabled={cancellingId === b.id}
                        onClick={() => handleCancelBooking(b.id)}
                        className="px-2.5 py-1.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        {cancellingId === b.id ? "..." : confirmCancelId === b.id ? "Tasdiqlang" : "Bekor qilish"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedBookingQr(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>QR Chipta</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 space-y-3">
              <Ticket className="h-12 w-12 text-zinc-500 mx-auto" />
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>
                Sizda hali faol chiptalar yo&apos;q
              </p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Joy yoki tadbir zallarini band qilganingizda, chiptalaringiz bu yerda ko&apos;rinadi.
              </p>
              <Link
                href="/feed"
                className="inline-block mt-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Joy tanlash
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Dimming Backdrop */}
      {selectedBookingQr && (
        <div
          onClick={() => setSelectedBookingQr(null)}
          className={`fixed inset-0 z-[140] backdrop-blur-[2px] transition-opacity duration-300 max-w-md mx-auto ${
            isDark ? "bg-black/75" : "bg-black/40"
          }`}
        />
      )}

      {/* QR Code Modal for Booking */}
      {selectedBookingQr && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 animate-fade-in max-w-md mx-auto">
          <div className="w-full max-w-[320px] bg-white text-zinc-900 rounded-[36px] p-6 shadow-2xl flex flex-col items-center gap-4 relative">
            <button
              onClick={() => setSelectedBookingQr(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-extrabold text-base text-zinc-900">{selectedBookingQr.venue_name}</h3>
            <p className="text-xs text-zinc-500 font-bold">
              {formatDate(selectedBookingQr.booking_date)} • {formatTime(selectedBookingQr.start_time)}
            </p>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 min-h-[200px] min-w-[200px] flex items-center justify-center">
              {qrQuery.state.status === "success" && qrQuery.state.data.qr_token && showsQr(qrQuery.state.data.booking.status) ? (
                <BookingQr token={qrQuery.state.data.qr_token} size={176} />
              ) : qrQuery.state.status === "error" ? (
                <button type="button" onClick={qrQuery.retry} className="text-xs font-bold text-[#FF6B00]">
                  QR kodni yuklab bo&apos;lmadi. Qayta urinish
                </button>
              ) : qrQuery.state.status === "success" ? (
                <p className="text-xs font-bold text-zinc-500 text-center px-4">Bu bron uchun QR kod faol emas</p>
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-[#FF6B00]" />
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-[11px] font-bold text-zinc-500">
                Restoran administratoriga ushbu QR kodni ko&apos;rsating
              </p>
              <p className="text-[10px] font-mono font-bold text-[#FF6B00] break-all">
                {qrQuery.state.status === "success" ? qrQuery.state.data.booking.ticket_code : ""}
              </p>
            </div>

            <button
              onClick={() => setSelectedBookingQr(null)}
              className="w-full py-3.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-xs shadow-lg"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
