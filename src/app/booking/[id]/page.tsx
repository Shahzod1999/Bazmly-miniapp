"use client";

import React, { use, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  CheckCircle,
  Phone,
  ChevronRight,
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
  ArrowCircleRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CallIcon,
  CardIcon,
  CheckIcon,
  MinusIcon,
  PercentSquareIcon,
  PlusIcon,
  UserIcon,
} from "@/components/nav-icons";
import {
  venueService,
  bookingService,
  AvailableTableRead,
  BookingOwnerDetail,
} from "@/lib/api";

interface Props {
  params: Promise<{ id: string }>;
}


// Figma stepper (Select date 55:1006): 4 bosqich, 24px doiralar, 88px oraliq, 2px chiziq
const STEPS = ["Restoranni belgilang", "Kun va vaqtni belgilang", "Menu", "Ma‘lumotlarni tasdiqlash"];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="relative mx-auto w-[288px] h-[67px] select-none" aria-label={`${step}-bosqich, jami ${STEPS.length}`}>
      <span className="absolute left-2 right-2 top-[12px] h-0.5 bg-[#DADADA] dark:bg-white/10" aria-hidden="true" />
      <span
        className="absolute left-2 top-[12px] h-0.5 bg-[#E85102] transition-all duration-300"
        style={{ width: `${((step - 1) / (STEPS.length - 1)) * 272}px` }}
        aria-hidden="true"
      />
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n <= step;
        return (
          <div key={label} className="absolute top-0 w-6 flex flex-col items-center gap-4" style={{ left: `${i * 88}px` }}>
            <span
              className={`relative w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                active ? "bg-[#E85102]" : "bg-[#DADADA] dark:bg-white/15"
              }`}
            >
              {done ? <CheckIcon className="w-3 h-2.5" /> : n}
            </span>
            <span
              className={`w-[88px] text-center text-xs leading-4 font-semibold ${
                active ? "text-[#1E1E1E] dark:text-white" : "text-[#DADADA] dark:text-white/30"
              }`}
            >
              {label}
            </span>
          </div>
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
    else if (bookingStep === "ticket") router.replace("/feed"); // bron yaratilgan — qayta yuborilmasin
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
        <button type="button" onClick={detailQuery.retry} className="px-5 py-3 rounded-2xl bg-[#E85102] text-white text-sm font-bold">
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
      {/* Yuqori panel (Figma: 32px orqaga, markazda joy nomi 16/Medium + doirali o'q) */}
      <div className="h-8 mt-4 px-5 flex items-center justify-between gap-3 select-none shrink-0 z-30">
        <button
          type="button"
          onClick={goBack}
          className="w-8 h-8 flex items-center justify-center text-black dark:text-white active:scale-90 transition-transform cursor-pointer"
          aria-label="Orqaga"
        >
          <ArrowLeftIcon className="w-8 h-8" />
        </button>
        <span className="min-w-0 flex items-center gap-1.5 text-base font-medium text-[#1F1F1F] dark:text-white">
          <span className="truncate">{venueName}</span>
          <ArrowCircleRightIcon className="w-[18px] h-[18px] shrink-0 text-[#292D32] dark:text-white" />
        </span>
        <span className="w-8 h-8" aria-hidden="true" />
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-[calc(var(--tg-safe-top)+80px)] left-1/2 transform -translate-x-1/2 z-[999] px-4 py-3 rounded-2xl bg-[#E85102] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <CheckCircle className="h-4.5 w-4.5 shrink-0 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: Parameters Setup (Figma "Select date") */}
      {bookingStep === "params" && (
        <div className="flex-1 flex flex-col pt-[42px] animate-fade-in select-none">
          <ProgressBar step={2} />

          <div className="mt-[30px] flex flex-col gap-[30px] text-left">
            {/* Necha kishi uchun */}
            <div className="px-6 flex items-center justify-between gap-6">
              <h3 className="text-xl leading-[22px] font-bold text-[#1F1F1F] dark:text-white">Necha kishi uchun</h3>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label="Kamaytirish"
                  onClick={() => setGuests((prev) => Math.max(1, prev - 1))}
                  className="w-9 h-9 rounded-[14px] bg-[#F2F2F2] dark:bg-white/10 text-black dark:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
                <span className="min-w-[18px] text-center text-2xl leading-[22px] font-semibold text-black dark:text-white">{guests}</span>
                <button
                  type="button"
                  aria-label="Ko'paytirish"
                  onClick={() => setGuests((prev) => prev + 1)}
                  className="w-9 h-9 rounded-2xl bg-[#F2F2F2] dark:bg-white/10 text-black dark:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Joyni belgilash (stol) */}
            <div className="flex flex-col gap-6">
              <div className="px-5 flex items-center justify-between">
                <h3 className="text-xl leading-[22px] font-bold text-[#1F1F1F] dark:text-white">Joyni belgilash</h3>
                {loadingTables && <Loader2 className="h-4 w-4 animate-spin text-[#E85102]" />}
              </div>
              <div className="px-5 flex items-center gap-5 min-h-[86px] overflow-x-auto scrollbar-none">
                {!tablesKey && <p className="text-base text-[#B3B3B3]">Avval sana va vaqtni tanlang</p>}
                {tablesQuery.state.status === "error" && (
                  <button type="button" onClick={tablesQuery.retry} className="text-base font-bold text-[#E85102]">
                    Stollarni yuklab bo&apos;lmadi. Qayta urinish
                  </button>
                )}
                {tablesQuery.state.status === "success" && freeTables.length === 0 && (
                  <p className="text-base text-[#B3B3B3]">Bu vaqtda bo&apos;sh stol yo&apos;q</p>
                )}
                {freeTables.map((table) => {
                  const isSelected = selectedTable === table.id;
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setSelectedTable(table.id)}
                      aria-pressed={isSelected}
                      aria-label={`${table.number}-stol, ${table.seats} o'rin`}
                      className={`shrink-0 h-[86px] min-w-[57px] px-4 rounded-xl flex items-center justify-center text-[40px] leading-[22px] font-bold transition-colors active:scale-95 cursor-pointer ${
                        isSelected ? "bg-[#E85102] text-white" : "text-[#E85102]"
                      }`}
                    >
                      {table.number}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sanani belgilash */}
            <div className="flex flex-col gap-6">
              <h3 className="px-5 text-xl leading-[22px] font-bold text-[#1F1F1F] dark:text-white">Sanani belgilash</h3>
              <div className="px-5 flex gap-3 overflow-x-auto scrollbar-none">
                {dates.map((iso) => {
                  const d = parseISODate(iso);
                  const isSelected = selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        setSelectedDate(iso);
                        setSelectedTime(null);
                        setSelectedTable(null);
                      }}
                      aria-pressed={isSelected}
                      className={`shrink-0 w-14 h-[111px] rounded-[14px] flex flex-col items-center justify-center gap-4 font-bold transition-colors active:scale-95 cursor-pointer ${
                        isSelected ? "bg-[#E85102] text-white" : "bg-[#F2F2F2] dark:bg-white/10 text-[#E85102]"
                      }`}
                    >
                      <span className="text-xs leading-[9px]">{weekdayShort(d)}</span>
                      <span className="text-2xl leading-[18px]">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vaqtni belgilash */}
            <div className="flex flex-col gap-6">
              <h3 className="px-5 text-xl leading-[22px] font-bold text-[#1F1F1F] dark:text-white">Vaqtni belgilash</h3>
              <div className="px-5 flex gap-3 overflow-x-auto scrollbar-none min-h-[44px]">
                {!selectedDate && <p className="text-base text-[#B3B3B3] self-center">Avval sanani tanlang</p>}
                {selectedDate && times.length === 0 && <p className="text-base text-[#B3B3B3] self-center">Bu kuni bo&apos;sh vaqt yo&apos;q</p>}
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
                      aria-pressed={isSelected}
                      className={`shrink-0 h-11 px-6 rounded-[14px] text-base font-bold transition-colors active:scale-95 cursor-pointer ${
                        isSelected ? "bg-[#E85102] text-white" : "bg-[#F2F2F2] dark:bg-white/10 text-[#E85102]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[24px]" />

          <div className="px-6 pb-[max(var(--tg-safe-bottom),16px)]">
            <button
              type="button"
              onClick={() => {
                if (!selectedDate || !selectedTime || !selectedTable) {
                  triggerToast("Sana, vaqt va stolni tanlang");
                  return;
                }
                setBookingStep("details");
              }}
              className={`w-full h-14 rounded-[64px] text-xl leading-[22px] font-bold text-white transition-colors active:scale-[0.98] cursor-pointer ${
                selectedDate && selectedTime && selectedTable ? "bg-[#E85102]" : "bg-[#FADCCC]"
              }`}
            >
              Keyingisi
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: Fill Details (Figma "Information" 55:1541) */}
      {bookingStep === "details" && (
        <div className="flex-1 flex flex-col pt-[42px] animate-fade-in select-none">
          <ProgressBar step={4} />

          <div className="mt-10 px-6 flex flex-col gap-8 text-left">
            <h1 className="text-2xl leading-[22px] font-bold text-[#1F1F1F] dark:text-white">Ma&apos;lumotlarni to&apos;ldiring</h1>

            <label className="flex flex-col gap-6">
              <span className="text-base leading-[22px] text-[#1F1F1F] dark:text-white/80">Ism/Familiya</span>
              <span className="flex flex-col gap-6">
                <span className="flex items-center gap-3">
                  <UserIcon className="w-6 h-6 shrink-0 text-[#292D32] dark:text-white" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-transparent p-0 text-xl leading-[22px] font-bold text-[#1F1F1F] dark:text-white outline-none placeholder:text-[#1F1F1F] dark:placeholder:text-white/40"
                    placeholder="Ism/Familiya"
                  />
                </span>
                <span className="h-px bg-[#D9D9D9] dark:bg-white/10" />
              </span>
            </label>

            <label className="flex flex-col gap-6">
              <span className="text-base leading-[22px] text-[#1F1F1F] dark:text-white/80">Telefon raqam</span>
              <span className="flex flex-col gap-6">
                <span className="flex items-center gap-3">
                  <CallIcon className="w-6 h-6 shrink-0 text-[#292D32] dark:text-white" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-transparent p-0 text-xl leading-[22px] font-bold text-[#1F1F1F] dark:text-white outline-none placeholder:text-[#1F1F1F] dark:placeholder:text-white/40"
                    placeholder="+998 ** *** ** **"
                  />
                </span>
                <span className="h-px bg-[#D9D9D9] dark:bg-white/10" />
              </span>
            </label>

            <div className="flex flex-col gap-6">
              <span className="text-base leading-[22px] text-[#1F1F1F] dark:text-white/80">Ma&apos;lumot</span>
              <p className="rounded-2xl bg-[#F2F2F2] dark:bg-white/10 p-6 text-base leading-[26px] text-[#1F1F1F] dark:text-white">
                Band qilingan vaqtgacha yetib kelishingizni so&apos;raymiz. Kechikish {venueDetail?.venue.late_grace_minutes ?? 15} daqiqadan oshsa, band avtomatik
                bekor qilinishi mumkin.
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-[24px]" />

          <div className="px-6 pb-[max(var(--tg-safe-bottom),16px)]">
            <button
              onClick={() => setBookingStep("checkout")}
              disabled={!fullName.trim() || digitsOnly(phoneNumber).length < 9}
              className="w-full h-14 rounded-[64px] text-xl leading-[22px] font-bold text-white bg-[#E85102] disabled:bg-[#FADCCC] transition-colors active:scale-[0.98] cursor-pointer"
            >
              Keyingisi
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: To'lov (Figma "Information" 2283:4773 — "To'lov usuli") */}
      {bookingStep === "checkout" && (
        <div className="flex-1 flex flex-col pt-[42px] animate-fade-in text-left">
          <ProgressBar step={4} />

          <div className="mt-10 px-6 flex flex-col gap-8">
            <h1 className="text-2xl leading-[22px] font-bold text-[#1F1F1F] dark:text-white">To&apos;lov usuli</h1>

            <div className="flex flex-col gap-4">
              {/* Karta */}
              <div className="w-[250px] rounded-[20px] border border-[#E85102] bg-white dark:bg-[#2C2C2E] p-3 flex flex-col gap-5">
                <CardIcon className="w-[41px] h-[41px] text-[#E85102]" />
                <button
                  type="button"
                  onClick={() => comingSoon("Onlayn to'lov")}
                  className="h-11 px-3.5 rounded-[20px] bg-[#FF6A00] text-white flex items-center gap-2.5 self-start shadow-[0_0_60px_rgba(255,255,255,0.5)] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <span className="w-[27px] h-[27px] rounded-full bg-white text-black flex items-center justify-center">
                    <PlusIcon className="w-[13px] h-[13px]" />
                  </span>
                  <span className="text-xl leading-[22px] font-medium">Karta qo&apos;shish</span>
                </button>
              </div>

              {/* To'lov tafsilotlari */}
              <div className="rounded-[20px] bg-[#F2F2F2] dark:bg-white/10 px-3.5 py-3 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5 px-0.5">
                  <span className="text-sm leading-8 font-medium text-[#181818] dark:text-white">To&apos;lov</span>
                  <button
                    type="button"
                    onClick={() => comingSoon("Promokodlar")}
                    className="flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="flex items-center gap-4">
                      <span className="w-7 h-7 rounded-[17.5px] bg-[#742CFF] text-white flex items-center justify-center">
                        <PercentSquareIcon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="text-xl leading-8 font-semibold text-black dark:text-white">Promokod</span>
                    </span>
                    <ArrowRightIcon className="w-5 h-5 rotate-90 text-black dark:text-white" />
                  </button>
                </div>

                <div className="rounded-[10px] bg-white dark:bg-[#2C2C2E] px-2 py-1.5">
                  <div className="px-1.5 py-1.5 flex flex-col gap-1">
                    <span className="text-xs leading-[17px] text-[#494949] dark:text-white/60">
                      {dateLabel(selectedDate)} • {selectedTime} · {guests} kishi{selectedTableInfo ? ` · ${selectedTableInfo.number}-stol` : ""}
                    </span>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-base leading-[22px] text-[#181818] dark:text-white">Jami to&apos;lov:</span>
                      <span className="text-xl leading-7 font-semibold text-[#181818] dark:text-white">
                        {preorderCount > 0 ? formatPrice(preorderTotal) : "Muassasada"}
                      </span>
                    </span>
                    {preorderCount > 0 && (
                      <span className="text-xs leading-[17px] text-[#494949] dark:text-white/60">Oldindan buyurtma: {preorderCount} ta</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {submitError && (
              <div role="alert" className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-500 text-center font-semibold">
                {submitError}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[24px]" />

          <div className="px-6 pb-[max(var(--tg-safe-bottom),16px)]">
            <button
              type="button"
              onClick={handleCompletePayment}
              disabled={loading}
              className="w-full h-14 rounded-[64px] bg-[#E85102] disabled:bg-[#FADCCC] text-white text-xl leading-[22px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Bron qilinmoqda...
                </>
              ) : submitError ? (
                "Qayta urinish"
              ) : (
                "Tasdiqlash va band qilish"
              )}
            </button>
          </div>
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
                  <Phone className="h-3.5 w-3.5 text-[#E85102]" />
                  <span>{venuePhone}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-bold">
                  <MapPin className="h-3.5 w-3.5 text-[#E85102]" />
                  <span className="truncate">{venueLocation}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-left">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-semibold">Holat:</span>
                  <span className={`font-extrabold ${createdBooking?.status === "confirmed" ? "text-emerald-600 dark:text-emerald-400" : "text-[#E85102]"}`}>
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
                  <div className="px-3 py-1 bg-[#E85102] text-white font-black rounded-lg text-xs tracking-wide shadow-md shadow-[#E85102]/15">
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
                className="px-4.5 py-3 rounded-full bg-[#E85102]/10 border border-[#E85102]/20 flex items-center gap-2.5 text-[#E85102] hover:bg-[#E85102]/20 active:scale-95 transition-all text-[11px] font-extrabold uppercase tracking-wide cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>QR kod orqali ko&apos;rish</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/feed"
              className="w-full py-4 rounded-2xl bg-[#E85102] hover:bg-[#C94600] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-[#E85102]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Band qilingan joylarga o&apos;tish</span>
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
            className="w-full py-4.5 rounded-2xl bg-[#E85102] hover:bg-[#C94600] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#E85102]/20 select-none shrink-0 cursor-pointer"
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
              <Loader2 className="animate-spin h-8 w-8 text-[#E85102]" />
            </div>
          }
        >
          <BookingContent id={id} />
        </Suspense>
      </main>
    </div>
  );
}
