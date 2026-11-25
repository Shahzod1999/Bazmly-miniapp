"use client";

import { useTelegramBackButton } from "@/lib/telegram";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Share2,
  Bookmark,
  BadgePercent,
  Star,
  Users,
  MapPin,
  ArrowRight,
  Snowflake,
  Utensils,
  Wifi,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import ToyxonaFlowModal from "@/components/toyxona-flow-modal";
import { useAuth } from "@/contexts/AuthContext";
import { engagementService, venueService } from "@/lib/api";
import { formatRating, formatSom } from "@/lib/format";
import { errorMessage, useApiQuery } from "@/lib/use-api";

export default function ToyxonaDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const venueId = Number(params?.id);
  const { user } = useAuth();
  const detailQuery = useApiQuery(Number.isInteger(venueId) && venueId > 0 ? `venue:${venueId}` : null, () => venueService.getVenueDetail(venueId));
  const detail = detailQuery.state.status === "success" ? detailQuery.state.data : null;
  const venue = detail?.venue ?? null;
  const gallery = (detail?.photos ?? []).map((p) => p.url);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const activeImage = pickedImage ?? detail?.photos.find((p) => p.is_cover)?.url ?? gallery[0] ?? null;
  const setActiveImage = setPickedImage;
  const favorites = useApiQuery(user ? `favorites:${user.id}` : null, () => engagementService.getFavorites());
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  const isSaved = savedOverride ?? (favorites.state.status === "success" ? favorites.state.data.some((f) => f.venue.id === venueId) : false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  useTelegramBackButton(() => router.back(), !showBookingModal);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage("Havola buferga nusxalandi!");
    } catch {
      setToastMessage("Havolani nusxalab bo'lmadi");
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/toyxona/${venueId}`)}`);
      return;
    }
    try {
      const res = await engagementService.toggleFavorite(venueId);
      setSavedOverride(res.is_favorite);
      setToastMessage(res.is_favorite ? "Sevimlilarga saqlandi ❤️" : "Saqlanganlardan olib tashlandi");
    } catch (err) {
      setToastMessage(errorMessage(err, "Saqlab bo'lmadi"));
    }
  };

  const openBooking = () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/toyxona/${venueId}`)}`);
      return;
    }
    setShowBookingModal(true);
  };

  // Restoranlar o'z sahifasida ochiladi
  const isRestaurant = detail !== null && detail.venue_type !== "toyxona";
  useEffect(() => {
    if (isRestaurant) router.replace(`/venue/${venueId}`);
  }, [isRestaurant, router, venueId]);

  if (detailQuery.state.status === "error" || !(venueId > 0)) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-bold">
          {detailQuery.state.status === "error" ? errorMessage(detailQuery.state.error, "To'yxona ma'lumotlarini yuklab bo'lmadi") : "To'yxona topilmadi"}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-5 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 text-sm font-bold">
            Orqaga
          </button>
          {detailQuery.state.status === "error" && (
            <button type="button" onClick={detailQuery.retry} className="px-5 py-3 rounded-2xl bg-[#FF5A00] text-white text-sm font-bold">
              Qayta urinish
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!detail || !venue || isRestaurant) {
    return (
      <div className={`w-full min-h-screen animate-pulse ${isDark ? "bg-[#1E1E1E]" : "bg-white"}`}>
        <div className="w-full h-80 bg-zinc-200 dark:bg-zinc-800" />
        <div className="p-5 space-y-3">
          <div className="h-6 w-2/3 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-1/2 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-20 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  const rating = formatRating(venue.rating_avg);
  const discount = Number(venue.discount_percent || 0);
  const capacity =
    venue.capacity_min && venue.capacity_max
      ? `${venue.capacity_min} - ${venue.capacity_max} gacha odam`
      : venue.capacity_max
      ? `${venue.capacity_max} gacha odam`
      : null;
  const address = `${venue.street}${venue.house_number ? `, ${venue.house_number}` : ""}`;

  return (
    <div
      className={`w-full min-h-screen flex flex-col relative transition-colors duration-300 select-none pb-12 ${
        isDark ? "bg-[#1E1E1E] text-white" : "bg-white text-zinc-900"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[80] px-4 py-2.5 rounded-2xl bg-zinc-900/90 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/10 backdrop-blur-md animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Image Viewport (Full-bleed edge-to-edge) */}
      <div className="w-full h-80 sm:h-96 relative overflow-hidden shrink-0">
        {activeImage ? (
          <Image src={activeImage} alt={venue.name} fill unoptimized priority sizes="448px" className="object-cover transition-all duration-300" />
        ) : (
          <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Navigation Buttons */}
        <div className="absolute top-5 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
            aria-label="Orqaga"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
              aria-label="Ulashish"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleSave}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
              aria-label="Saqlash"
            >
              <Bookmark
                className={`w-5 h-5 ${isSaved ? "fill-[#FF5A00] text-[#FF5A00]" : "text-white"}`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Gallery Thumbnails */}
        <div className="absolute bottom-3.5 left-0 right-0 z-10 flex justify-center px-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-full">
            {gallery.length > 1 && gallery.map((thumb, idx) => {
              const isSel = activeImage === thumb;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(thumb)}
                  className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer shadow-sm ${
                    isSel
                      ? "border-[#FF5A00] scale-105 opacity-100 ring-2 ring-[#FF5A00]/40"
                      : "border-white/80 opacity-85 hover:opacity-100"
                  }`}
                >
                  <Image src={thumb} alt={`${idx + 1}-rasm`} width={44} height={44} unoptimized className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Venue Information Body */}
      <div className="p-5 space-y-4">
        {/* Row 1: Badges & Rating */}
        <div className="flex items-center justify-between">
          {discount > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF8EE] border border-[#A7E9BE] text-[#16A34A] text-xs font-semibold">
              <BadgePercent className="w-3.5 h-3.5" />
              <span>{Math.round(discount)}% chegirma</span>
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
            <span>{rating ? `${rating} (${venue.reviews_count} ta sharh)` : "Hali baholanmagan"}</span>
          </div>
        </div>

        {/* Row 2: Title & Status */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {venue.name}
          </h1>
          <div className="flex items-center gap-1.5 text-sm font-bold text-[#16A34A] dark:text-[#22C55E]">
            <span className={`w-2 h-2 rounded-full ${detail.is_open_now ? "bg-[#16A34A] dark:bg-[#22C55E]" : "bg-zinc-400"}`} />
            <span className={detail.is_open_now ? "" : "text-zinc-500"}>{detail.is_open_now ? "Ochiq" : "Yopiq"}</span>
          </div>
        </div>

        {/* Row 3: Specifications */}
        <div className="space-y-2.5 pt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <div className="flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-zinc-500 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="12" x="2" y="6" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
            <span>{venue.base_price ? `${formatSom(venue.base_price)} · 1 kishi` : "Narx kelishiladi"}</span>
          </div>

          {capacity && (
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{capacity}</span>
            </div>
          )}

          {venue.requires_deposit && (
            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center gap-1 bg-[#16A34A] text-white px-2.5 py-0.5 rounded-lg text-xs font-bold">
                <span className="text-xs font-black">%</span>
                <span>Depozitlik{venue.deposit_percent ? ` (${Math.round(Number(venue.deposit_percent))}%)` : ""}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>{address}</span>
          </div>
        </div>

        {/* Row 4: Jami narx & Band qilish Button */}
        <div className="pt-2 pb-1 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-400 block font-normal">Narx (1 kishi)</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {venue.base_price ? formatSom(venue.base_price) : "—"}
            </span>
          </div>
          <button
            onClick={openBooking}
            className="px-6 py-3.5 rounded-2xl bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#FF5A00]/25 cursor-pointer"
          >
            <span>Band qilish</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Row 5: Tavsif */}
        <div className="space-y-1.5 pt-2">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Tavsif</h2>
          <p className="text-xs sm:text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {venue.description || venue.tagline || "Tavsif hali qo'shilmagan."}
          </p>
        </div>

        {/* Row 5b: To'yxona menyu paketlari */}
        <Link
          href={`/toyxona/${venueId}/menu`}
          className={`flex items-center gap-3 p-3 rounded-2xl border active:scale-[0.99] transition-all ${
            isDark
              ? "bg-zinc-800/80 border-white/5 text-zinc-200"
              : "bg-white border-zinc-100 text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
          }`}
        >
          <div className="w-16 h-16 rounded-xl shrink-0 bg-[#FFF4ED] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center" aria-hidden="true">
            <Utensils className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-zinc-900 dark:text-white">Menyu paketlari</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Tez orada
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#FF5A00] stroke-[2.5] shrink-0" />
        </Link>

        {/* Row 6: Amenities Grid (6 cards) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {detail.amenities.map((amenity) => ({ label: amenity.name, type: amenity.slug, icon: amenity.icon_url })).map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-2xl border ${
                isDark
                  ? "bg-zinc-800/80 border-white/5 text-zinc-200"
                  : "bg-white border-zinc-100 text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FFF4ED] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center shrink-0">
                {item.type === "parking" && <span className="font-extrabold text-sm">P</span>}
                {item.type === "audio" && (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
                  </svg>
                )}
                {item.type === "stage" && (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="11" r="5" />
                    <path d="M6 10h.01M10 10h.01" />
                    <path d="M6 13c.8 1 2 1 2.8 0" />
                    <circle cx="16" cy="13" r="5" />
                    <path d="M14 12h.01M18 12h.01" />
                    <path d="M14 15c.8-.8 2-.8 2.8 0" />
                  </svg>
                )}
                {item.type === "ac" && <Snowflake className="w-5 h-5 stroke-[2.2]" />}
                {item.type === "kitchen" && <Utensils className="w-5 h-5 stroke-[2.2]" />}
                {item.type === "wifi" && <Wifi className="w-5 h-5 stroke-[2.2]" />}
                {!["parking", "audio", "stage", "ac", "kitchen", "wifi"].includes(item.type) &&
                  (item.icon ? (
                    <Image src={item.icon} alt="" width={20} height={20} unoptimized className="w-5 h-5 object-contain" />
                  ) : (
                    <CheckCircle className="w-5 h-5 stroke-[2.2]" />
                  ))}
              </div>
              <span className="text-xs font-semibold leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Flow Modal when "Band qilish" is pressed */}
      {showBookingModal && (
        <ToyxonaFlowModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} theme={theme} venue={detail} />
      )}
    </div>
  );
}
