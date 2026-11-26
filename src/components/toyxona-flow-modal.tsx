"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, CheckCircle, Check, Sparkles, Users, Utensils, Pencil, Receipt, FileText, ImageOff } from "lucide-react";
import { comingSoon } from "@/components/app-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTelegramBackButton } from "@/lib/telegram";
import { bookingService, venueService, type BookingOwnerDetail, type ServicePriceUnit, type VenueDetailRead, type VenueServiceRead } from "@/lib/api";
import { bookingStatus, timeSlots, upcomingDates } from "@/lib/booking";
import { addMinutes, digitsOnly, formatDate, formatSom, formatTime, parseISODate, toApiTime, toE164Uz, weekdayShort } from "@/lib/format";
import { errorMessage, useApiQuery } from "@/lib/use-api";

/*
 * To'yxonani band qilish oqimi (dizayn avvalgidek):
 * 1) sana va vaqt — band sanalar `getAvailability`, vaqtlar ish soatidan;
 * 2) mehmonlar soni — to'yxona sig'imi oralig'ida;
 * 3) dasturxon va qo'shimcha xizmatlar — `getServices`;
 * 4) tekshirish va `bookHall`; 6) bron yuborildi.
 * Narxlar faqat backend'dan; onlayn to'lov hozircha yo'q.
 */

const DAYS_AHEAD = 90;
const EVENT_MINUTES = 300;

const UNIT: Record<ServicePriceUnit, string> = {
  per_event: "tadbir uchun",
  per_guest: "1 kishi uchun",
  per_hour: "1 soat uchun",
  fixed: "",
};

function servicePrice(service: VenueServiceRead): string {
  const unit = UNIT[service.price_unit];
  return `${formatSom(service.price)}${unit ? ` · ${unit}` : ""}`;
}

function VenueCover({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-white/5 text-zinc-400" aria-hidden="true">
        <ImageOff className="w-8 h-8" />
      </div>
    );
  }
  return <Image src={url} alt={name} fill unoptimized sizes="448px" className="object-cover" />;
}

/** To'yxona sig'imi oralig'ida mehmonlar soni variantlari (10 ga yaxlitlangan) */
function guestCounts(min: number | null, max: number | null): number[] {
  const low = Math.max(10, min ?? 50);
  const high = Math.max(low, max ?? low * 4);
  if (high === low) return [low];
  const steps = 5;
  const values = new Set<number>();
  for (let i = 0; i < steps; i += 1) {
    const raw = low + ((high - low) * i) / (steps - 1);
    values.add(Math.min(high, Math.max(low, Math.round(raw / 10) * 10)));
  }
  return [...values].sort((a, b) => a - b);
}

interface ToyxonaFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: VenueDetailRead;
  theme?: string;
}

