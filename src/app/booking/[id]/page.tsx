"use client";

import React, { use, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  CheckCircle,
  Phone,
  CreditCard,
  Percent,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/navbar";
import { comingSoon } from "@/components/app-toast";
import { useTelegramBackButton } from "@/lib/telegram";
import { BookingQr } from "@/components/booking/booking-qr";
import { bookingStatus, timeSlots, upcomingDates } from "@/lib/booking";
import { addMinutes, digitsOnly, formatDate, formatSom, formatTime, parseISODate, toApiTime, toE164Uz, weekdayShort } from "@/lib/format";
import { errorMessage, useApiQuery } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import {
  venueService,
  bookingService,
  AvailableTableRead,
  BookingOwnerDetail,
} from "@/lib/api";

interface Props {
  params: Promise<{ id: string }>;
}


function ProgressBar({ step }: { step: number }) {
  return (
    <div className="w-full flex items-center justify-between gap-1.5 py-3 select-none">
      {[1, 2, 3, 4, 5, 6].map((s) => {
        const isFilled = s <= step;
        return (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              isFilled ? "bg-[#FF6B00]" : "bg-zinc-200 dark:bg-zinc-800"
            }`}
          />
        );
      })}
    </div>
  );
}

const DURATION_MIN = 120;

/** URL'dagi oldindan buyurtma: {"menuItemId": soni} */
function parseCart(value: string | null): Record<number, number> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return {};
    const cart: Record<number, number> = {};
    for (const [key, qty] of Object.entries(parsed as Record<string, unknown>)) {
      const itemId = Number(key);
      const count = Number(qty);
      if (Number.isInteger(itemId) && itemId > 0 && Number.isInteger(count) && count > 0) cart[itemId] = count;
    }
    return cart;
  } catch {
    return {};
  }
}

function BookingContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const venueId = Number(id);

  // Muassasa, menyu va bo'sh stollar — faqat API'dan
  const detailQuery = useApiQuery(`venue:${venueId}`, () => venueService.getVenueDetail(venueId));
  const venueDetail = detailQuery.state.status === "success" ? detailQuery.state.data : null;
  const [cart] = useState(() => parseCart(searchParams.get("items")));
  const menuQuery = useApiQuery(Object.keys(cart).length > 0 ? `menu:${venueId}` : null, () => venueService.getMenu(venueId));
  const menuItems = menuQuery.state.status === "success" ? menuQuery.state.data : [];

  const [now] = useState(() => new Date());
  const [allDates] = useState(() => upcomingDates(21));
  const dates = venueDetail ? allDates.slice(Math.max(0, venueDetail.venue.min_advance_booking_days)) : [];

  const [guests, setGuests] = useState(() => Math.max(1, Number(searchParams.get("guests")) || 2));
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const times = selectedDate && venueDetail ? timeSlots(selectedDate, venueDetail.working_hours, DURATION_MIN, now) : [];
  const endTime = selectedTime ? addMinutes(selectedTime, DURATION_MIN) : null;

  const tablesKey = selectedDate && selectedTime ? `tables:${venueId}:${selectedDate}:${selectedTime}:${guests}` : null;
  const tablesQuery = useApiQuery(tablesKey, () =>
    venueService.getFreeTables(venueId, selectedDate as string, toApiTime(selectedTime as string), toApiTime(endTime as string), guests)
  );
  const freeTables: AvailableTableRead[] = tablesQuery.state.status === "success" ? tablesQuery.state.data : [];
  const loadingTables = tablesKey !== null && tablesQuery.state.status === "loading";
  const selectedTableInfo = freeTables.find((t) => t.id === selectedTable) ?? null;

  // Multi-step State Machine: "params" -> "details" -> "checkout" -> "ticket" -> "qr"
  const [bookingStep, setBookingStep] = useState<"params" | "details" | "checkout" | "ticket" | "qr">("params");

  // Aloqa ma'lumotlari foydalanuvchi profilidan
  // Foydalanuvchi o'zgartirmaguncha profil ma'lumotlari ishlatiladi
  const [nameDraft, setFullName] = useState<string | null>(null);
  const [phoneDraft, setPhoneNumber] = useState<string | null>(null);
  const fullName = nameDraft ?? (user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "");
  const phoneNumber = phoneDraft ?? user?.phone ?? "";

  const [createdBookingDetail, setCreatedBookingDetail] = useState<BookingOwnerDetail | null>(null);
  const createdBooking = createdBookingDetail?.booking ?? null;

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bookingStep]);

  // Bron qilish uchun akkaunt kerak
  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=${encodeURIComponent(`/booking/${id}${window.location.search}`)}`);
  }, [authLoading, user, router, id]);

  // To'yxonalar o'z bron oqimiga ega
  const isHall = venueDetail?.venue_type === "toyxona";
  useEffect(() => {
    if (isHall) router.replace(`/toyxona/${id}`);
  }, [isHall, router, id]);

  const triggerToast = (msg: string) => setToastMessage(msg);

  const goBack = () => {
    if (bookingStep === "details") setBookingStep("params");
    else if (bookingStep === "checkout") setBookingStep("details");
    else if (bookingStep === "ticket") router.replace("/tickets"); // bron yaratilgan — qayta yuborilmasin
    else if (bookingStep === "qr") setBookingStep("ticket");
    else router.back();
  };
  useTelegramBackButton(goBack);

  if (authLoading || !user || detailQuery.state.status === "loading" || isHall) {
    return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse h-screen" />;
  }

  if (detailQuery.state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Muassasa ma&apos;lumotlarini yuklab bo&apos;lmadi</p>
        <p className="text-xs text-zinc-500">{detailQuery.state.error.message}</p>
        <button type="button" onClick={detailQuery.retry} className="px-5 py-3 rounded-2xl bg-[#FF6B00] text-white text-sm font-bold">
          Qayta urinish
        </button>
      </div>
    );
  }

  const preorderTotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find((m) => m.id === Number(itemId));
    return sum + Number(item?.effective_price ?? 0) * qty;
  }, 0);
  const preorderCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  // Bronni backend'da yaratish. Xato bo'lsa — xabar ko'rsatiladi, chipta yaratilmaydi.
  const handleCompletePayment = async () => {
    if (!selectedDate || !selectedTime || !endTime || !selectedTable) {
      setBookingStep("params");
      triggerToast("Sana, vaqt va stolni tanlang");
      return;
    }
    const phoneDigits = digitsOnly(phoneNumber);
    if (!fullName.trim() || phoneDigits.length < 9) {
      setBookingStep("details");
      triggerToast("Ism va telefon raqamini to'liq kiriting");
      return;
    }
    setLoading(true);
    setSubmitError(null);
    try {
      const detailRes = await bookingService.bookTable({
        venue_id: venueId,
        booking_date: selectedDate,
        start_time: toApiTime(selectedTime),
        end_time: toApiTime(endTime),
        table_id: selectedTable,
        guests_count: guests,
        contact_name: fullName.trim(),
        contact_phone: toE164Uz(phoneDigits.slice(-9)),
        items: Object.entries(cart).map(([menuItemId, quantity]) => ({ menu_item_id: Number(menuItemId), quantity })),
      });
      setCreatedBookingDetail(detailRes);
      setBookingStep("ticket");
      triggerToast("Bron yuborildi!");
    } catch (err) {
      setSubmitError(errorMessage(err, "Bron qilishda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (val: number | string) => formatSom(val);
  const venueName = createdBookingDetail?.venue_name || venueDetail?.venue.name || "";
  const venueLocation = venueDetail ? `${venueDetail.venue.street}${venueDetail.venue.house_number ? `, ${venueDetail.venue.house_number}` : ""}` : "";
  const venuePhone = venueDetail?.venue.phone || "";
  const coverPhoto = venueDetail?.photos.find((p) => p.is_cover)?.url ?? venueDetail?.photos[0]?.url ?? null;
  const dateLabel = (iso: string | null) => (iso ? formatDate(iso) : "—");

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white dark:bg-[var(--background)] text-zinc-900 dark:text-white flex flex-col relative overflow-hidden pb-12 transition-colors duration-300">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-150 dark:border-white/5 select-none shrink-0 bg-white/80 dark:bg-[var(--background)]/80 backdrop-blur-md z-30 sticky top-0">
        <button
          type="button"
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-white flex items-center justify-center transition-all active:scale-90 border border-zinc-200/60 dark:border-white/5 cursor-pointer shadow-xs"
          aria-label="Orqaga"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {bookingStep === "params" ? (
          <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
            Bron qilish
          </span>
        ) : (
          <h2 className="text-sm font-black tracking-wider uppercase text-zinc-800 dark:text-zinc-100">
            {bookingStep === "details" && "Ma'lumotlarni Tasdiqlash"}
            {bookingStep === "checkout" && "TO'LOV MA'LUMOTLARI"}
            {bookingStep === "ticket" && "Tasdiqlandi"}
            {bookingStep === "qr" && "QR Chipta"}
          </h2>
        )}

        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 select-none bg-zinc-100 dark:bg-white/5 px-3.5 py-1.5 rounded-full border border-zinc-200/70 dark:border-white/5 shadow-2xs">
          <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" />
          <span className="truncate max-w-[120px]">{venueName}</span>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[999] px-4 py-3 rounded-2xl bg-[#FF6B00] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <CheckCircle className="h-4.5 w-4.5 shrink-0 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: Parameters Setup */}
      {bookingStep === "params" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in select-none">
          <ProgressBar step={2} />

          {/* Necha kishi uchun */}
          <div className="flex justify-between items-center text-left py-2 px-1">
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight">
                Necha kishi uchun
              </h3>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                Mehmonlar miqdori
              </p>
            </div>

            <div className="flex items-center gap-3 bg-zinc-100 dark:bg-[#2C2C2E] p-1.5 rounded-2xl border border-zinc-200/80 dark:border-white/5 shadow-2xs">
              <button
                type="button"
                onClick={() => setGuests((prev) => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-xl bg-white dark:bg-[#393939] text-zinc-800 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center font-black text-lg active:scale-95 transition-all shadow-xs border border-zinc-200/50 dark:border-white/5 cursor-pointer"
              >
                —
              </button>
              <span className="text-lg font-black w-7 text-center text-zinc-900 dark:text-white select-none">
                {guests}
              </span>
              <button
                type="button"
                onClick={() => setGuests((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl bg-white dark:bg-[#393939] text-zinc-800 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center font-black text-lg active:scale-95 transition-all shadow-xs border border-zinc-200/50 dark:border-white/5 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Joyni belgilash (Table Selector) */}
          <div className="space-y-3.5 text-left py-2 px-1">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight">
                  Joyni belgilash (Stol)
                </h3>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                  {selectedTableInfo ? `Stol #${selectedTableInfo.number} tanlandi (${selectedTableInfo.seats} o'rin)` : "Bo'sh stollardan birini tanlang"}
                </p>
              </div>
              {loadingTables && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            <div className="flex justify-between items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
              {!tablesKey && (
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-3">Avval sana va vaqtni tanlang</p>
              )}
              {tablesQuery.state.status === "error" && (
                <button type="button" onClick={tablesQuery.retry} className="text-xs font-bold text-[#FF6B00] py-3">
                  Stollarni yuklab bo&apos;lmadi. Qayta urinish
                </button>
              )}
              {tablesQuery.state.status === "success" && freeTables.length === 0 && (
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-3">Bu vaqtda bo&apos;sh stol yo&apos;q. Boshqa vaqtni tanlang.</p>
              )}
              {freeTables.map((table) => {
                const num = table.number;
                const isSelected = selectedTable === table.id;
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => setSelectedTable(table.id)}
                    aria-pressed={isSelected}
                    aria-label={`${num}-stol, ${table.seats} o'rin`}
                    className={`flex-1 min-w-[42px] h-[72px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer border ${
                      isSelected
                        ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25 scale-105"
                        : "bg-zinc-100 hover:bg-zinc-200/70 dark:bg-[#2C2C2E] dark:hover:bg-zinc-700 border-zinc-200/80 dark:border-white/5 text-zinc-700 dark:text-zinc-300 shadow-2xs"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider leading-none ${
                        isSelected ? "text-white/90" : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      {isSelected ? "✓" : "Stol"}
                    </span>
                    <span
                      className={`text-xl font-black leading-none ${
                        isSelected ? "text-white" : "text-zinc-900 dark:text-white"
                      }`}
                    >
                      {num}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sanani belgilash */}
          <div className="space-y-3.5 text-left py-2 px-1">
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight">
                Sanani belgilash
              </h3>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                Kerakli sanani tanlang
              </p>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
              {dates.map((iso, idx) => {
                const item = { day: weekdayShort(parseISODate(iso)), num: String(parseISODate(iso).getDate()) };
                const isSelected = selectedDate === iso;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDate(iso);
                      setSelectedTime(null);
                      setSelectedTable(null);
                    }}
                    className={`w-[58px] py-3.5 rounded-2xl shrink-0 flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer border ${
                      isSelected
                        ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25 scale-105"
                        : "bg-zinc-100 hover:bg-zinc-200/70 dark:bg-[#2C2C2E] dark:hover:bg-zinc-700 border-zinc-200/80 dark:border-white/5 text-zinc-600 dark:text-zinc-400 shadow-2xs"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider leading-none ${
                        isSelected ? "text-white/90" : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      {isSelected ? "✓" : item.day}
                    </span>
                    <span
                      className={`text-base font-black leading-none ${
                        isSelected ? "text-white" : "text-zinc-900 dark:text-white"
                      }`}
                    >
                      {item.num}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vaqtni belgilash */}
          <div className="space-y-3.5 text-left py-2 px-1">
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight">
                Vaqtni belgilash
              </h3>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                Tashrif buyurish vaqti
              </p>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
              {!selectedDate && (
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-3">Avval sanani tanlang</p>
              )}
              {selectedDate && times.length === 0 && (
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-3">Bu kuni bo&apos;sh vaqt yo&apos;q</p>
              )}
              {times.map((t) => {
                const isSelected = selectedTime === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSelectedTime(t);
                      setSelectedTable(null);
                    }}
                    className={`px-5 py-3 rounded-2xl text-xs font-black shrink-0 flex items-center gap-1.5 active:scale-95 transition-all duration-200 cursor-pointer border ${
                      isSelected
                        ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25 scale-105"
                        : "bg-zinc-100 hover:bg-zinc-200/70 dark:bg-[#2C2C2E] dark:hover:bg-zinc-700 border-zinc-200/80 dark:border-white/5 text-zinc-800 dark:text-white shadow-2xs"
                    }`}
                  >
                    {isSelected && <span className="leading-none text-[10px]">✓</span>}
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-h-[24px]" />

          <button
            type="button"
            onClick={() => {
              if (!selectedDate || !selectedTime || !selectedTable) {
                triggerToast("Sana, vaqt va stolni tanlang");
                return;
              }
              setBookingStep("details");
            }}
            className="w-full py-4.5 rounded-2xl font-extrabold text-sm tracking-wide transition-all bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 cursor-pointer select-none shrink-0"
          >
            Keyingisi
          </button>
        </div>
      )}

      {/* VIEW 2: Fill Details */}
      {bookingStep === "details" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in select-none">
          <ProgressBar step={4} />

          <div className="text-left mt-2">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              Ma&apos;lumotlarni to&apos;ldiring
            </h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-2.5 text-left">
              <label className="block text-sm font-bold text-zinc-800 dark:text-white tracking-wide">Ism/Familiya</label>
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 focus-within:border-[#FF6B00] transition-colors">
                <span className="text-zinc-500 text-base">👤</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-base font-bold text-zinc-900 dark:text-white focus:ring-0 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  placeholder="Ism/Familiya"
                />
              </div>
            </div>

            <div className="space-y-2.5 text-left">
              <label className="block text-sm font-bold text-zinc-800 dark:text-white tracking-wide">Telefon raqam</label>
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 focus-within:border-[#FF6B00] transition-colors">
                <span className="text-zinc-500 text-base">📞</span>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-base font-bold text-zinc-900 dark:text-white focus:ring-0 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-mono"
                  placeholder="+998 ** *** ** **"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 text-left">
            <label className="block text-sm font-bold text-zinc-800 dark:text-white tracking-wide">Ma&apos;lumot</label>
            <div className="rounded-[20px] bg-zinc-100 dark:bg-[#2C2C2E] border border-zinc-200/80 dark:border-white/5 p-5 text-left shadow-2xs">
              <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Band qilingan vaqtgacha yetib kelishingizni so&apos;raymiz. Kechikish{" "}
                <span className="text-zinc-900 dark:text-white font-extrabold">{venueDetail?.venue.late_grace_minutes ?? 15} daqiqadan</span> oshsa, band avtomatik bekor qilinishi mumkin.
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-[40px]" />

          <button
            onClick={() => setBookingStep("checkout")}
            className="w-full py-4.5 rounded-[24px] font-extrabold text-sm tracking-wide transition-all bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 cursor-pointer"
          >
            Tasdiqlash va davom etish
          </button>
        </div>
      )}

      {/* VIEW 3: To'lov Ma'lumotlari */}
      {bookingStep === "checkout" && (
        <div className="flex-1 flex flex-col gap-4.5 px-5 py-4 animate-fade-in text-left">
          {/* Payment Card Selector */}
          <button
            type="button"
            onClick={() => comingSoon("Onlayn to'lov")}
            className="rounded-[26px] border border-zinc-200/80 dark:border-white/5 bg-white dark:bg-[#2C2C2E] p-4.5 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none hover:border-[#FF6B00]/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-extrabold text-zinc-900 dark:text-white group-hover:text-[#FF6B00] transition-colors">
                  Onlayn to&apos;lov
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Tez orada. Hozircha to&apos;lov muassasa bilan kelishiladi
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200/60 dark:border-transparent flex items-center justify-center text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-white transition-colors">
              <ChevronDown className="h-4 w-4" />
            </div>
          </button>

          {/* Promokod field */}
          <button
            type="button"
            onClick={() => comingSoon("Promokodlar")}
            className="rounded-[26px] border border-zinc-200/80 dark:border-white/5 bg-white dark:bg-[#2C2C2E] p-4.5 flex items-center justify-between cursor-pointer hover:border-[#FF6B00]/40 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Percent className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-extrabold text-zinc-900 dark:text-white group-hover:text-[#FF6B00] transition-colors">
                  Promokod kiriting
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Tez orada</p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200/60 dark:border-transparent flex items-center justify-center text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-white transition-colors">
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>

          {/* Invoicing calculations Card */}
          <div className="rounded-[28px] border border-zinc-200/80 dark:border-white/5 bg-white dark:bg-[#2C2C2E] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
              <h3 className="font-black text-xs text-zinc-400 dark:text-zinc-400 uppercase tracking-widest">
                HISOB VARAG&apos;I
              </h3>
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                Tafsilotlar
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Sana va vaqt:</span>
                <span className="font-extrabold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-zinc-200/50 dark:border-white/5">
                  {dateLabel(selectedDate)} • {selectedTime}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Mehmonlar:</span>
                <span className="font-extrabold text-zinc-900 dark:text-white">
                  {guests} kishi{selectedTableInfo ? ` (${selectedTableInfo.number}-stol)` : ""}
                </span>
              </div>

              {preorderCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">Oldindan buyurtma ({preorderCount} ta):</span>
                  <span className="font-extrabold text-zinc-900 dark:text-white">{formatPrice(preorderTotal)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 pt-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  JAMI SUMMA
                </span>
                <span className="text-xs text-zinc-400">Muassasa bron yaratilgach hisoblaydi</span>
              </div>
              {preorderCount > 0 && (
                <div className="text-2xl sm:text-3xl font-black text-[#FF6B00] tracking-tight">
                  {formatPrice(preorderTotal)}
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div role="alert" className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500 text-center font-bold">
              {submitError}
            </div>
          )}

          <div className="flex-1 min-h-[30px]" />

          <button
            type="button"
            onClick={handleCompletePayment}
            disabled={loading}
            className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF7A1A] hover:from-[#E05000] hover:to-[#FF6B00] text-white font-black text-base tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/30 flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 text-white" />
                <span>Bron qilinmoqda...</span>
              </>
            ) : (
              <span>{submitError ? "Qayta urinish" : "Bron qilish"}</span>
            )}
          </button>
        </div>
      )}

      {/* VIEW 4: Ticket Confirmation */}
      {bookingStep === "ticket" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in select-none">
          <div
            onClick={() => setBookingStep("qr")}
            className="rounded-[32px] border border-zinc-200/80 dark:border-white/5 bg-white dark:bg-[#393939] overflow-hidden shadow-lg dark:shadow-2xl relative flex flex-col cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors"
          >
            <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-900">
              {coverPhoto && <Image src={coverPhoto} alt={venueName} fill unoptimized sizes="448px" className="object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

              <div className="absolute bottom-4 left-5 right-5 text-left">
                <h3 className="text-lg font-black text-white leading-tight">{venueName}</h3>

                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-white/80 mt-1">
                  {venueDetail?.is_open_now ? <span className="text-[#10B981]">Ochiq</span> : <span>Yopiq</span>}
                </div>
              </div>
            </div>

            <div className="p-5.5 space-y-4">
              <div className="space-y-1.5 text-left border-b border-zinc-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-bold">
                  <Phone className="h-3.5 w-3.5 text-[#FF6B00]" />
                  <span>{venuePhone}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-bold">
                  <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" />
                  <span className="truncate">{venueLocation}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-left">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-semibold">Holat:</span>
                  <span className={`font-extrabold ${createdBooking?.status === "confirmed" ? "text-emerald-600 dark:text-emerald-400" : "text-[#FF6B00]"}`}>
                    {createdBooking ? bookingStatus(createdBooking.status).label : ""}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-semibold">Chek raqami:</span>
                  <span className="text-zinc-900 dark:text-white font-extrabold font-mono">
                    {createdBooking?.ticket_code}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-semibold">Belgilandi:</span>
                  <span className="text-zinc-900 dark:text-white font-extrabold">
                    {createdBooking ? `${formatTime(createdBooking.start_time)} • ${formatDate(createdBooking.booking_date)}` : ""}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-semibold">Stol raqami:</span>
                  <span className="text-zinc-900 dark:text-white font-extrabold">{selectedTableInfo ? `${selectedTableInfo.number} - stol` : "—"}</span>
                </div>

                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-zinc-500 font-semibold">Jami summa:</span>
                  <div className="px-3 py-1 bg-[#FF6B00] text-white font-black rounded-lg text-xs tracking-wide shadow-md shadow-[#FF6B00]/15">
                    {formatPrice(createdBooking?.total_amount ?? 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative h-6 w-full flex items-center justify-between">
              <div className="w-3.5 h-6 bg-white dark:bg-[var(--background)] rounded-r-full -ml-px border-y border-r border-zinc-200/80 dark:border-white/5" />
              <div className="flex-1 border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 mx-2" />
              <div className="w-3.5 h-6 bg-white dark:bg-[var(--background)] rounded-l-full -mr-px border-y border-l border-zinc-200/80 dark:border-white/5" />
            </div>

            <div className="p-5.5 flex flex-col items-center gap-4">
              <span className="text-xs font-mono font-black text-zinc-400 dark:text-zinc-500 tracking-[0.2em]">
                {createdBooking?.ticket_code}
              </span>

              <button
                type="button"
                onClick={() => setBookingStep("qr")}
                className="px-4.5 py-3 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center gap-2.5 text-[#FF6B00] hover:bg-[#FF6B00]/20 active:scale-95 transition-all text-[11px] font-extrabold uppercase tracking-wide cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>QR kod orqali ko&apos;rish</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/tickets"
              className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Mening Chiptalarimga o&apos;tish</span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <button
              onClick={() => router.push("/")}
              className="w-full py-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/5 hover:border-zinc-300 dark:hover:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold text-xs tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Bosh sahifaga qaytish</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 5: QR Code Card View */}
      {bookingStep === "qr" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 justify-between animate-fade-in text-center">
          <div className="w-1" />

          <div className="w-full max-w-[300px] bg-white rounded-[40px] p-7 shadow-2xl flex flex-col items-center gap-6 mx-auto animate-scale-up">
            <div className="p-1 bg-white rounded-2xl">
              {createdBookingDetail?.qr_token && <BookingQr token={createdBookingDetail.qr_token} />}
            </div>

            <div className="text-center">
              <p className="text-zinc-900 text-xs font-black tracking-tight leading-relaxed">
                Ushbu QR kodni sotuvchiga ko&apos;rsating
              </p>
              <p className="text-zinc-400 font-mono text-[10px] mt-1">
                {createdBooking?.ticket_code}
              </p>
            </div>
          </div>

          <div className="w-1" />

          <button
            onClick={() => setBookingStep("ticket")}
            className="w-full py-4.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/20 select-none shrink-0 cursor-pointer"
          >
            Ortga
          </button>
        </div>
      )}

    </div>
  );
}

export default function BookingPage({ params }: Props) {
  const { id } = use(params);

  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex-1 w-full bg-[var(--background)]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64 bg-[var(--background)] text-white">
              <Loader2 className="animate-spin h-8 w-8 text-[#FF6B00]" />
            </div>
          }
        >
          <BookingContent id={id} />
        </Suspense>
      </main>
    </div>
  );
}
