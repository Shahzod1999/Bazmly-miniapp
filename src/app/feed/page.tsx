"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronDown,
  MapPin,
  CheckCircle,
  Loader2,
  Calendar,
  Ticket,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { bookingStatus } from "@/lib/booking";
import { formatDate, formatSom, formatTime } from "@/lib/format";
import { useApiQuery } from "@/lib/use-api";
import {
  geoService,
  bookingService,
  RegionRead,
  DistrictRead,
  BookingListItem,
} from "@/lib/api";

export default function FeedPage() {
  const { theme } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const isDark = theme === "dark";
  const mounted = !authLoading;
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(() =>
    typeof window === "undefined" ? "Toshkent" : localStorage.getItem("feedLocation") || "Toshkent"
  );
  
  // Real Geo States
  const [regions, setRegions] = useState<RegionRead[]>([]);
  const [districts, setDistricts] = useState<DistrictRead[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedRegionName, setSelectedRegionName] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState("");
  
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  
  // Bookings & Venues data from backend
  const bookingsQuery = useApiQuery(isAuthenticated ? "my-bookings" : null, () => bookingService.getMyBookings());
  const bookings: BookingListItem[] =
    bookingsQuery.state.status === "success" ? [...bookingsQuery.state.data].sort((a, b) => b.booking_date.localeCompare(a.booking_date)) : [];
  const loadingBookings = authLoading || (isAuthenticated && bookingsQuery.state.status === "loading");
  const [toastMessage, setToastMessage] = useState("");

  // Load regions on mount
  useEffect(() => {
    geoService.getRegions()
      .then((res) => setRegions(res || []))
      .catch(() => {});
  }, []);

  // Fetch districts when region selected
  useEffect(() => {
    if (!selectedRegionId) return;
    let alive = true;
    geoService
      .getDistricts(selectedRegionId)
      .then((d) => {
        if (alive) setDistricts(d || []);
      })
      .catch(() => {
        if (alive) setDistricts([]);
      })
      .finally(() => {
        if (alive) setLoadingGeo(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedRegionId]);

  // Dynamic bottom navigation bar visibility controller
  useEffect(() => {
    const bottomNav = document.getElementById("global-bottom-nav");
    if (bottomNav) {
      if (showLocationSelect) {
        bottomNav.style.transform = "translateY(100%)";
        bottomNav.style.opacity = "0";
        bottomNav.style.pointerEvents = "none";
      } else {
        bottomNav.style.transform = "translateY(0)";
        bottomNav.style.opacity = "1";
        bottomNav.style.pointerEvents = "auto";
      }
    }
    return () => {
      if (bottomNav) {
        bottomNav.style.transform = "translateY(0)";
        bottomNav.style.opacity = "1";
        bottomNav.style.pointerEvents = "auto";
      }
    };
  }, [showLocationSelect]);

  // Toast auto-dismiss helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!mounted) {
    return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse" />;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleConfirmLocation = () => {
    if (selectedRegionName && selectedDistrictName) {
      const formattedLoc = `${selectedRegionName}, ${selectedDistrictName.replace(" tumani", "")}`;
      setCurrentLocation(formattedLoc);
      localStorage.setItem("feedLocation", formattedLoc);
      if (selectedDistrictId) {
        localStorage.setItem("feedDistrictId", String(selectedDistrictId));
      }
      setShowLocationSelect(false);
      showToast("Manzil muvaffaqiyatli tasdiqlandi!");
    }
  };

  const handleAutoLocationFeed = async () => {
    if (!navigator.geolocation) {
      showToast("Geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const nearest = await geoService.getNearestDistrict(latitude, longitude);
          const formattedLoc = `${nearest.region_name}, ${nearest.district_name.replace(" tumani", "")}`;
          setCurrentLocation(formattedLoc);
          setSelectedRegionId(nearest.region_id);
          setSelectedRegionName(nearest.region_name);
          setSelectedDistrictId(nearest.district_id);
          setSelectedDistrictName(nearest.district_name);
          localStorage.setItem("feedLocation", formattedLoc);
          localStorage.setItem("feedDistrictId", String(nearest.district_id));
          setShowLocationSelect(false);
          showToast(`Manzil aniqlandi: ${nearest.district_name}`);
        } catch {
          showToast("Eng yaqin tuman topilmadi");
        } finally {
          setLoadingGeo(false);
        }
      },
      () => {
        setLoadingGeo(false);
        showToast("Geolokatsiyaga ruxsat berilmadi");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div
      className={`flex flex-col flex-1 bg-[var(--background)] ${
        isDark ? "text-white" : "text-zinc-900"
      } transition-all duration-300 relative ${
        showLocationSelect ? "-mb-16" : ""
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-[calc(var(--tg-safe-top)+80px)] left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 max-w-xs text-center border border-white/20">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {showLocationSelect ? (
        /* ==================== REGISTERED MANZIL (LOCATION SELECT) VIEW ==================== */
        <div className="flex flex-col flex-1 bg-[var(--background)] text-white animate-fade-in">
          {/* Top Bar Header */}
          <div
            className={`relative flex items-center justify-between px-6 py-5 border-b ${
              isDark ? "border-white/5" : "border-zinc-100"
            }`}
          >
            <button
              onClick={() => setShowLocationSelect(false)}
              className={`p-2 rounded-xl border ${
                isDark ? "border-white/5 bg-white/5 text-white" : "border-zinc-200 bg-zinc-100 text-zinc-800"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1
              className={`text-xl font-bold tracking-wide ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
              Manzil
            </h1>
            <div className="w-9 h-9" />
          </div>

          {/* Form Content */}
          <main className="flex-1 px-6 py-6 pb-8 flex flex-col justify-between max-w-md mx-auto w-full">
            <div className="space-y-6">
              {/* GPS Auto Location Button */}
              <button
                type="button"
                onClick={handleAutoLocationFeed}
                disabled={loadingGeo}
                className={`w-full p-4 rounded-2xl border flex items-center gap-3.5 transition-all text-left cursor-pointer ${
                  isDark
                    ? "bg-[#393939]/70 border-white/10 hover:bg-[#393939]"
                    : "bg-[#E85102]/5 border-[#E85102]/25 hover:bg-[#E85102]/10"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#E85102]/15 flex items-center justify-center text-[#E85102] shrink-0">
                  {loadingGeo ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
                </div>
                <div>
                  <span className={`text-xs font-bold block ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Joylashuvni avtomatik aniqlash (GPS)
                  </span>
                  <span className="text-[10px] text-zinc-400">Eng yaqin viloyat va tuman</span>
                </div>
              </button>

              {/* Qaysi viloyat */}
              <div className="space-y-2 text-left">
                <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Qaysi viloyat
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegionDropdownOpen(!isRegionDropdownOpen);
                      setIsDistrictDropdownOpen(false);
                    }}
                    className={`w-full px-5 py-4 rounded-2xl border text-sm font-semibold flex justify-between items-center outline-none transition-colors ${
                      isDark
                        ? "border-white/5 bg-[#393939] text-white hover:border-white/10"
                        : "border-zinc-200 bg-zinc-100 text-zinc-900 hover:border-zinc-300"
                    }`}
                  >
                    <span>{selectedRegionName || "Belgilash"}</span>
                    <ChevronDown
                      className={`h-4.5 w-4.5 transition-transform duration-300 ${
                        isDark ? "text-white/40" : "text-zinc-400"
                      } ${isRegionDropdownOpen ? "rotate-180 text-primary" : ""}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isRegionDropdownOpen && (
                    <div
                      className={`absolute left-0 right-0 mt-2 z-30 border rounded-2xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto ${
                        isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                      }`}
                    >
                      {regions.map((region) => (
                        <button
                          key={region.id}
                          type="button"
                          onClick={() => {
                            setLoadingGeo(true);
                            setDistricts([]);
                            setSelectedRegionId(region.id);
                            setSelectedRegionName(region.name);
                            setSelectedDistrictId(null);
                            setSelectedDistrictName("");
                            setIsRegionDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-3.5 text-left text-xs font-bold transition-colors border-b last:border-b-0 ${
                            isDark
                              ? "text-white/90 hover:bg-white/5 active:bg-white/10 border-white/5"
                              : "text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 border-zinc-100"
                          }`}
                        >
                          {region.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tumanni kiriting */}
              <div className="space-y-2 text-left">
                <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Tumanni kiriting
                </label>
                <div className="relative">
                  <button
                    type="button"
                    disabled={!selectedRegionId || loadingGeo}
                    onClick={() => {
                      setIsDistrictDropdownOpen(!isDistrictDropdownOpen);
                      setIsRegionDropdownOpen(false);
                    }}
                    className={`w-full px-5 py-4 rounded-2xl border text-sm font-semibold flex justify-between items-center outline-none transition-colors ${
                      isDark
                        ? "border-white/5 bg-[#393939] text-white"
                        : "border-zinc-200 bg-zinc-100 text-zinc-900"
                    } ${
                      selectedRegionId
                        ? isDark
                          ? "hover:border-white/10 cursor-pointer"
                          : "hover:border-zinc-300 cursor-pointer"
                        : "opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <span>
                      {loadingGeo
                        ? "Yuklanmoqda..."
                        : selectedDistrictName || "Belgilash"}
                    </span>
                    <ChevronDown
                      className={`h-4.5 w-4.5 transition-transform duration-300 ${
                        isDark ? "text-white/40" : "text-zinc-400"
                      } ${isDistrictDropdownOpen ? "rotate-180 text-primary" : ""}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDistrictDropdownOpen && selectedRegionId && (
                    <div
                      className={`absolute left-0 right-0 mt-2 z-30 border rounded-2xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto ${
                        isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                      }`}
                    >
                      {districts.map((district) => (
                        <button
                          key={district.id}
                          type="button"
                          onClick={() => {
                            setSelectedDistrictId(district.id);
                            setSelectedDistrictName(district.name);
                            setIsDistrictDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-3.5 text-left text-xs font-bold transition-colors border-b last:border-b-0 ${
                            isDark
                              ? "text-white/90 hover:bg-white/5 active:bg-white/10 border-white/5"
                              : "text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 border-zinc-100"
                          }`}
                        >
                          {district.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div>
              {selectedRegionName && selectedDistrictName ? (
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  className="w-full py-4 rounded-2xl bg-[#E85102] hover:bg-[#C94600] text-white font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg shadow-[#E85102]/20 cursor-pointer"
                >
                  Tasdiqlash
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLocationSelect(false)}
                  className="w-full py-4 rounded-2xl bg-[#E85102] hover:bg-[#C94600] text-white font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg shadow-[#E85102]/20 cursor-pointer"
                >
                  Ortga
                </button>
              )}
            </div>
          </main>
        </div>
      ) : (
        /* ==================== REGISTERED BOOKINGS HISTORY VIEW ==================== */
        <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
          {/* Top Bar Header */}
          <div
            className={`relative flex items-center justify-between px-6 py-5 border-b ${
              isDark ? "border-white/5" : "border-zinc-100"
            }`}
          >
            <h1 className={`text-xl font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>
              Band qilingan joylar
            </h1>

            {/* Location selector trigger button */}
            <button
              onClick={() => {
                setShowLocationSelect(true);
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all px-3 py-1.5 rounded-full cursor-pointer ${
                isDark
                  ? "text-white/80 bg-white/5 border border-white/5 hover:bg-white/10"
                  : "text-zinc-800 bg-transparent hover:bg-zinc-100"
              }`}
            >
              <MapPin className={`h-4 w-4 shrink-0 ${isDark ? "text-primary" : "text-zinc-700"}`} />
              <span>{currentLocation.split(", ").pop()}</span>
            </button>
          </div>

          {/* Scrollable Bookings List */}
          <main className="flex-1 overflow-y-auto px-6 py-6 pb-10 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
            {!authLoading && !isAuthenticated ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Ticket className="h-10 w-10 text-zinc-400" />
                <p className="text-sm font-bold">Bronlaringizni ko&apos;rish uchun akkauntga kiring</p>
                <Link href="/login?next=%2Ffeed" className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold">
                  Kirish
                </Link>
              </div>
            ) : bookingsQuery.state.status === "error" ? (
              <div role="alert" className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm font-bold">Bronlarni yuklab bo&apos;lmadi</p>
                <p className="text-xs text-zinc-400">{bookingsQuery.state.error.message}</p>
                <button type="button" onClick={bookingsQuery.retry} className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold">
                  Qayta urinish
                </button>
              </div>
            ) : loadingBookings ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs text-zinc-400">Bronlar yuklanmoqda...</p>
              </div>
            ) : bookings.length > 0 ? (
              bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/payment/${booking.id}`}
                  className={`w-full rounded-3xl p-5 flex flex-col gap-4 transition-all duration-300 block text-left ${
                    isDark
                      ? "bg-[#393939] border border-white/5 shadow-xl hover:border-white/10"
                      : "bg-white border border-[#E85102] shadow-md hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      aria-hidden="true"
                      className={`w-20 h-20 rounded-2xl shrink-0 border shadow-md flex items-center justify-center text-primary bg-primary/10 ${
                        isDark ? "border-white/5" : "border-zinc-100"
                      }`}
                    >
                      <Ticket className="h-8 w-8" />
                    </div>

                    <div className="space-y-1 pr-1 w-full min-w-0">
                      <h2
                        className={`text-base font-bold tracking-wide truncate ${
                          isDark ? "text-white" : "text-zinc-900"
                        }`}
                      >
                        {booking.venue_name}
                      </h2>

                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          isDark ? "text-white/50" : "text-zinc-500"
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        <span>{formatDate(booking.booking_date)}</span>
                        <span className={isDark ? "text-white/20" : "text-zinc-300"}>|</span>
                        <span>{formatTime(booking.start_time)}</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          isDark ? "text-white/60" : "text-zinc-600"
                        }`}
                      >
                        <Ticket className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{booking.guests_count} kishi</span>
                        {booking.table_number && <span>• {booking.table_number}-stol</span>}
                      </div>
                    </div>
                  </div>

                  <hr className={`border-t ${isDark ? "border-white/5" : "border-zinc-100"}`} />

                  <div className="space-y-2.5 text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <span className={isDark ? "text-white/40" : "text-zinc-400"}>Holat</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          booking.status === "confirmed" || booking.status === "checked_in"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : booking.status === "pending"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {bookingStatus(booking.status).label}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={isDark ? "text-white/40" : "text-zinc-400"}>Jami summa:</span>
                      <span className="font-bold text-primary">
                        {formatSom(booking.total_amount)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Ticket className="h-10 w-10 text-zinc-400" />
                <p className="text-sm font-bold">Hali band qilingan joylar yo&apos;q</p>
                <p className="text-xs text-zinc-400 max-w-xs">Restoran yoki to&apos;yxonani band qilganingizda shu yerda ko&apos;rinadi.</p>
                <Link href="/" className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold">
                  Joy tanlash
                </Link>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
