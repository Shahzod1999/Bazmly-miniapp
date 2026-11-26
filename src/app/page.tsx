"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  MapPin,
  Compass,
  Ticket,
  ChevronLeft,
  X,
  ChevronDown,
  Sun,
  Moon,
  Loader2,
  Check,
  Globe,
  Bell,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { FeaturedVenueCard, GridVenueCard } from "@/components/home/venue-cards";
import { comingSoon } from "@/components/app-toast";
import {
  venueService,
  geoService,
  userService,
  engagementService,
  VenueListItem,
  UserAddressRead,
  VenueTypeSlug,
  RegionRead,
  DistrictRead,
  NotificationRead,
} from "@/lib/api";


const BANNERS = [
  "/images/home/adv1.webp",
  "/images/home/top.webp",
  "/images/home/tuyxona2.webp",
  "/images/home/tuyxona3.webp",
];

export default function WelcomePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  // Kirgan foydalanuvchi asosiy ekranni, kirmagan foydalanuvchi tanishtiruv ekranini ko'radi
  const mounted = !authLoading;
  const [activeTab, setActiveTab] = useState<"Umumiy" | "Restoranlar" | "To'yxonalar">("Umumiy");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  // Toyxona Booking Flow Modal State
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRead[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // API dynamic states
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [guestCountFilter, setGuestCountFilter] = useState<number | null>(null);
  const [recentLocations, setRecentLocations] = useState<UserAddressRead[]>([]);
  // Saqlangan tuman (faqat brauzerda o'qiladi)
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const savedName = localStorage.getItem("selectedDistrictName");
    const savedId = Number(localStorage.getItem("selectedDistrictId"));
    return savedName && Number.isInteger(savedId) && savedId > 0 ? savedId : null;
  });
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>(() => {
    if (typeof window === "undefined") return "Toshkent shahri (Barcha tumanlar)";
    return localStorage.getItem("selectedDistrictName") || "Toshkent shahri (Barcha tumanlar)";
  });
  const [geoDetecting, setGeoDetecting] = useState(false);

  // Geo Regions & Districts
  const [geoRegions, setGeoRegions] = useState<RegionRead[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<number | null>(null);
  const [regionDistrictsMap, setRegionDistrictsMap] = useState<Record<number, DistrictRead[]>>({});
  const [loadingDistrictsFor, setLoadingDistrictsFor] = useState<number | null>(null);
  const [locationSearchInput, setLocationSearchInput] = useState("");

  // Interactive party/time picker state
  const [showPartySheet, setShowPartySheet] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [partySize, setPartySize] = useState(5);
  const [selectedDay, setSelectedDay] = useState("Jum");
  const [selectedTime, setSelectedTime] = useState("23:30");

  // Drag to Scroll Spinner Picker Logic
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const [dayDragState, setDayDragState] = useState({ isDown: false, startY: 0, scrollTop: 0 });

  const handleDayMouseDown = (e: React.MouseEvent) => {
    const el = dayScrollRef.current;
    if (!el) return;
    setDayDragState({
      isDown: true,
      startY: e.pageY - el.offsetTop,
      scrollTop: el.scrollTop,
    });
  };

  const handleDayMouseMove = (e: React.MouseEvent) => {
    if (!dayDragState.isDown) return;
    e.preventDefault();
    const el = dayScrollRef.current;
    if (!el) return;
    const y = e.pageY - el.offsetTop;
    const walk = (y - dayDragState.startY) * 1.5;
    el.scrollTop = dayDragState.scrollTop - walk;
  };

  const handleDayMouseUpOrLeave = () => {
    setDayDragState((prev) => ({ ...prev, isDown: false }));
  };

  const handleDayScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / 40);
    const days = ["Chor", "Pay", "Jum", "Shan", "Yak"];
    if (index >= 0 && index < days.length) {
      setSelectedDay(days[index]);
    }
  };

  const timeScrollRef = useRef<HTMLDivElement>(null);
  const [timeDragState, setTimeDragState] = useState({ isDown: false, startY: 0, scrollTop: 0 });

  const handleTimeMouseDown = (e: React.MouseEvent) => {
    const el = timeScrollRef.current;
    if (!el) return;
    setTimeDragState({
      isDown: true,
      startY: e.pageY - el.offsetTop,
      scrollTop: el.scrollTop,
    });
  };

  const handleTimeMouseMove = (e: React.MouseEvent) => {
    if (!timeDragState.isDown) return;
    e.preventDefault();
    const el = timeScrollRef.current;
    if (!el) return;
    const y = e.pageY - el.offsetTop;
    const walk = (y - timeDragState.startY) * 1.5;
    el.scrollTop = timeDragState.scrollTop - walk;
  };

  const handleTimeMouseUpOrLeave = () => {
    setTimeDragState((prev) => ({ ...prev, isDown: false }));
  };

  const handleTimeScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / 40);
    const times = ["22:30", "23:00", "23:30", "00:00"];
    if (index >= 0 && index < times.length) {
      setSelectedTime(times[index]);
    }
  };

  // Center alignment effect on mount
  useEffect(() => {
    if (showPartySheet) {
      setTimeout(() => {
        const days = ["Chor", "Pay", "Jum", "Shan", "Yak"];
        const dayIdx = days.indexOf(selectedDay);
        if (dayIdx !== -1 && dayScrollRef.current) {
          dayScrollRef.current.scrollTop = dayIdx * 40;
        }

        const times = ["22:30", "23:00", "23:30", "00:00"];
        const timeIdx = times.indexOf(selectedTime);
        if (timeIdx !== -1 && timeScrollRef.current) {
          timeScrollRef.current.scrollTop = timeIdx * 40;
        }
      }, 50);
    }
  }, [showPartySheet, selectedDay, selectedTime]);


  // Fetch Venues from Backend
  const loadVenues = useCallback(async () => {
    setLoadingVenues(true);
    setVenuesError(null);
    try {
      let vType: VenueTypeSlug | undefined;
      if (activeTab === "Restoranlar") vType = "restoran";
      if (activeTab === "To'yxonalar") vType = "toyxona";

      const res = await venueService.searchVenues({
        query: searchQuery.trim() || undefined,
        venue_type: vType,
        district_id: selectedDistrictId || undefined,
        guest_count: guestCountFilter || undefined,
        limit: 20,
      });
      setVenues(res.items || []);
    } catch (err) {
      setVenues([]);
      setVenuesError(err instanceof Error ? err.message : "Joylarni yuklab bo'lmadi");
    } finally {
      setLoadingVenues(false);
    }
  }, [activeTab, searchQuery, selectedDistrictId, guestCountFilter]);

  // Umumiy xabar 2.5 soniyadan keyin yopiladi
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Fetch recent locations & favorites if user is logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      userService.listRecentLocations()
        .then((locs) => setRecentLocations(locs || []))
        .catch(() => {});
    }
  }, [isAuthenticated, user]);

  // Notifications fetch
  useEffect(() => {
    if (isAuthenticated && user) {
      engagementService.getUnreadNotificationsCount()
        .then((cnt) => setUnreadCount(cnt || 0))
        .catch(() => {});
      engagementService.getNotifications(10)
        .then((res) => setNotifications(res.items || []))
        .catch(() => {});
    }
  }, [isAuthenticated, user]);

  // Hide global bottom bar when Notifications or Sheets are open
  useEffect(() => {
    const bottomNav = document.getElementById("global-bottom-nav");
    if (bottomNav) {
      if (showNotificationsModal || showPartySheet || showLocationSearch) {
        bottomNav.style.transform = "translateY(150%)";
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
  }, [showNotificationsModal, showPartySheet, showLocationSearch]);

  // Load venues on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadVenues();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadVenues]);

  // Automatic slide interval for best offers carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Fetch regions on mount
  useEffect(() => {
    geoService.getRegions()
      .then((res) => setGeoRegions(res || []))
      .catch(() => {});

  }, []);

  const handleToggleRegion = async (regionId: number) => {
    if (activeRegionId === regionId) {
      setActiveRegionId(null);
      return;
    }
    setActiveRegionId(regionId);
    if (!regionDistrictsMap[regionId]) {
      setLoadingDistrictsFor(regionId);
      try {
        const d = await geoService.getDistricts(regionId);
        setRegionDistrictsMap((prev) => ({ ...prev, [regionId]: d || [] }));
      } finally {
        setLoadingDistrictsFor(null);
      }
    }
  };

  const handleSelectDistrict = async (districtId: number | null, label: string) => {
    setSelectedDistrictId(districtId);
    setSelectedDistrictName(label);
    if (districtId) {
      localStorage.setItem("selectedDistrictId", String(districtId));
    } else {
      localStorage.removeItem("selectedDistrictId");
    }
    localStorage.setItem("selectedDistrictName", label);
    setShowLocationSearch(false);
    setLocationSearchInput("");
    setToastMessage(`Manzil tanlandi: ${label}`);

  };

  // Auto GPS Location Handler
  const handleAutoLocation = async () => {
    if (!navigator.geolocation) {
      setToastMessage("Geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }

    setGeoDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const nearest = await geoService.getNearestDistrict(latitude, longitude);
          const fullLabel = `${nearest.region_name}, ${nearest.district_name}`;
          setSelectedDistrictId(nearest.district_id);
          setSelectedDistrictName(fullLabel);
          localStorage.setItem("selectedDistrictId", String(nearest.district_id));
          localStorage.setItem("selectedDistrictName", fullLabel);
          
          if (isAuthenticated) {
            await userService.saveRecentLocation({
              district_id: nearest.district_id,
              label: fullLabel,
              latitude,
              longitude,
            }).catch(() => {});
            userService.listRecentLocations().then((locs) => setRecentLocations(locs || [])).catch(() => {});
          }

          setShowLocationSearch(false);
          setLocationSearchInput("");
          setToastMessage(`Manzil aniqlandi: ${nearest.district_name}`);
        } catch {
          setToastMessage("Eng yaqin tuman topilmadi");
        } finally {
          setGeoDetecting(false);
        }
      },
      () => {
        setGeoDetecting(false);
        setToastMessage("Geolokatsiyaga ruxsat berilmadi");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (!mounted) {
    return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse" />;
  }

  const horizontalTabs: ("Umumiy" | "Restoranlar" | "To'yxonalar")[] = [
    "Umumiy",
    "Restoranlar",
    "To'yxonalar",
  ];

  const displayName = user?.first_name ?? "";


  return (
    <div className="flex flex-col flex-1 bg-[var(--background)] text-foreground transition-colors duration-300 relative">
        {/* ==================== ASOSIY (HOME) VIEW ==================== */}
        <div className="flex flex-col flex-1 min-h-screen bg-white dark:bg-[var(--background)]">
          {/* Header Row */}
          <div
            className={`flex items-center justify-between px-6 transition-all duration-200 ${
              theme === "dark" ? "py-5 border-b border-brand-dark-border" : "pt-6 pb-2"
            }`}
          >
            <div>
              <h1
                className={`text-xl font-extrabold tracking-tight ${
                  theme === "dark" ? "text-white" : "text-zinc-900"
                }`}
              >
                Hayrli kun! {displayName}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications Button */}
              <button
                type="button"
                onClick={() => setShowNotificationsModal(true)}
                className={`p-2.5 rounded-2xl border transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm relative ${
                  theme === "dark"
                    ? "bg-[#393939] border-white/5 text-white/80 hover:text-white"
                    : "bg-white border-zinc-200 text-zinc-800 hover:text-primary"
                }`}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--background)] animate-pulse" />
                )}
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-2.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm ${
                  theme === "dark"
                    ? "bg-[#393939] border border-white/5 text-white/80"
                    : "bg-white border border-zinc-200 text-zinc-800"
                }`}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5 text-[#E85102]" /> : <Moon className="h-5 w-5 text-zinc-600" />}
              </button>

              {/* Vouchers Link */}
              <Link
                href="/tickets"
                className={`p-2.5 rounded-2xl border transition-all active:scale-95 flex items-center justify-center shadow-sm ${
                  theme === "dark"
                    ? "bg-[#393939] border-white/5 text-white/80 hover:text-white"
                    : "bg-white border-zinc-200 text-zinc-800 hover:text-primary"
                }`}
                aria-label="Vouchers"
              >
                <Ticket className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Main Scrollable Area */}
          <main
            className={`flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-6 max-w-md mx-auto w-full text-left ${
              theme === "dark" ? "py-6" : "py-4"
            }`}
          >
            {/* Search Input and Filter Button */}
            <div className="flex items-center gap-3">
              {/* Search Field */}
              <div
                className={`flex-1 h-[52px] relative flex items-center rounded-full overflow-hidden transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-[#252525] border border-white/5 focus-within:border-[#E85102]/50"
                    : "bg-[#F2F4F7] border border-transparent focus-within:ring-2 focus-within:ring-[#E85102]/20"
                }`}
              >
                <span className="pl-4 text-[#E85102] flex items-center justify-center">
                  <Search className="w-5 h-5 stroke-[2.2]" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Qidirish"
                  className={`w-full pl-3 pr-4 h-full bg-transparent text-[15px] sm:text-base font-normal outline-none ${
                    theme === "dark"
                      ? "text-white placeholder:text-zinc-500"
                      : "text-zinc-900 placeholder:text-[#717680]"
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="pr-4 text-xs font-bold text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Orange Slider/Filter Button */}
              <button
                type="button"
                onClick={() => setShowPartySheet(true)}
                className={`w-[52px] h-[52px] rounded-[18px] bg-[#E85102] hover:bg-[#C94600] text-white shadow-sm shadow-[#E85102]/20 transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0 ${
                  guestCountFilter ? "ring-2 ring-white ring-offset-1" : ""
                }`}
                aria-label="Filter"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <line x1="4.5" y1="8.5" x2="19.5" y2="8.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="9.5" cy="8.5" r="3.2" fill="white" />
                  <line x1="4.5" y1="15.5" x2="19.5" y2="15.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="14.5" cy="15.5" r="3.2" fill="white" />
                </svg>
              </button>
            </div>

            {/* Active Filter Chips */}
            {(guestCountFilter || (selectedDistrictId !== null && selectedDistrictName) || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5 animate-fade-in">
                {selectedDistrictId !== null && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E85102]/10 border border-[#E85102]/20 text-[#E85102] text-xs font-bold">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[140px]">{selectedDistrictName.split(", ").pop() || "Tuman"}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectDistrict(null, "Toshkent shahri (Barcha tumanlar)")}
                      className="hover:opacity-70 p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {guestCountFilter && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E85102]/10 border border-[#E85102]/20 text-[#E85102] text-xs font-bold">
                    <span>{guestCountFilter} kishi</span>
                    <button
                      type="button"
                      onClick={() => setGuestCountFilter(null)}
                      className="hover:opacity-70 p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {searchQuery && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E85102]/10 border border-[#E85102]/20 text-[#E85102] text-xs font-bold">
                    <span>&quot;{searchQuery}&quot;</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="hover:opacity-70 p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* Horizontal Tabs / Pills */}
            <div className="flex w-full gap-2.5 pb-1 overflow-x-auto scrollbar-none">
              {horizontalTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-center py-2.5 px-5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 border ${
                      isActive
                        ? theme === "dark"
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/10"
                          : "bg-primary text-white border-primary shadow-md"
                        : theme === "dark"
                        ? "bg-[#393939] border-white/5 text-white/60 hover:text-white"
                        : "bg-white border-[#E85102] text-zinc-900 hover:bg-[#E85102]/5"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Section: Eng yaxshi takliflar */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pr-1">
                <h2
                  className={`text-base font-extrabold tracking-tight ${
                    theme === "dark" ? "text-white" : "text-zinc-900"
                  }`}
                >
                  Eng yaxshi takliflar
                </h2>
                <button
                  type="button"
                  onClick={() => comingSoon("Aksiyalar")}
                  className={`text-xs font-bold hover:underline transition-colors ${
                    theme === "dark" ? "text-white/40" : "text-[#E85102]"
                  }`}
                >
                  Barchasini ko&apos;rish
                </button>
              </div>

              {/* Banner Card Carousel */}
              <div className="relative group">
                <button
                  type="button"
                  aria-label="Aksiyalar"
                  onClick={() => comingSoon("Aksiyalar")}
                  className={`block w-full aspect-[2.1/1] rounded-[28px] overflow-hidden border shadow-lg relative ${
                    theme === "dark" ? "bg-[#393939] border-white/5" : "bg-white border-zinc-100"
                  }`}
                >
                  {(activeTab === "To'yxonalar"
                    ? [
                        "/images/home/tuyxona2.webp",
                        "/images/home/tuyxona3.webp",
                        "/images/home/tuyxona1.webp",
                      ]
                    : BANNERS
                  ).map((banner, index) => {
                    const isActive = currentSlide === index;
                    return (
                      <Image
                        key={banner}
                        src={banner}
                        alt={`Aksiya ${index + 1}`}
                        fill
                        sizes="(max-width: 448px) 100vw, 448px"
                        priority={index === 0}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out transform ${
                          isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0 pointer-events-none"
                        }`}
                      />
                    );
                  })}
                </button>

                {/* Indicator Dots */}
                <div className="flex justify-center items-center gap-1.5 pt-3">
                  {(activeTab === "To'yxonalar"
                    ? ["/images/home/tuyxona2.webp", "/images/home/tuyxona3.webp", "/images/home/tuyxona1.webp"]
                    : BANNERS
                  ).map((_, index) => {
                    const isActive = currentSlide === index;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentSlide(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          isActive
                            ? "w-4 bg-primary"
                            : theme === "dark"
                            ? "w-1.5 bg-white/20 hover:bg-white/40"
                            : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section: Top Restoranlar & Zallar / Top to'yxonalar */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pr-1">
                <h2
                  className={`text-base font-extrabold tracking-tight flex items-center gap-2 ${
                    theme === "dark" ? "text-white" : "text-zinc-900"
                  }`}
                >
                  <span>{activeTab === "To'yxonalar" ? "Top to'yxonalar" : "Top Restoranlar & Zallar"}</span>
                  {loadingVenues && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </h2>
                <Link
                  href="/feed"
                  className={`text-xs font-bold hover:underline transition-colors ${
                    theme === "dark" ? "text-white/40" : "text-[#E85102]"
                  }`}
                >
                  Barchasini ko&apos;rish
                </Link>
              </div>

              {/* Venues Content */}
              {(() => {
                const displayedVenues = venues;

                if (loadingVenues) {
                  return (
                    /* Skeleton Loader */
                    <div className="space-y-4 animate-pulse">
                      <div className={`w-full h-72 rounded-3xl border ${theme === "dark" ? "bg-[#393939]/60 border-white/5" : "bg-zinc-100 border-zinc-200"}`} />
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`h-56 rounded-3xl border ${theme === "dark" ? "bg-[#393939]/60 border-white/5" : "bg-zinc-100 border-zinc-200"}`} />
                        <div className={`h-56 rounded-3xl border ${theme === "dark" ? "bg-[#393939]/60 border-white/5" : "bg-zinc-100 border-zinc-200"}`} />
                      </div>
                    </div>
                  );
                }

                if (venuesError) {
                  return (
                    <div role="alert" className={`py-12 px-6 text-center space-y-3 rounded-3xl border border-dashed ${
                      theme === "dark" ? "border-white/10 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                    }`}>
                      <h3 className="text-sm font-bold text-foreground dark:text-white">Joylarni yuklab bo&apos;lmadi</h3>
                      <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">{venuesError}</p>
                      <button
                        type="button"
                        onClick={loadVenues}
                        className="px-4 py-2.5 rounded-xl bg-[#E85102] hover:bg-[#C94600] text-white text-xs font-bold shadow-md shadow-[#E85102]/20 transition-all cursor-pointer"
                      >
                        Qayta urinish
                      </button>
                    </div>
                  );
                }

                if (displayedVenues.length === 0) {
                  return (
                    /* Empty State */
                    <div className={`py-12 px-6 text-center space-y-3 rounded-3xl border border-dashed ${
                      theme === "dark" ? "border-white/10 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                    }`}>
                      <div className="w-12 h-12 rounded-2xl bg-[#E85102]/10 flex items-center justify-center text-[#E85102] mx-auto">
                        <Search className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground dark:text-white">
                        Mos keluvchi muassasa topilmadi
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                        {selectedDistrictId !== null
                          ? "Tanlangan tumanda hali muassasalar mavjud emas. Barcha tumanlar bo'yicha ko'rishni xohlaysizmi?"
                          : searchQuery
                          ? `"${searchQuery}" so'rovi bo'yicha hech qanday natija topilmadi.`
                          : "Ushbu toifada hozircha muassasalar mavjud emas."}
                      </p>
                      {(selectedDistrictId !== null || searchQuery || guestCountFilter) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("Umumiy");
                            setSelectedDistrictId(null);
                            setSelectedDistrictName("Toshkent shahri (Barcha tumanlar)");
                            setSearchQuery("");
                            setGuestCountFilter(null);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#E85102] hover:bg-[#C94600] text-white text-xs font-bold shadow-md shadow-[#E85102]/20 transition-all cursor-pointer"
                        >
                          Barcha muassasalarni ko&apos;rish
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Large Featured Card (First Venue) */}
                    <FeaturedVenueCard venue={displayedVenues[0]} isToyxona={activeTab === "To'yxonalar"} dark={theme === "dark"} />

                    {/* 2x2 Grid for Other Venues */}
                    {displayedVenues.length > 1 && (
                      <div className="grid grid-cols-2 gap-4">
                        {displayedVenues.slice(1, 5).map((card) => (
                          <GridVenueCard key={card.id} venue={card} isToyxona={activeTab === "To'yxonalar"} dark={theme === "dark"} />
                        ))}
                      </div>
                    )}
                      </div>
                    );
                  })()}
              </div>
          </main>
        </div>

      {/* General Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[120] px-5 py-3 rounded-2xl bg-zinc-900 text-white text-xs font-bold shadow-2xl border border-white/10 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Partiya Soni & Kun va Vaqt Bottom Sheet Overlay */}
      {showPartySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0 z-0" onClick={() => setShowPartySheet(false)} />

          <div className="w-full bg-brand-light-card dark:bg-[#393939] border-t border-brand-light-border dark:border-white/5 rounded-t-[36px] px-6 pb-9 pt-4 shadow-2xl relative z-10 flex flex-col gap-6 animate-slide-up select-none">
            <div className="w-10 h-1.5 bg-foreground/10 dark:bg-white/10 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground/50 dark:text-zinc-500 uppercase tracking-widest">
                Partiya sozlamalari
              </span>
              <button
                onClick={() => setShowPartySheet(false)}
                className="w-8 h-8 rounded-full bg-foreground/5 dark:bg-white/5 flex items-center justify-center text-foreground/60 dark:text-zinc-400 hover:text-[#E85102] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-left">
              <h3 className="font-extrabold text-sm text-foreground dark:text-white">Partiya soni (mehmonlar)</h3>
              <div className="flex justify-between items-center gap-3">
                {[1, 2, 3, 4, 5, 8].map((num) => {
                  const isSelected = partySize === num;
                  return (
                    <button
                      key={num}
                      onClick={() => setPartySize(num)}
                      className={`flex-1 py-3 text-base font-extrabold rounded-2xl transition-all cursor-pointer ${
                        isSelected
                          ? "border border-[#E85102] bg-[#E85102]/5 text-[#E85102] scale-105"
                          : "border border-brand-light-border dark:border-white/5 bg-foreground/5 dark:bg-zinc-900 text-foreground dark:text-white"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3.5 text-left">
              <h3 className="font-extrabold text-sm text-foreground dark:text-white">
                Kun va vaqt <span className="text-xs font-semibold text-zinc-400">(saralash tez orada)</span>
              </h3>

              <div className="grid grid-cols-2 gap-6 py-4 bg-foreground/5 dark:bg-zinc-900/60 rounded-2xl relative border border-brand-light-border dark:border-white/5 overflow-hidden h-[120px] select-none">
                <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-10 border-y border-brand-light-border/40 dark:border-zinc-800 pointer-events-none z-20" />

                {/* Left Column (Days) */}
                <div
                  ref={dayScrollRef}
                  onMouseDown={handleDayMouseDown}
                  onMouseMove={handleDayMouseMove}
                  onMouseUp={handleDayMouseUpOrLeave}
                  onMouseLeave={handleDayMouseUpOrLeave}
                  onScroll={handleDayScroll}
                  style={{ paddingTop: "40px", paddingBottom: "40px" }}
                  className="h-full overflow-y-auto scrollbar-none flex flex-col snap-y snap-mandatory cursor-grab active:cursor-grabbing text-center z-10"
                >
                  {["Chor", "Pay", "Jum", "Shan", "Yak"].map((day) => {
                    const isActive = selectedDay === day;
                    return (
                      <div
                        key={day}
                        style={{ height: "40px", lineHeight: "40px" }}
                        className={`snap-center shrink-0 flex items-center justify-center text-sm font-black transition-all duration-200 ${
                          isActive ? "text-foreground dark:text-white scale-110" : "text-foreground/40 dark:text-zinc-600"
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>

                {/* Right Column (Times) */}
                <div
                  ref={timeScrollRef}
                  onMouseDown={handleTimeMouseDown}
                  onMouseMove={handleTimeMouseMove}
                  onMouseUp={handleTimeMouseUpOrLeave}
                  onMouseLeave={handleTimeMouseUpOrLeave}
                  onScroll={handleTimeScroll}
                  style={{ paddingTop: "40px", paddingBottom: "40px" }}
                  className="h-full overflow-y-auto scrollbar-none flex flex-col snap-y snap-mandatory cursor-grab active:cursor-grabbing text-center z-10"
                >
                  {["22:30", "23:00", "23:30", "00:00"].map((time) => {
                    const isActive = selectedTime === time;
                    return (
                      <div
                        key={time}
                        style={{ height: "40px", lineHeight: "40px" }}
                        className={`snap-center shrink-0 flex items-center justify-center text-sm font-black transition-all duration-200 ${
                          isActive ? "text-foreground dark:text-white scale-110" : "text-foreground/40 dark:text-zinc-600"
                        }`}
                      >
                        {time}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPartySheet(false);
                setGuestCountFilter(partySize);

              }}
              className="w-full py-4.5 bg-[#E85102] hover:bg-[#C94600] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#E85102]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
            >
              Izlash ({partySize} kishi)
            </button>
          </div>
        </div>
      )}

      {/* Location Search Overlay */}
      {showLocationSearch && (
        <div className="fixed inset-0 z-50 bg-brand-light-surface dark:bg-[var(--background)] flex flex-col max-w-md mx-auto shadow-2xl animate-fade-in text-foreground dark:text-white select-none">
          {/* Header Row with Search Input */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-light-border dark:border-white/5 bg-brand-light-surface dark:bg-[var(--background)] z-30 sticky top-0">
            <button
              onClick={() => {
                setShowLocationSearch(false);
                setLocationSearchInput("");
              }}
              className="p-2.5 rounded-xl bg-brand-light-card dark:bg-[#393939] border border-brand-light-border dark:border-white/5 text-foreground/80 dark:text-white/80 hover:text-white transition-all active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex-1 flex items-center bg-brand-light-card dark:bg-[#393939] border border-brand-light-border dark:border-white/5 rounded-2xl overflow-hidden focus-within:border-[#E85102]/40 transition-all px-4 py-3">
              <Search className="h-4.5 w-4.5 text-foreground/40 dark:text-zinc-500 shrink-0" />
              <input
                type="text"
                value={locationSearchInput}
                onChange={(e) => setLocationSearchInput(e.target.value)}
                placeholder="Viloyat yoki tuman qidirish..."
                className="w-full bg-transparent border-0 p-0 pl-2.5 text-sm font-bold text-foreground dark:text-white focus:ring-0 outline-none placeholder:text-foreground/30 dark:placeholder:text-zinc-600"
              />
              {locationSearchInput && (
                <button
                  type="button"
                  onClick={() => setLocationSearchInput("")}
                  className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action: Manzilni avtomatik aniqlash (GPS) */}
          <button
            onClick={handleAutoLocation}
            disabled={geoDetecting}
            className="w-full px-6 py-4.5 border-b border-brand-light-border dark:border-white/5 flex items-center gap-3.5 hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-[#E85102]/10 flex items-center justify-center text-[#E85102] shrink-0">
              {geoDetecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Compass className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-sm font-black text-foreground dark:text-white block">
                {geoDetecting ? "Joylashuv aniqlanmoqda..." : "Manzilni avtomatik aniqlash"}
              </span>
              <span className="text-[10px] text-zinc-400">GPS koordinata orqali eng yaqin tuman</span>
            </div>
          </button>

          {/* Scrollable List */}
          <div className="flex-1 px-6 py-5 space-y-6 text-left overflow-y-auto">
            {/* Top Quick Option: Barcha tumanlar */}
            {!locationSearchInput.trim() && (
              <button
                type="button"
                onClick={() => handleSelectDistrict(null, "Toshkent shahri (Barcha tumanlar)")}
                className={`w-full py-3.5 px-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedDistrictId === null
                    ? "bg-[#E85102]/10 border-[#E85102] text-[#E85102] font-bold"
                    : "border-brand-light-border dark:border-white/5 bg-brand-light-card/60 dark:bg-[#393939]/40 hover:bg-foreground/5 dark:hover:bg-white/5 text-foreground dark:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E85102]/15 flex items-center justify-center text-[#E85102] shrink-0">
                    <Globe className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold block">Barcha tumanlar</span>
                    <span className="text-[10px] opacity-60">Barcha restoran va to&apos;yxonalarni ko&apos;rish</span>
                  </div>
                </div>
                {selectedDistrictId === null && <Check className="h-4 w-4 text-[#E85102]" />}
              </button>
            )}
            {/* Oxirgi manzillar (if any) */}
            {recentLocations.length > 0 && !locationSearchInput.trim() && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold text-foreground/40 dark:text-zinc-400 tracking-wider uppercase">
                  Oxirgi manzillar
                </h3>
                <div className="space-y-1">
                  {recentLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectDistrict(loc.district_id, loc.label)}
                      className="w-full py-3 px-3.5 rounded-xl border border-transparent hover:border-brand-light-border dark:hover:border-white/5 flex items-center gap-3 hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                    >
                      <MapPin className="h-4 w-4 text-[#E85102] shrink-0" />
                      <span className="text-sm font-bold text-foreground/90 dark:text-white/90 truncate">{loc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Barcha viloyatlar va tumanlar */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-foreground/40 dark:text-zinc-400 tracking-wider uppercase">
                {locationSearchInput.trim() ? "Qidiruv natijalari" : "Viloyatlar va tumanlar"}
              </h3>

              <div className="space-y-2">
                {geoRegions
                  .filter((r) =>
                    !locationSearchInput.trim() ||
                    r.name.toLowerCase().includes(locationSearchInput.toLowerCase())
                  )
                  .map((region) => {
                    const isExpanded = activeRegionId === region.id;
                    const districts = regionDistrictsMap[region.id] || [];
                    const isLoadingDistricts = loadingDistrictsFor === region.id;

                    return (
                      <div
                        key={region.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isExpanded
                            ? "border-[#E85102]/40 bg-[#E85102]/5 dark:bg-white/[0.02]"
                            : "border-brand-light-border dark:border-white/5 bg-brand-light-card/50 dark:bg-[#393939]/30"
                        }`}
                      >
                        {/* Region Header Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleRegion(region.id)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer hover:opacity-90"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-bold text-foreground dark:text-white">
                              {region.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-foreground/5 dark:bg-white/10 text-foreground/60 dark:text-white/60">
                              {region.code}
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 text-foreground/40 dark:text-zinc-400 ${
                              isExpanded ? "rotate-180 text-[#E85102]" : ""
                            }`}
                          />
                        </button>

                        {/* Districts list inside region */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 border-t border-brand-light-border/60 dark:border-white/5 space-y-1">
                            {isLoadingDistricts ? (
                              <div className="py-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
                                <Loader2 className="h-4 w-4 animate-spin text-[#E85102]" />
                                <span>Tumanlar yuklanmoqda...</span>
                              </div>
                            ) : districts.length > 0 ? (
                              districts.map((district) => {
                                const isCurrent = selectedDistrictId === district.id;
                                return (
                                  <button
                                    key={district.id}
                                    type="button"
                                    onClick={() => handleSelectDistrict(district.id, `${region.name}, ${district.name}`)}
                                    className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                      isCurrent
                                        ? "bg-[#E85102] text-white shadow-sm"
                                        : "hover:bg-foreground/5 dark:hover:bg-white/10 text-foreground/80 dark:text-white/80"
                                    }`}
                                  >
                                    <span>{district.name}</span>
                                    {isCurrent && <Check className="h-3.5 w-3.5" />}
                                  </button>
                                );
                              })
                            ) : (
                              <p className="py-2 text-center text-xs text-zinc-400">Tumanlar topilmadi</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ==================== NOTIFICATIONS DRAWER MODAL ==================== */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setShowNotificationsModal(false)} />
          <div
            className={`w-full max-w-md rounded-[32px] p-6 flex flex-col gap-4 z-10 border relative text-left shadow-2xl ${
              theme === "dark" ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Bildirishnomalar</h3>
                  <p className="text-[11px] text-zinc-400 font-bold">Ilova xabarnomalari</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions */}
            {notifications.length > 0 && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await engagementService.markAllNotificationsRead();
                      const readAt = new Date().toISOString();
                      setUnreadCount(0);
                      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? readAt })));
                      setToastMessage("Barcha bildirishnomalar o'qildi deb belgilandi");
                    } catch {
                      setToastMessage("Bildirishnomalarni belgilab bo'lmadi");
                    }
                  }}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Barchasini o&apos;qilgan qilish
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 py-1">
              {notifications.length === 0 && (
                <p className={`py-8 text-center text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
                  Hozircha bildirishnomalar yo&apos;q
                </p>
              )}
              {notifications.map((n) => {
                const isRead = !!n.read_at;
                return (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-2xl border transition-all text-left ${
                      !isRead
                        ? "bg-primary/5 border-primary/20"
                        : theme === "dark"
                        ? "bg-white/5 border-white/5"
                        : "bg-zinc-50 border-zinc-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-extrabold text-xs text-foreground dark:text-white leading-tight">
                        {n.title}
                      </h5>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowNotificationsModal(false)}
              className="w-full py-3.5 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 text-foreground dark:text-white font-bold text-xs rounded-2xl transition-colors cursor-pointer mt-1"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Toyxona Booking Flow Modal */}

    </div>
  );
}