export default function ToyxonaFlowModal({ isOpen, onClose, venue, theme = "light" }: ToyxonaFlowModalProps) {
  const isDark = theme === "dark";
  const router = useRouter();
  const { user } = useAuth();
  const venueId = venue.venue.id;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 6>(1);

  // 1-qadam: sana va vaqt
  const [now] = useState(() => new Date());
  const [allDates] = useState(() => upcomingDates(DAYS_AHEAD));
  const dateList = allDates.slice(Math.max(0, venue.venue.min_advance_booking_days));
  const firstDate = dateList[0];
  const lastDate = dateList[dateList.length - 1];
  const availability = useApiQuery(isOpen && firstDate ? `availability:${venueId}:${firstDate}:${lastDate}` : null, () =>
    venueService.getAvailability(venueId, firstDate, lastDate)
  );
  const blocked = new Set(availability.state.status === "success" ? availability.state.data.dates : []);
  const dates = dateList.map((iso) => {
    const d = parseISODate(iso);
    return { day: weekdayShort(d), date: iso, label: String(d.getDate()), highlight: false, blocked: blocked.has(iso) };
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const times = selectedDate ? timeSlots(selectedDate, venue.working_hours, EVENT_MINUTES, now).map((t) => ({ time: t, highlight: false })) : [];
  const endTime = selectedTime ? addMinutes(selectedTime, EVENT_MINUTES) : "";
  const dateText = selectedDate ? formatDate(selectedDate) : "";

  // 2-qadam: mehmonlar soni
  const guestOptions = guestCounts(venue.venue.capacity_min, venue.venue.capacity_max).map((count) => ({
    count,
    label: `${count} kishi`,
    hint: venue.venue.capacity_max ? `Zal sig‘imi: ${venue.venue.capacity_min ?? ""}–${venue.venue.capacity_max} kishi` : "Taxminiy mehmonlar soni",
  }));
  const [selectedGuestTier, setSelectedGuestTier] = useState(0);
  const guestCount = guestOptions[Math.min(selectedGuestTier, guestOptions.length - 1)]?.count ?? 0;

  // 3-qadam: dasturxon va xizmatlar
  const [cateringMode, setCateringMode] = useState<"custom" | "ready">("custom");
  const servicesQuery = useApiQuery(isOpen ? `services:${venueId}` : null, () => venueService.getServices(venueId, venue.venue.venue_group_id));
  const activeServices = servicesQuery.state.status === "success" ? servicesQuery.state.data.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order) : [];
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const toggleService = (serviceId: number) =>
    setSelectedServices((prev) => (prev.includes(serviceId) ? prev.filter((x) => x !== serviceId) : [...prev, serviceId]));
  const chosenServices = activeServices.filter((s) => selectedServices.includes(s.id));

  // 4-qadam: aloqa va yuborish
  const contactMissing = !user?.phone;
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<BookingOwnerDetail | null>(null);
  const booking = created?.booking ?? null;

  const coverUrl = venue.photos.find((p) => p.is_cover)?.url ?? venue.photos[0]?.url ?? null;

  const goBack = () => {
    if (currentStep === 1) onClose();
    else if (currentStep !== 6) setCurrentStep((currentStep - 1) as 1 | 2 | 3);
  };

  const submitBooking = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/toyxona/${venueId}`)}`);
      return;
    }
    if (!selectedDate || !selectedTime || !endTime) {
      setCurrentStep(1);
      return;
    }
    const phoneDigits = digitsOnly(contactMissing ? contactPhone : user.phone ?? "");
    if (phoneDigits.length < 9) {
      setSubmitError("Telefon raqamini to'liq kiriting");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await bookingService.bookHall({
        venue_id: venueId,
        booking_date: selectedDate,
        start_time: toApiTime(selectedTime),
        end_time: toApiTime(endTime),
        guests_count: guestCount,
        contact_name: `${user.first_name} ${user.last_name}`.trim(),
        contact_phone: toE164Uz(phoneDigits.slice(-9)),
        venue_service_ids: selectedServices,
      });
      setCreated(result);
      setCurrentStep(6);
    } catch (err) {
      setSubmitError(errorMessage(err, "Sanani band qilib bo'lmadi. Qaytadan urinib ko'ring."));
    } finally {
      setSubmitting(false);
    }
  };

  useTelegramBackButton(() => (currentStep === 6 ? onClose() : goBack()), isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-md h-full overflow-hidden flex flex-col shadow-2xl relative transition-colors duration-300 ${
          isDark ? "bg-[#1E1E1E] text-white" : "bg-white text-zinc-900"
        }`}
      >
        {/* =======================================================================
            STEP-BY-STEP HEADER & STEPPER (For Steps 1 to 6) - Figma 1:1
           ======================================================================= */}
        {currentStep !== 6 && (
          <div className="shrink-0 border-b border-zinc-100 dark:border-white/5 z-10 bg-inherit">
            {/* Top Navigation */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
              <button
                onClick={goBack}
                className="p-1 -ml-1 text-zinc-900 dark:text-white hover:opacity-75 active:scale-95 transition-all cursor-pointer"
                aria-label="Orqaga"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2]" />
              </button>
              <h3 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white text-center flex-1">
                {venue.venue.name}
              </h3>
              <button
                onClick={onClose}
                className="p-1 -mr-1 text-zinc-900 dark:text-white hover:opacity-75 active:scale-95 transition-all cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* 4-Step Stepper Progress Bar (Figma 1:1) */}
            <div className="px-3 pt-2 pb-2.5">
              <div className="flex items-start justify-between">
                {[
                  {
                    step: 1,
                    line1: "To'yxonani",
                    line2: "belgilang",
                  },
                  {
                    step: 2,
                    line1: "Kun va vaqtni",
                    line2: "belgilang",
                  },
                  {
                    step: 3,
                    line1: "Mehmonlar",
                    line2: "soni",
                  },
                  {
                    step: 4,
                    line1: "Chek va",
                    line2: "to'lov",
                  },
                ].map((item, idx) => {
                  const stepNumber = idx + 1;

                  // Step 1: always completed (venue chosen)
                  // Step 2: completed when past step 1 (currentStep > 1)
                  // Step 3: completed when past step 3 (currentStep >= 4)
                  // Step 4: completed on final receipt (currentStep >= 6)
                  const isCompleted =
                    stepNumber === 1 ||
                    (stepNumber === 2 && (currentStep as number) > 1) ||
                    (stepNumber === 3 && (currentStep as number) >= 4) ||
                    (stepNumber === 4 && (currentStep as number) >= 6);

                  // Is current step active?
                  const isActive =
                    (stepNumber === 2 && currentStep === 1) ||
                    (stepNumber === 3 && (currentStep === 2 || currentStep === 3)) ||
                    (stepNumber === 4 && currentStep === 4);

                  return (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col items-center flex-1 max-w-[84px]">
                        {/* Circle */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCompleted || isActive
                              ? "bg-[#E85102] text-white"
                              : isDark
                              ? "bg-zinc-800 text-zinc-400"
                              : "bg-zinc-200 text-zinc-500"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            stepNumber
                          )}
                        </div>

                        {/* 2-line Label (ALWAYS visible in Figma) */}
                        <div className="text-center mt-1 min-h-[26px]">
                          <span
                            className={`block text-[10px] leading-tight ${
                              isActive || isCompleted
                                ? "font-semibold text-zinc-900 dark:text-white"
                                : "text-zinc-400 dark:text-zinc-500 font-medium"
                            }`}
                          >
                            {item.line1}
                          </span>
                          <span
                            className={`block text-[10px] leading-tight ${
                              isActive || isCompleted
                                ? "font-semibold text-zinc-900 dark:text-white"
                                : "text-zinc-400 dark:text-zinc-500 font-medium"
                            }`}
                          >
                            {item.line2}
                          </span>
                        </div>
                      </div>

                      {/* Connecting Line between steps */}
                      {idx < 3 && (
                        <div
                          className={`flex-1 h-[2px] mt-3 mx-1 transition-colors ${
                            idx === 0 || // between 1 and 2 is always orange
                            (idx === 1 && (currentStep as number) >= 2) || // between 2 and 3
                            (idx === 2 && (currentStep as number) >= 4) // between 3 and 4
                              ? "bg-[#E85102]"
                              : isDark
                              ? "bg-zinc-800"
                              : "bg-zinc-200"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* =======================================================================
            VIEW 1: STEP 1 - SANANI VA VAQTNI BELGILASH (Figma Step 1)
           ======================================================================= */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-6 scrollbar-none">
              {/* Sanani belgilash */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Sanani belgilash
                </h3>

                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {dates.map((item, idx) => {
                    const isSelected = selectedDate === item.date;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDate(isSelected ? "" : item.date);
                          setSelectedTime("");
                        }}
                        disabled={item.blocked}
                        aria-label={`${item.label}-sana${item.blocked ? ", band" : ""}`}
                        className={`w-[54px] sm:w-[58px] h-[82px] rounded-[18px] flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#E85102] text-white shadow-md shadow-[#E85102]/25"
                            : isDark
                            ? "bg-[#2A2A2A] text-zinc-300 hover:bg-[#333333]"
                            : "bg-[#F5F5F7] text-zinc-800 hover:bg-[#EBECEF]"
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3] text-white mb-0.5" />
                        ) : (
                          <div className="w-3.5 h-3.5 mb-0.5" />
                        )}
                        <span
                          className={`text-[11px] font-medium leading-none mb-1.5 ${
                            isSelected
                              ? "text-white"
                              : item.highlight
                              ? "text-[#E85102] font-semibold"
                              : "text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          {item.day}
                        </span>
                        <span
                          className={`text-xl font-bold leading-none ${
                            isSelected
                              ? "text-white"
                              : item.highlight
                              ? "text-[#E85102]"
                              : "text-zinc-900 dark:text-zinc-200"
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vaqtni belgilash */}
              <div className="space-y-3 pt-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Vaqtni belgilash
                </h3>

                <div className="grid grid-cols-4 gap-2.5">
                  {selectedDate && times.length === 0 && (
                  <p className="col-span-full text-xs text-zinc-400 py-2">Bu kuni bo&apos;sh vaqt yo&apos;q</p>
                )}
                {!selectedDate && <p className="col-span-full text-xs text-zinc-400 py-2">Avval sanani tanlang</p>}
                {times.map((t, idx) => {
                    const isSelected = selectedTime === t.time;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedTime(isSelected ? "" : t.time)}
                        className={`py-2.5 px-2 rounded-full flex items-center justify-center gap-1 transition-all text-xs font-semibold cursor-pointer ${
                          isSelected
                            ? "bg-[#E85102] text-white font-bold shadow-md shadow-[#E85102]/25"
                            : isDark
                            ? "bg-[#2A2A2A] hover:bg-[#333333]"
                            : "bg-[#F5F5F7] hover:bg-[#EBECEF]"
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 stroke-[3] text-white shrink-0" />
                        )}
                        <span
                          className={
                            isSelected
                              ? "text-white"
                              : t.highlight
                              ? "text-[#E85102] font-bold"
                              : "text-zinc-700 dark:text-zinc-300"
                          }
                        >
                          {t.time}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Button Bar */}
            <div
              className={`p-4 border-t shrink-0 z-20 ${
                isDark ? "bg-[#1E1E1E] border-white/5" : "bg-white border-zinc-100"
              }`}
            >
              <button
                disabled={!selectedDate || !selectedTime}
                onClick={() => {
                  if (selectedDate && selectedTime) setCurrentStep(2);
                }}
                className={`w-full py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base text-center transition-all ${
                  selectedDate && selectedTime
                    ? "bg-[#E85102] hover:bg-[#C94600] text-white shadow-lg shadow-[#E85102]/25 active:scale-[0.99] cursor-pointer"
                    : isDark
                    ? "bg-[#382218] text-white/40 cursor-not-allowed"
                    : "bg-[#FFD6BF] text-white cursor-not-allowed"
                }`}
              >
                Keyingisi
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5" />
            </div>
          </div>
        )}

        {/* =======================================================================
            VIEW 2: STEP 2 - MEHMONLAR SONINI TANLASH (Figma Step 2)
           ======================================================================= */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 scrollbar-none">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Tadbiringiz uchun mehmonlar sonini tanlang
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed">
                  Tanlangan mehmonlar soni asosida taklif etiladigan zal va taomnoma menyusi o&apos;zgarishi mumkin.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {guestOptions.map((tier, idx) => {
                  const isSelected = selectedGuestTier === idx;
                  return (
                    <div
                      key={idx}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedGuestTier(idx);
                      }}
                      onClick={() => setSelectedGuestTier(idx)}
                      className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#E85102] bg-[#FFF9F6] dark:bg-[#E85102]/10"
                          : isDark
                          ? "border-white/10 bg-[#252528] hover:border-white/20"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-bold block text-zinc-900 dark:text-white">{tier.label}</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                          {tier.hint}
                        </span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#E85102] text-white shadow-sm"
                            : "border border-zinc-300 dark:border-white/20"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button Bar */}
            <div
              className={`p-4 border-t shrink-0 z-20 ${
                isDark ? "bg-[#1E1E1E] border-white/5" : "bg-white border-zinc-100"
              }`}
            >
              <button
                onClick={() => setCurrentStep(3)}
                className="w-full py-3.5 sm:py-4 rounded-full bg-[#E85102] hover:bg-[#C94600] text-white font-bold text-sm sm:text-base text-center transition-all shadow-lg shadow-[#E85102]/25 active:scale-[0.99] cursor-pointer"
              >
                Keyingisi
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5" />
            </div>
          </div>
        )}

        {/* =======================================================================
            VIEW 3: STEP 3 - DASTURXON MAHSULOTLARINI TANLASH (Figma Step 3)
           ======================================================================= */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3.5 scrollbar-none">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Dasturxon mahsulotlarini tanlang
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed">
                  Dasturxonni to‘liq to‘yxona tayyorlab berishi evaziga to‘yxona to‘loviga yana to‘lov qo‘shiladi!
                </p>
              </div>

              {/* 2 Options (Radio Cards matching Figma 1:1) */}
              <div className="space-y-2.5">
                {/* Option 1: O'zimiz tayyorlaymiz */}
                <div
                  onClick={() => setCateringMode("custom")}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    cateringMode === "custom"
                      ? "border-[#E85102] bg-[#FFF9F6] dark:bg-[#E85102]/10"
                      : isDark
                      ? "border-white/10 bg-[#252528] hover:border-white/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">O‘zimiz tayyorlaymiz</h4>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                      Hech qanday qo‘shimcha to‘lovsiz
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      cateringMode === "custom"
                        ? "bg-[#E85102] text-white shadow-sm"
                        : "border border-zinc-300 dark:border-white/20"
                    }`}
                  >
                    {cateringMode === "custom" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* Option 2: Tayyor dasturxon */}
                <div
                  onClick={() => comingSoon("Tayyor dasturxon paketlari")}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    cateringMode === "ready"
                      ? "border-[#E85102] bg-[#FFF9F6] dark:bg-[#E85102]/10"
                      : isDark
                      ? "border-white/10 bg-[#252528] hover:border-white/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Tayyor dasturxon</h4>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                      Menyu paketlari tez orada
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      cateringMode === "ready"
                        ? "bg-[#E85102] text-white shadow-sm"
                        : "border border-zinc-300 dark:border-white/20"
                    }`}
                  >
                    {cateringMode === "ready" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Qo'shimcha xizmatlar (API) */}
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Qo&apos;shimcha xizmatlar</h3>
                <span className="text-xs font-semibold text-[#E85102] bg-[#FFF2EA] dark:bg-[#E85102]/10 px-2.5 py-1 rounded-full">
                  Ixtiyoriy
                </span>
              </div>

              <div className="space-y-2.5">
                {servicesQuery.state.status === "loading" && <div className="h-16 rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse" />}
                {servicesQuery.state.status === "error" && (
                  <button type="button" onClick={servicesQuery.retry} className="text-xs font-bold text-[#E85102]">
                    Xizmatlarni yuklab bo&apos;lmadi. Qayta urinish
                  </button>
                )}
                {servicesQuery.state.status === "success" && activeServices.length === 0 && (
                  <p className="text-xs text-zinc-400">Qo&apos;shimcha xizmatlar kiritilmagan</p>
                )}
                {activeServices.map((item) => {
                  const isSelected = selectedServices.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => toggleService(item.id)}
                      className={`w-full p-3 rounded-2xl border flex items-center gap-3.5 text-left transition-all shadow-[0_1px_4px_rgba(0,0,0,0.02)] ${
                        isSelected
                          ? "border-[#E85102] bg-[#FFF9F6] dark:bg-[#E85102]/10"
                          : isDark
                          ? "bg-[#252528] border-white/5 text-white"
                          : "bg-white border-zinc-100 text-zinc-900"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-[#FFF5EF] dark:bg-[#E85102]/10 text-[#E85102] flex items-center justify-center shrink-0">
                        {isSelected ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Sparkles className="w-5 h-5 stroke-[2.2]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold leading-tight truncate text-zinc-900 dark:text-white">{item.name}</h5>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5 truncate">{servicePrice(item)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pinned Bottom Bar (Matching Figma 1:1) */}
            <div
              className={`p-4 border-t shrink-0 z-20 space-y-3 ${
                isDark
                  ? "bg-[#1E1E1E] border-white/5"
                  : "bg-white border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal leading-tight">Tanlangan xizmatlar</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">{selectedServices.length} ta</span>
              </div>

              <button
                onClick={() => setCurrentStep(4)}
                className="w-full py-3.5 sm:py-4 rounded-full bg-[#E85102] hover:bg-[#C94600] text-white font-bold text-sm sm:text-base text-center transition-all shadow-lg shadow-[#E85102]/25 active:scale-[0.99] cursor-pointer"
              >
                Keyingisi
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2" />
            </div>
          </div>
        )}


        {/* =======================================================================
            VIEW 4: STEP 4 - REVIEW & DETAILED PRICE REPORT (Figma Screen 5 Red Box)
           ======================================================================= */}
        {currentStep === 4 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3.5 scrollbar-none">
              {/* Venue Card with Header Banner */}
              <div className="rounded-3xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#252528] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                {/* Banner Image */}
                <div className="w-full h-40 sm:h-44 relative overflow-hidden">
                  <VenueCover url={coverUrl} name={venue.venue.name} />
                </div>

                {/* Card Details */}
                <div className="p-4 space-y-2">
                  {/* Selected Venue Tag */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#E85102]">
                    <CheckCircle className="w-3.5 h-3.5 fill-[#E85102] text-white" />
                    <span>Tanlangan to‘yxona</span>
                  </div>

                  {/* Venue Title */}
                  <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    {venue.venue.name}
                  </h3>

                  {/* Spec Row 1: Guests */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-md bg-[#FFF5EF] dark:bg-[#E85102]/10 text-[#E85102] flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span>{guestCount} mehmon · {dateText}, {selectedTime}–{endTime}</span>
                  </div>

                  {/* Spec Row 2: Catering */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-md bg-[#FFF5EF] dark:bg-[#E85102]/10 text-[#E85102] flex items-center justify-center shrink-0">
                      <Utensils className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      Dasturxonni o‘zimiz tayyorlaymiz
                    </span>
                  </div>

                  {/* Modify Selection button on right */}
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F7] dark:bg-white/10 hover:bg-[#EBECEF] dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                      <span>O‘zgartirish</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section: Detailed Price Report */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                  <Receipt className="w-4 h-4 text-[#E85102]" />
                  <span>Tanlangan xizmatlar</span>
                </div>

                <div className="p-4 rounded-3xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#252528] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
                  {chosenServices.length === 0 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Qo&apos;shimcha xizmat tanlanmadi</p>
                  )}
                  {chosenServices.map((service) => (
                    <div key={service.id} className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{service.name}</h4>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white text-right shrink-0">{servicePrice(service)}</span>
                    </div>
                  ))}

                  {/* Divider */}
                  <div className="h-px bg-zinc-100 dark:bg-white/10 my-0.5" />

                  {/* Yakuniy summa backend'da hisoblanadi */}
                  <div className="pt-0.5">
                    <h4 className="text-xs font-bold text-[#E85102]">Yakuniy summa</h4>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                      To‘yxona bron so‘rovini ko‘rib chiqqach hisoblaydi va tasdiqlaydi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Bar (Figma Screen 5) */}
            <div
              className={`p-4 border-t shrink-0 z-20 ${
                isDark
                  ? "bg-[#1E1E1E] border-white/5"
                  : "bg-white border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              {contactMissing && (
                <div className="mb-3 space-y-2">
                  <label className="block text-xs font-semibold text-zinc-500" htmlFor="hall-contact-phone">
                    Aloqa uchun telefon raqami
                  </label>
                  <input
                    id="hall-contact-phone"
                    type="tel"
                    inputMode="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-transparent text-sm font-semibold outline-none focus:border-[#E85102]"
                  />
                </div>
              )}
              {submitError && (
                <p role="alert" className="mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500 text-center font-bold">
                  {submitError}
                </p>
              )}
              <button
                onClick={submitBooking}
                disabled={submitting}
                className="w-full py-4 rounded-full bg-[#E85102] hover:bg-[#C94600] text-white font-bold text-base text-center transition-all shadow-lg shadow-[#E85102]/25 active:scale-[0.99] cursor-pointer"
              >
                {submitting ? "Yuborilmoqda..." : submitError ? "Qayta urinish" : "Band qilish"}
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2" />
            </div>
          </div>
        )}


        {/* =======================================================================
            VIEW 6: STEP 6 - MUVAFFAQIYATLI TASDIQLASH (Figma Screen 7)
           ======================================================================= */}
        {currentStep === 6 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 scrollbar-none">
              {/* Top Venue Card matching Screen 5 & 7 in Figma */}
              <div className="rounded-3xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#252528] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="w-full h-40 sm:h-44 relative overflow-hidden">
                  <VenueCover url={coverUrl} name={venue.venue.name} />
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#E85102]">
                    <CheckCircle className="w-3.5 h-3.5 fill-[#E85102] text-white" />
                    <span>Bron yuborildi</span>
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    {venue.venue.name}
                  </h3>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-md bg-[#FFF5EF] dark:bg-[#E85102]/10 text-[#E85102] flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span>{booking ? `${booking.guests_count} mehmon` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-md bg-[#FFF5EF] dark:bg-[#E85102]/10 text-[#E85102] flex items-center justify-center shrink-0">
                      <Utensils className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      {booking ? bookingStatus(booking.status).label : ""}
                    </span>
                  </div>
                </div>
              </div>

              {Number(booking?.deposit_amount ?? 0) > 0 && (
                <p className="rounded-2xl bg-[#FFF2EA] dark:bg-[#E85102]/10 p-3 text-xs font-semibold text-[#E85102] dark:text-[#E85102]">
                  Depozit: {formatSom(booking?.deposit_amount ?? 0)} — to‘lov kutilmoqda. Onlayn to‘lov tez orada qo‘shiladi.
                </p>
              )}

              {/* Section: Buyurtma tafsilotlari (Figma Screen 7) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                  <FileText className="w-4 h-4 text-[#E85102]" />
                  <span>Buyurtma tafsilotlari</span>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#252528] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 dark:text-zinc-500">To‘yxona nomi</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{venue.venue.name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 dark:text-zinc-500">Sana</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{booking ? `${formatDate(booking.booking_date)}, ${formatTime(booking.start_time)}` : ""}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 dark:text-zinc-500">Mehmonlar</span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {booking?.guests_count} kishi
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 dark:text-zinc-500">Chek raqami</span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {booking?.receipt_number}
                    </span>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-white/10 my-1" />

                  <div className="flex justify-between items-center pt-1 text-sm font-bold">
                    <span className="text-[#E85102]">Jami summa</span>
                    <span className="text-[#E85102] font-black text-base">{formatSom(booking?.total_amount ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Button */}
            <div
              className={`p-4 border-t shrink-0 z-20 ${
                isDark
                  ? "bg-[#1E1E1E] border-white/5"
                  : "bg-white border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              <button
                onClick={() => router.push(booking ? `/payment/${booking.id}` : "/tickets")}
                className="w-full py-4 rounded-full bg-[#E85102] hover:bg-[#C94600] text-white font-bold text-base shadow-lg shadow-[#E85102]/25 active:scale-95 transition-all cursor-pointer"
              >
                Chiptani ko‘rish
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
